# Fuentes y cifras — motion y scroll (verificado 2-nov-2026)

## Versiones, licencias y pesos

Pesos medidos descargando los tarballs de npm y comprimiendo con gzip -9 (no bundlephobia).

| Paquete | Versión (fecha) | Licencia | min / gzip | URL |
|---|---|---|---|---|
| gsap core | 3.15.0 (2026-04-13) | Standard no-charge license (Webflow): comercial y todos los plugins gratis; prohibido solo construir un competidor del animador visual de Webflow | 72.9 / 28.3 kB | https://gsap.com/standard-license/ · https://gsap.com/pricing/ |
| ScrollTrigger | en gsap | ídem | 44.6 / 18.0 kB | `dist/ScrollTrigger.min.js` |
| @gsap/react (useGSAP) | 2.1.2 | ídem | — | https://gsap.com/resources/React/ |
| lenis | 1.3.27 (2026-10-15) | MIT | 18.8 / 5.4 kB (+ lenis.css 0.5 kB) | https://github.com/darkroomengineering/lenis/blob/main/README.md |
| motion | 14.9.0 (2026-10-30) | MIT | vanilla 179 / 59.4 kB; `scroll()` solo 9.1 / 3.8 kB; `mini` 8.6 / 3.3 kB; React 133 / 43 kB | https://motion.dev/docs/scroll · https://motion.dev/docs/react-use-scroll |
| @react-three/drei ScrollControls | 10.7.9 | MIT | — | https://drei.docs.pmnd.rs/controls/scroll-controls |
| nanostores | 1.5.5 | MIT | < 1 kB | https://docs.astro.build/en/recipes/sharing-state-islands/ |
| CSS scroll-driven animations | Chrome/Edge 115, Samsung 23, Safari/iOS 26, Firefox 159 (2026-10-27) → Baseline Newly available oct-2026; 88.25 % global | — | 0 kB | https://caniuse.com/mdn-css_properties_animation-timeline · https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline · https://developer.chrome.com/docs/css-ui/scroll-driven-animations |
| flackr/scroll-timeline (polyfill) | — | — | — | https://github.com/flackr/scroll-timeline (exige CSS same-origin o inline) |

## Documentación clave

- ScrollTrigger: `scrub` numérico = segundos para alcanzar la barra; `pin`, `invalidateOnRefresh`, `onUpdate(self.progress)`: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- `ScrollTrigger.config({ ignoreMobileResize })`: https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()/
- `gsap.matchMedia()`: https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/
- R3F: nunca `setState` en `useFrame`: https://r3f.docs.pmnd.rs/api/hooks · `invalidate` solo con `frameloop="demand"`: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- drei ScrollControls: "your page's normal scrolling does not drive it" (contenedor propio): https://drei.docs.pmnd.rs/controls/scroll-controls
- Astro scripts: se bundlean como módulo; un `<script>` con atributos pasa a `is:inline`; el DOM de la isla puede no existir cuando corre el script: https://docs.astro.build/en/guides/client-side-scripts/
- Astro directivas (`client:idle` `timeout`, `client:visible` `rootMargin`): https://docs.astro.build/en/reference/directives-reference/
- `prefers-reduced-motion` universal (Chrome 74, Safari 10.1); `prefers-reduced-data` solo Chrome tras flag: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- `DeviceOrientationEvent.requestPermission()` (iOS 14.5+, desde gesto): https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- OrbitControls pone `touchAction = 'none'` en `connect()` (fuente de three): https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/controls/OrbitControls.js
- `content-visibility: auto` + `contentvisibilityautostatechange` para pausar canvas: https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility

## Cifras medidas en fuentes

- savvy.co.il: LCP 5.3 → 2.4 s dejando el `h1` visible (`opacity: 0.1` en vez de 0), canvas diferido con `requestIdleCallback` (fallback 1 500 ms) y 12 `will-change` eliminados; TBT 120 → 60 ms: https://savvy.co.il/en/blog/wordpress-speed/hero-animation-lcp-optimization/
- dark-moon.org: reduced-motion = poster estático en móvil; DPR tope 1.5/1.3: https://dark-moon.org/blog/webgl-performance-low-end-devices/
- Chrome: las scroll-driven animations corren fuera del main thread: https://developer.chrome.com/docs/css-ui/scroll-driven-animations

## No verificado

- Tamaño exacto de `@gsap/react`.
- Comportamiento de Lenis con `syncTouch` en iOS ≥ 16 (el README solo marca inestabilidad en < 16).
