---
name: r3f-threejs
description: React Three Fiber + Three.js para el hero 3D de la landing (animales animados que caminan, miran al cursor y reaccionan al scroll) dentro de una isla React en Astro. Usar SIEMPRE que se escriba, revise o depure código con three, @react-three/fiber, @react-three/drei, Canvas, useFrame, useGLTF, useAnimations, mixer, bones, dpr, frameloop, WebGL/WebGPU, sombras, Environment, o cuando se hable de "la escena", "el canvas", "el perro/gato 3D", "el modelo no carga", "va lento en el celular", "se traba el scroll sobre el 3D". Define versiones, props del Canvas, carga de modelos, mezcla de clips y reglas de performance. Los modelos (.glb, compresión) se preparan con el skill assets-3d-pipeline; el scroll con motion-scroll; la isla y el build con astro-landing.
---

# React Three Fiber — hero 3D de la landing

Este skill cubre **solo la escena**: el `Canvas`, los modelos ya optimizados, animación y performance en runtime. Prosa en español; **código, archivos y nombres siempre en inglés**.

Preparar los `.glb` → skill `assets-3d-pipeline`. Scroll y reveals → skill `motion-scroll`. Dónde va la isla y cómo se difiere → skill `astro-landing`.

## Stack (verificado 2-nov-2026, fijar versiones exactas)

| Paquete | Versión | Nota |
|---|---|---|
| `three` | 0.187.0 | Solo ESM. Fijar sin `^`: `postprocessing` y `model-viewer` tienen rangos estrechos de peer |
| `@react-three/fiber` | 9.8.2 | Requiere `react >=19 <19.4`. La v10 está en alpha: no usar |
| `@react-three/drei` | 10.7.9 | Requiere `fiber ^9`. La v11 está en alpha: no usar |
| `@pmndrs/detect-gpu` | 6.0.29 | ESM only. El paquete viejo `detect-gpu` quedó en 5.x |
| `maath` | (dep de drei) | `dampLookAt`, `damp3` para suavizados sin allocs |

❌ NO instalar `@react-three/postprocessing` en esta landing (ver Performance).
❌ NO usar `three/webgpu`.

## Regla central

**El 3D nunca está en el critical path y nunca pelea con el scroll.** El chunk de three + fiber + drei pesa ~360 kB gzip (medido con esbuild, three 0.187 + fiber 9.8.2 + drei 10.7.9 + React 19): más que toda la página junta. Por eso:

- El `Canvas` se importa con `React.lazy` y se monta después del LCP (idle / detección de GPU), nunca en el primer render.
- El poster (`<img>`) ya está en el DOM antes de que exista el canvas y es el LCP de la página.
- El wrapper del canvas lleva `touch-action: pan-y` y el `Canvas` usa `eventSource` apuntando al wrapper (R3F pone `pointer-events: none` al div del canvas en ese caso): el dedo sigue haciendo scroll.
- ❌ NUNCA `OrbitControls` en el hero: aplica `touch-action: none` y mata el scroll en móvil.

## Decisión por nivel de dispositivo

Decidir ANTES de montar el canvas, en la isla, con tres señales baratas:

```ts
const hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const { tier } = await getGPUTier({ benchmarksURL: '/detect-gpu' }); // benchmarks self-hosted
```

| Resultado | Qué se muestra | Props del Canvas |
|---|---|---|
| Sin WebGL2, `reduced`, o tier 0 | Poster estático o `<video autoplay muted loop playsinline>` | — (no hay canvas) |
| Tier 1 | Canvas, un solo animal | `dpr={1}`, `antialias: false` |
| Tier 2–3 | Canvas completo | `dpr={[1, 1.5]}`, `antialias: true` |

Por qué tope 1.5 y no el default `[1, 2]` de R3F: un Android de gama media tiene DPR 2.6–3; renderizar a 2× es 4× píxeles sobre una GPU que no da para eso. dark-moon.org midió TBT 1 382 → 38 ms y Performance 65 → 98 con tope 1.5 desktop / 1.3 móvil.

`detect-gpu` baja sus benchmarks de unpkg por defecto: copiarlos a `public/detect-gpu/` y pasar `benchmarksURL`. Un request a terceros en el critical path con datos móviles es un fallo.

## Canvas — props obligatorias

```tsx
<Canvas
  dpr={dpr}                                   // estado controlado por PerformanceMonitor
  frameloop={visible ? 'always' : 'never'}    // ver "Loop de render"
  gl={{ antialias: tier >= 2, powerPreference: 'high-performance', alpha: true, stencil: false }}
  camera={{ fov: 35, position: [0, 1.2, 4] }}
  eventSource={wrapRef.current ?? undefined}
  eventPrefix="client"                        // OBLIGATORIO con eventSource o el raycast se desplaza
  fallback={<img src="/hero-poster.webp" alt="Mascotas" />}  // se renderiza dentro del <canvas> si no hay WebGL
>
```

