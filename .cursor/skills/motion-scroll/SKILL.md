---
name: motion-scroll
description: Motion, scroll y reacción al puntero en la landing (Astro + hero R3F) — GSAP ScrollTrigger en scripts de Astro, puente por nanostores hacia la escena 3D, reveals con CSS scroll-driven animations, Lenis solo en desktop, prefers-reduced-motion y gestos táctiles. Usar SIEMPRE que se hable de scroll, parallax, reveal, "que aparezca al bajar", "el animal camina con el scroll", pin, scrub, timeline, GSAP, ScrollTrigger, Lenis, Motion/Framer Motion, animation-timeline, smooth scroll, sigue al cursor, hover, reduced motion, o cuando el scroll "se traba" o "salta" en móvil. La escena en sí (Canvas, useFrame, mixer) está en r3f-threejs; qué va en isla y qué en script en astro-landing.
---

# Motion y scroll — landing con hero 3D

Este skill decide **con qué** se anima cada cosa y **cómo** el scroll llega a la escena 3D sin pasar por el estado de React. Prosa en español; **código en inglés**.

## Stack (verificado 2-nov-2026; pesos medidos desde los tarballs de npm, min / gzip)

| Herramienta | Versión | Licencia | Peso | Rol en esta landing |
|---|---|---|---|---|
| `gsap` + `ScrollTrigger` | 3.15.0 | Gratis, comercial, todos los plugins (licencia estándar de Webflow, vigente desde abr-2025) | 72.9 / 28.3 kB + 44.6 / 18.0 kB | Scroll → escena (`scrub`, `pin`), timelines del hero |
| `nanostores` | 1.5.5 | MIT | < 1 kB | Puente script de Astro ↔ isla R3F |
| CSS `animation-timeline: view()` | Baseline oct-2026 (Firefox 159, 27-oct-2026); 88 % global | — | 0 kB | Reveals de secciones, fuera del main thread |
| `lenis` | 1.3.27 | MIT | 18.8 / 5.4 kB | Smooth scroll **solo desktop**; opcional |
| `motion` | 14.9.0 | MIT | `scroll()` vanilla 3.8 kB gzip; React completo 43 kB | ❌ No usar: no mezclar dos motores de scroll |
| drei `ScrollControls` | 10.7.9 | MIT | — | ❌ No usar: crea su propio contenedor de scroll; el scroll normal de la página no lo mueve |

## Regla central

**Un solo motor de scroll (GSAP), el 3D lee el progreso por un store y lo aplica mutando refs.** R3F prohíbe `setState` dentro de `useFrame`; un `onUpdate` de ScrollTrigger que haga `setState` provoca un re-render por frame. El store de nanostores vive fuera de React, el script de Astro escribe y `useFrame` lee.

## Qué se anima con qué

| Elemento | Herramienta | Por qué |
|---|---|---|
| Reveal de secciones (fade + translate al entrar) | CSS `animation-timeline: view()` dentro de `@supports` | 0 kB, compositor, se degrada a "visible" sin soporte |
| Contadores, acordeones, menú | HTML/CSS; `<script>` de Astro si hace falta | Sin React |
| Hero: el animal camina / cambia de pose con el scroll | GSAP ScrollTrigger (`pin`, `scrub: 0.5`) → store → `useFrame` | Único lugar donde hace falta un motor de scroll en JS |
| Parallax de capas del hero | GSAP en el mismo timeline, o CSS scroll-driven | Evitar dos sistemas sobre el mismo elemento |
| Mirar al cursor / hover | `pointermove` throttled → ref → `useFrame` con lerp (skill `r3f-threejs`) | Nada por frame fuera de `useFrame` |
| Smooth scroll | Lenis solo con `(pointer: fine)` | En Android gama media suma JS sin beneficio |

## Patrón: scroll → escena 3D

```ts
// src/stores/scroll.ts
import { atom } from 'nanostores';
export const walk = atom(0); // 0..1 progreso del hero
```

