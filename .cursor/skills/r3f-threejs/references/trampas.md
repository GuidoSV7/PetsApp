# Trampas de R3F / three — diagnóstico rápido

Leer cuando "algo no funciona" en la escena. Síntoma → causa → arreglo.

| Síntoma | Causa | Arreglo |
|---|---|---|
| Pantalla congelada, el animal no se mueve | `frameloop="demand"` con `useAnimations`: nadie llama `invalidate` | `frameloop="always"` mientras el canvas es visible, `"never"` fuera |
| El scroll se traba al tocar el 3D en móvil | `OrbitControls` (pone `touch-action: none`) o canvas sin `eventSource` | Quitar OrbitControls; `eventSource={wrapper}` + `eventPrefix="client"` + `touch-action: pan-y` en el wrapper |
| El hover/raycast apunta a otro sitio | `eventSource` sin `eventPrefix="client"` | Añadir `eventPrefix="client"` |
| Dos animales iguales se mueven en sincronía o deformados | `scene` de `useGLTF` cacheada por URL: comparten esqueleto | `SkeletonUtils.clone(scene)` o `<Clone>` de drei |
| El modelo "pierde la pose" al terminar una animación | `clampWhenFinished = false` deja `enabled = false` tras `LoopOnce` | `clampWhenFinished = true` o volver a idle en el evento `finished` |
| La cabeza tiembla al mirar al cursor | La pista del clip anima el mismo bone que `dampLookAt` | Quitar la pista `Head.quaternion` del clip en gltf-transform o aplicar lookAt a un bone padre vacío |
| fps oscila entre bueno y malo cada pocos segundos | `PerformanceMonitor` sin `flipflops` ni `onFallback` | `flipflops={3}` + `onFallback` que fije `dpr=1` |
| Request a `gstatic.com` / `unpkg.com` / CDN de HDR | Draco por defecto, benchmarks de detect-gpu, `Environment preset` | Self-host: `public/draco/`, `public/detect-gpu/`, `public/env/*.hdr` |
| `npm install` falla por peer de three | `@google/model-viewer` exige `three ^0.183`; `postprocessing` `<0.188` | No instalar model-viewer junto a R3F; fijar three exacto |
| Build de Astro falla con `window is not defined` | La isla no usa `client:only="react"` | `client:only="react"` en el `.astro` |
| Texturas se ven lavadas tras actualizar R3F | R3F 9 quitó la conversión automática a sRGB por prop | `texture.colorSpace = THREE.SRGBColorSpace` explícito |
| Aviso `PCFSoftShadowMap deprecated` | `shadows` (true) en Canvas (r182) | `shadows="percentage"` o sombras precalculadas (`ContactShadows`) |
| Materiales con reflejos distintos tras actualizar three | r187 cambió PMREM a cube render targets | Revisar `envMapIntensity`; no es bug |
| `RGBELoader is not exported` | r180 lo renombró a `HDRLoader` | Usar drei 10.7+ (`Environment files=`) o `HDRLoader` |
| Canvas en blanco tras un rato en móvil | Context lost (memoria GPU) | ErrorBoundary propio con poster; reducir texturas; `dpr=1` en tier 1 |
| Long task de 200–400 ms al aparecer el canvas | Compilación de shaders + subida de texturas en el primer frame | `<Preload all />`, texturas KTX2 ≤ 1024, montar el canvas en idle |
| TBT alto en Lighthouse móvil | Chunk de three en el critical path | Shell + `React.lazy`, sin `codeSplitting.groups` para three/R3F (skill astro-landing) |
| Un modelo pesa igual tras "optimizar" | Draco no comprime animaciones ni ayuda con skins | Meshopt (`gltf-transform meshopt`) + `resample` (skill assets-3d-pipeline) |