- `antialias: true`, `powerPreference: 'high-performance'` y `alpha: true` ya son defaults de R3F; se escriben explícitos para que el tier pueda apagar `antialias`.
- `<PerformanceMonitor flipflops={3} onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, devicePixelRatio))} onFallback={() => setDpr(1)} />`. Mide fps en ventanas de 250 ms × 10 iteraciones. Sin `flipflops` oscila. Sus límites por defecto en el **código** son `[40, 60]` (la doc dice `[50, 60]`): pasar `bounds` explícito si se depende de ellos.
- `AdaptiveDpr` NO sirve aquí: solo actúa mientras `performance.regress()` está activo (drag de controles).

## Loop de render

| Situación | `frameloop` | Por qué |
|---|---|---|
| Animal con idle/walk continuo (caso normal) | `'always'` mientras el canvas está en viewport; `'never'` fuera | `useAnimations` necesita frames continuos |
| Escena estática que solo mueve el scroll o el cursor | `'demand'` + `invalidate()` en cada cambio | Cero trabajo cuando nada cambia |

- La prop `frameloop` es reactiva: cambiarla por estado desde un `IntersectionObserver` (`threshold: 0.05`) basta.
- `requestAnimationFrame` ya se pausa en pestañas ocultas; aun así escuchar `visibilitychange` para no acumular `delta` del mixer al volver.
- ❌ `frameloop="demand"` + `useAnimations` = pantalla congelada (nadie llama `invalidate`).

## Carga de modelos

```tsx
const { scene, animations } = useGLTF('/models/dog.glb');   // Meshopt: decoder embebido en three-stdlib, sin archivos extra
useGLTF.preload('/models/dog.glb');                          // a nivel de módulo
// dentro del Canvas, dentro del Suspense:
<Preload all />                                              // compila shaders y sube texturas antes del primer frame
```

- Preferir **Meshopt** (ver `assets-3d-pipeline`). Si el GLB usa Draco: copiar `node_modules/three/examples/jsm/libs/draco/gltf/` a `public/draco/` y `useGLTF.setDecoderPath('/draco/')`. El default baja el decoder (wasm 192 kB + wrapper 58 kB) de `gstatic.com`.
- `useGLTF` cachea `scene` por URL. Dos animales del mismo modelo **comparten esqueleto**: clonar con `SkeletonUtils.clone(scene)` o `<Clone>` de drei. `SkinnedMesh` no se instancia trivialmente; con 2–4 animales, clones.
- Loader fuera del canvas: `useProgress((s) => s.progress)` con selector (evita re-render por cada item).
- ❌ No llamar `dispose()` sobre geometrías/materiales de `useGLTF` (están cacheados); usar `useGLTF.clear(url)` si de verdad hace falta.

## Animación

`useAnimations(animations, scene)` ya llama `mixer.update(delta)` en su propio `useFrame` y hace `stopAllAction()` + `uncacheAction` en el cleanup. No duplicar el update.

```tsx
// mezcla idle <-> walk
useEffect(() => {
  const from = actions[walking ? 'Idle' : 'Walk']!, to = actions[walking ? 'Walk' : 'Idle']!;
  to.reset().setEffectiveWeight(1).play();
  from.crossFadeTo(to, 0.35, true);   // warp=true sincroniza duraciones de los clips
}, [walking]);

// reacción puntual (ej. "sentarse" al hacer hover) y vuelta a idle
action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.reset().play();
mixer.addEventListener('finished', () => actions.Idle!.reset().fadeIn(0.3).play());

// mirar al cursor: después del mixer, sin allocs por frame
const _target = new THREE.Vector3();          // módulo, no por frame
useFrame(({ pointer, camera }, delta) => {
  if (!headBone || reduced) return;
  _target.set(pointer.x * 2, 1 + pointer.y, 3).add(camera.position).multiplyScalar(0.5);
  dampLookAt(headBone, _target, 0.25, delta);
});
```

- `clampWhenFinished = false` (default) deja `enabled = false` al terminar un `LoopOnce`: parece que "el modelo desapareció la pose".
- Si el clip anima el mismo hueso de cabeza que `dampLookAt`, compiten. Quitar la pista `Head.quaternion` del clip en el pipeline glTF (skill `assets-3d-pipeline`).
- Con `prefers-reduced-motion`: `mixer.timeScale = 0` (pose estática) y sin lookAt.
- Nombres de clips (`Idle`, `Walk`, `Sit`) se fijan en Blender/gltf-transform; tipar `actions` con el tipo generado por gltfjsx.

## Sombras, luces y entorno