```astro
<!-- src/components/Hero.astro -->
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { walk } from '../stores/scroll';
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // sin refresh por la barra de direcciones móvil

  const mm = gsap.matchMedia();
  mm.add({ reduce: '(prefers-reduced-motion: reduce)', ok: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
    if (ctx.conditions?.reduce) { walk.set(1); return; }           // pose final estática
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=200%', pin: true, scrub: 0.5, invalidateOnRefresh: true },
      onUpdate: () => walk.set(proxy.p),                             // onUpdate en el TWEEN, no en el trigger
    });
  });
</script>
```

```tsx
// dentro de la isla R3F (frameloop="always" mientras es visible; ver r3f-threejs)
import { walk } from '../../stores/scroll';
useFrame(() => {
  const p = walk.get();
  actions.Walk!.time = p * actions.Walk!.getClip().duration;        // scrub manual del clip
  group.current!.position.x = THREE.MathUtils.lerp(-2, 2, p);
});
```

- Si la escena **no** tiene animación idle y solo la mueve el scroll: `frameloop="demand"` y `useEffect(() => walk.listen(() => invalidate()), [])`.
- `onUpdate` va en el tween: con `scrub` numérico el trigger sigue disparando `onUpdate` después de parar el scroll.
- El `<script>` nunca toca el DOM de la isla (puede no existir aún); solo el store.
- `pin` reserva el alto con un spacer; medir CLS después de añadirlo.

## Patrón: reveals sin JavaScript

```css
.reveal { opacity: 1; }                                   /* fallback: visible sin soporte */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 25% cover 50%; }
  }
}
@keyframes reveal { from { opacity: 0; translate: 0 24px; } to { opacity: 1; translate: 0 0; } }
```

- Navegadores sin soporte muestran el contenido sin animar; no cargar el polyfill de flackr (exige CSS same-origin o inline y suma JS).
- ❌ `opacity: 0` inicial en el `h1` del hero: Chrome lo ignora como candidato a LCP (caso medido: LCP 5.3 → 2.4 s al dejarlo en `opacity: 0.1`). El hero no lleva reveal.

## Reduced motion

`gsap.matchMedia()` con `(prefers-reduced-motion: reduce)`:
- Desactivar: autoplay del animal (`mixer.timeScale = 0`), parallax, `scrub` con inercia, Lenis (ya lo hace solo: fuerza `lerp` a 1).
- Mantener: cambios de opacidad instantáneos, hover de botones, el poster.
- `prefers-reduced-data` solo existe en Chrome tras flag: usar `navigator.connection?.saveData` como señal extra para arrancar en `dpr` 1 o sin canvas.

## Puntero y táctil

- `pointermove` guarda el objetivo en un ref; `useFrame` hace `cur += (target - cur) * 0.08` (o `dampLookAt`). Nunca `setState` en el handler.
- En touch no seguir el dedo: el gesto es scroll. El wrapper del canvas lleva `touch-action: pan-y`.
- ❌ Giroscopio: iOS exige `DeviceOrientationEvent.requestPermission()` desde un gesto del usuario; no vale el costo para un hero.
- ❌ `OrbitControls` en el hero: pone `touch-action: none` y mata el scroll.

## Lenis (solo si se quiere smooth scroll en desktop)

```ts
if (matchMedia('(pointer: fine)').matches) {
  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
```

Trampas documentadas: `syncTouch` inestable en iOS < 16; no soporta CSS scroll-snap; los iframes pierden la rueda; `allowNestedScroll` cuesta rendimiento (usar `data-lenis-prevent`).

## Trampas

- `ignoreMobileResize` evita saltos por la barra de direcciones pero las posiciones de los triggers pueden desfasarse; ScrollTrigger refresca cada 200 ms (`syncInterval`).
- Un `<script>` de Astro con atributos distintos de `src` pasa a `is:inline`: sin imports ni TypeScript.
- Mezclar Motion y GSAP sobre el mismo scroll produce dobles updates y jank.
- Animar `top`/`left`/`height` provoca layout y CLS; solo `transform` y `opacity`.
- `will-change` estático en muchos elementos empeora el LCP (caso medido: 12 `will-change` eliminados bajaron TBT 120 → 60 ms).

Fuentes y cifras en `references/fuentes.md`.