| Necesidad | Usar | No usar |
|---|---|---|
| Sombra de contacto bajo el animal quieto | `<ContactShadows frames={1} resolution={256} />` (se calcula una vez) | Shadow maps dinámicos (`shadows` en Canvas) |
| Animal que camina sobre el plano | `<ContactShadows frames={Infinity} resolution={256} blur={2} />` | `AccumulativeShadows` (es para escenas estáticas) |
| Iluminación realista barata | `<Environment files="/env/studio_1k.hdr" />` self-hosted (o gainmap `.webp`) | `preset="..."`: baja HDRs de un CDN, la doc dice que no es para producción |
| Luces | 1 `ambientLight` + 1 `directionalLight` sin `castShadow` | 3+ luces, `pointLight` con sombras |

- `shadows` (true) en el Canvas activa `PCFSoftShadowMap`, deprecado en r182 para WebGL. Si hace falta shadow map, `shadows="percentage"`.
- r187 cambió PMREM a cube render targets: los materiales pueden verse algo distintos al actualizar desde versiones viejas; revisar visualmente.

## Performance — reglas duras

- ❌ `setState` dentro de `useFrame` / `onPointerMove`. Mutar refs y objetos de three.
- ❌ `new Vector3()` (o cualquier alloc) por frame. Vectores a nivel de módulo o `useMemo`.
- ❌ Postprocessing: `EffectComposer` usa `multisampling=4` por defecto (render target MSAA extra a resolución completa). Bloom/viñeta → CSS sobre el canvas o emisivos + ACES (default de R3F).
- ❌ WebGPU: el manual de three lo marca experimental y recomienda `WebGLRenderer` para WebGL 2; en Android solo está activo por defecto en 12+ con GPUs ARM/Qualcomm/Intel, Firefox Android lo deshabilita; `three/webgpu` suma ~60 kB gzip y `ShaderMaterial`/`onBeforeCompile` no corren ahí. Si algún día: `gl={async (props) => { const r = new WebGPURenderer(props); await r.init(); return r }}`.
- Draw calls muy por debajo de 1 000, idealmente < 100 en este hero (recomendación oficial de R3F).
- Los long tasks de INP vienen de compilar shaders (50–300 ms) y decodificar texturas grandes (50–200 ms): por eso `<Preload all />` y montar el canvas cuando el usuario no está interactuando.
- Texturas: WebP de 512 px por animal (skill `assets-3d-pipeline`); KTX2 solo si la VRAM o la subida a GPU se vuelven el cuello de botella, porque suma 527 kB de transcoder. PNG de 2048 = 16 MB en GPU por textura.

## Errores y "context lost"

- three ya hace `preventDefault()` en `webglcontextlost`; R3F manda los errores de creación del renderer al ErrorBoundary del `Canvas`. Envolver la isla en un ErrorBoundary propio que muestre el poster: la landing no puede quedarse en blanco.
- Al desmontar, R3F dispone el renderer que creó y hace `dispose(scene)`; no hacer limpieza manual encima.

## Estructura de archivos

```
src/islands/HeroScene.tsx   # shell sin three: React.lazy de hero/HeroIsland tras requestIdleCallback (skill astro-landing)
src/islands/hero/
  HeroIsland.tsx        # detección (WebGL2, reduced-motion, GPU tier) + React.lazy del canvas + ErrorBoundary
  HeroCanvas.tsx        # Canvas, PerformanceMonitor, luces, Environment, Suspense, Preload
  HeroLoader.tsx        # useProgress, fuera del Canvas
  Animal.tsx            # useGLTF + useAnimations + crossfade + lookAt
  Dog.tsx / Cat.tsx     # generados con gltfjsx (tipos), envueltos por Animal
public/models/*.glb     # salida de assets-3d-pipeline
public/env/*.hdr        # 1k, self-hosted
public/detect-gpu/      # benchmarks de detect-gpu
```

Componentes completos y tipados en `references/componentes.md`. Cuando algo falle, revisar primero `references/trampas.md`.

## Checklist antes de dar por terminado el hero

- [ ] El poster es el LCP y el canvas aparece con fade después (ver skill `landing-performance-deploy`).
- [ ] En un Android real de gama media: scroll fluido sobre el canvas, sin saltos.
- [ ] `dpr` baja solo cuando `PerformanceMonitor` lo pide; no oscila.
- [ ] `frameloop` pasa a `never` al salir del viewport (verificar con DevTools > Performance).
- [ ] Sin requests a `gstatic.com`, `unpkg.com` ni CDNs de HDR en la pestaña Network.
- [ ] `prefers-reduced-motion: reduce` muestra pose estática o poster.
- [ ] Chunk de three separado y diferido: ningún archivo del grafo estático de `index.html` contiene `WebGLRenderer` (ver skill `astro-landing`).
