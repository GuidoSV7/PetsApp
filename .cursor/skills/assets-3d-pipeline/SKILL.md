---
name: assets-3d-pipeline
description: Pipeline de modelos 3D animados (animales low-poly) para el hero de la landing — de dónde sacar modelos riggeados con licencia válida, exportar desde Blender a glTF, optimizar con glTF-Transform (Meshopt, texturas WebP, resample), generar componentes TSX con gltfjsx, validar tamaño/triángulos y cumplir la atribución. Usar SIEMPRE que aparezca un .glb/.gltf/.fbx, Blender, Sketchfab, Quaternius, Omabuarts, CGTrader, Meshy/Tripo, gltf-transform, gltfjsx, Draco, Meshopt, KTX2, texturas, rig, huesos, clips de animación, "el modelo pesa mucho", "qué perro/gato uso", "cómo consigo un modelo", "cómo lo comprimo", "la animación no se exporta" o licencias de modelos. Lo que pasa después de cargar el .glb en React (useGLTF, mixer, dpr) vive en el skill r3f-threejs.
---

# Pipeline de assets 3D — modelos animados para la landing

Este skill cubre **todo lo que pasa antes de `useGLTF`**: conseguir, exportar, optimizar, tipar y acreditar los modelos. Prosa en español; **archivos, comandos y nombres de clips en inglés** (`Idle`, `Walk`, `Sit`).

## Stack (verificado 2-nov-2026)

| Herramienta | Versión | Para qué |
|---|---|---|
| `@gltf-transform/cli` | 4.5.1 | Inspeccionar, optimizar, comprimir |
| `gltfjsx` | 6.5.3 (nov-2024, sin releases posteriores) | Componente TSX tipado desde el GLB |
| Blender | 5.2 LTS (4.5 LTS soportada hasta jul-2027) | Ajustar rig/clips; exportador glTF-IO incluido |
| `meshoptimizer` | 1.3.0 (dep de gltf-transform) | Decoder de 29 kB, embebido en three-stdlib |
| gltf.report, glTF Validator, visor de Don McCurdy | web | Validar y medir |

❌ No instalar KTX-Software salvo que la VRAM sea el cuello de botella (ver Texturas).

## Regla central

**Meshopt, no Draco, para modelos con esqueleto y clips.** Draco comprime solo geometría; Meshopt comprime geometría, morph targets **y animación**, y su decoder pesa 29 kB contra 250 kB de Draco. Medido con el Fox de Khronos (162.9 kB, 576 tris, 3 clips, PNG 1024):

| Pipeline | Tamaño | gzip |
|---|---|---|
| `optimize --compress meshopt --texture-compress webp --texture-size 512` | **55.0 kB** | 32.2 kB |
| ídem con `--compress draco` | 69.2 kB | 47.9 kB (clips sin comprimir) |
| `gltfjsx --transform` (Draco + texturas 1024) | 87.9 kB | — |
| `meshopt` solo, sin resize | 78.3 kB | — |

## Presupuesto por animal (hero móvil, 2–4 mascotas)

| Métrica | Objetivo | Cómo medir |
|---|---|---|
| Triángulos | 1 000 – 3 000 | `gltf-transform inspect`, gltf.report |
| Materiales / texturas | 1 material, 1 textura WebP 512 px | `inspect` (gpuSize) |
| Clips | 3 – 5 resampleados (`Idle`, `Walk`, `Sit`, opcional `Clicked`) | `inspect` (keyframes por clip) |
| Peso del GLB | 40 – 120 kB | `ls -l`, `gzip -9` |
| Total 3D de la landing | < 500 kB + 29 kB de decoder | suma |
| Draw calls | 1 por animal | `renderer.info.render.calls` en runtime |

Referencia externa: Khronos 3D Commerce v1.0 permite ≤ 3 MB y ≤ 150k tris para catálogo móvil; esta landing va muy por debajo porque el 3D es decorativo y el dispositivo objetivo es un Android de gama media con datos móviles.

## De dónde sacar modelos (detalle y URLs en `references/fuentes-modelos.md`)

| Opción | Qué da | Licencia | Cuándo |
|---|---|---|---|
| Sketchfab, filtro `animated + downloadable`, licencia CC BY | Perros/gatos estilizados de 850–1 000 tris con 4–13 clips (p. ej. micaelsampaio, DreamNoms) | CC BY: crédito obligatorio | Gratis y rápido; **leer la licencia de cada modelo**, hay NC/ND mezclados |
| Omabuarts Pet Animals (itch) | Cat, Dog, Rabbit, Parrot con 18 clips y 4 LOD | No publicada en itch: **pedirla por escrito** | 16 USD; el set exacto que pide el proyecto |
| Quaternius Ultimate Animated Animal Pack | 12 animales (Husky, Shiba, Fox…) con 12+ clips; sin gato/conejo/loro | QAL v1.0 desde ago-2026 (comercial, sin crédito, no redistribuir) | Gratis; si hace falta un perro extra |
| Khronos Fox | Cuadrúpedo con 3 clips | CC0 + CC BY rig | Para probar el pipeline antes de comprar nada |
| CGTrader Royalty Free | Modelos buenos a 14–16 USD | Exige impedir que el usuario final extraiga el archivo (§21A.3): un GLB público lo viola | ❌ Evitar para web |
| Meshy / Tripo (IA) | Malla + rig automático; Meshy da solo un ciclo de caminata a cuadrúpedos; Tripo ~16 presets | Meshy gratis = CC BY; planes pagos = privada | Solo si ningún pack sirve; esperar 30–100k tris a simplificar |

❌ Mixamo no sirve: solo humanoides bípedos (FAQ oficial).

## Animaciones que no vienen en el pack

1. Rigify en Blender trae meta-rigs `Basic Quadruped`, `Cat`, `Wolf`, `Horse` para animar a mano.
2. Procedural en R3F sin assets extra (requiere `--keepnames` en gltfjsx para encontrar huesos):
   - cola: `tail.rotation.z = Math.sin(t * 8) * 0.3`
   - respiración/bob: `group.position.y = Math.sin(t * 2) * 0.02`
   - orejas: seno desfasado por oreja
   - cabeza: `dampLookAt` (skill `r3f-threejs`)
3. Si un clip anima el mismo hueso que el lookAt procedural, quitar esa pista del clip con un script de glTF-Transform (ver `references/fuentes-modelos.md`, sección "Quitar pistas").

## Blender → glTF — checklist de exportación

Exportar siempre `.glb` y dejar la compresión al CLI.

- Include → **Selected Objects** (solo malla + armature). Transform → **+Y Up** ON.
- Antes de exportar: `Ctrl+A` → Scale (escala 1); 1 unidad = 1 m.
- Data → Mesh: Apply Modifiers ON; UVs y Normals ON; Vertex Color = Material.
- Data → Material → Images: PNG (glTF-Transform convierte a WebP después).
- Data → Armature: **Export Deformation Bones only** ON (descarta huesos de control de Rigify); Use Rest Position Armature ON.
- Data → Skinning: Bone Influences = **4**; "Include All Bone Influences" OFF.
- Shape Keys: OFF si no se usan.
- Animation → Mode **Actions**: cada acción activa o *stashed en NLA* sale como un clip con su nombre. Apply sampling ON (desactivarlo exporta mal); Sampling Rate 1; **Optimize Animation Size** ON; Force keeping channel OFF; **Reset pose bones between actions** ON.
- ❌ Compresión Draco en Blender: OFF.

Trampas: acciones no stashed no se exportan en modo Actions; la misma acción activa y stashed = clip duplicado; "Reset pose bones" OFF produce clips que arrastran la pose anterior.

## Optimizar con glTF-Transform

Usar el script empaquetado: `scripts/optimize-glb.sh input.glb output.glb` (inspecciona, valida, optimiza y vuelve a inspeccionar). Equivale a:

```bash
npm i -D @gltf-transform/cli@4.5.1
gltf-transform inspect  dog.glb                  # tris, texturas (gpuSize), clips y keyframes
gltf-transform validate dog.glb
gltf-transform optimize dog.glb dog.opt.glb \
  --compress meshopt --meshopt-level high \      # geometría + morph + animación
  --texture-compress webp --texture-size 512 \   # 1024 solo si el animal es protagonista realista
  --simplify-error 0.0001 \                      # --no-simplify si rompe orejas/siluetas finas
  --no-join                                      # join no aporta con skin
gltf-transform inspect  dog.opt.glb
```

`optimize` ya encadena dedup → prune → resample → weld → simplify → sparse → palette → flatten → quantize → meshopt. `resample` bajó los keyframes del Fox de 1 743 a 713 sin cambio visible. `instance` y `join` **no aplican** a mallas con skin; `flatten` respeta el esqueleto.

Pasos sueltos cuando hace falta control: `dedup`, `prune`, `resample --tolerance 1e-4`, `weld`, `simplify --ratio 0.5 --error 0.001`, `resize --width 512 --height 512`, `webp --quality 80`, `meshopt --level high` (siempre el último).

## Texturas

- WebP 512 px por defecto (97 % de soporte; Safari ≥ 16). AVIF si pesa menos.
- KTX2/Basis (`etc1s`, `uastc`) solo si la VRAM o el tiempo de subida a GPU se vuelven el problema: exige el binario `ktx` ≥ 4.4 instalado y suma 527 kB de transcoder. Con 2–4 texturas de 512 px no compensa.
- Nunca PNG 2048 en producción: 16 MB de VRAM por textura.

## gltfjsx — componente tipado

```bash
npx gltfjsx@6.5.3 public/models/dog.opt.glb --types --keepnames --shadows --output src/islands/hero/Dog.tsx
```

- `--types`: `type ActionName = 'Idle' | 'Walk' | …`, `nodes` y `materials` tipados → usar ese tipo en `Animal.tsx`.
- `--keepnames`: conserva nombres de huesos (necesario para cola/orejas procedurales).
- Para skinned genera `SkeletonUtils.clone` + `useAnimations`: correcto, mantenerlo.
- ❌ `--transform`: aplica Draco y texturas 1024 por defecto. Optimizar antes con glTF-Transform y pasar el `.opt.glb` sin `-T`.
- ❌ `--instance` / `--instanceall` con skinned.

Dónde van los `.glb`: `public/models/` con nombre versionado (`dog.v2.glb`) si se usa `Cache-Control: immutable`, o `src/assets/models/dog.glb?url` para que Vite lo hashee (skill `astro-landing`).

## Validar antes de integrar

1. `gltf-transform validate` sin errores.
2. gltf.report: tris, draw calls, tamaño de texturas, clips.
3. Visor de Don McCurdy: reproducir cada clip, revisar que nada "explote" (huesos mal pesados, escala).
4. En runtime: `renderer.info.render.triangles` y `.calls` dentro del presupuesto.

## Licencias y atribución

- CC BY: página `/creditos` o footer con TASL: `"Stylized Dog Low Poly" by micaelsampaio (Sketchfab), CC BY 4.0, modificado (optimizado y retexturizado)`. Sketchfab acepta texto + enlaces junto a la obra.
- CC BY-NC: ❌ prohíbe una landing comercial. CC BY-ND: ❌ prohíbe simplificar o retexturizar. CC BY-SA: obliga a licenciar derivados igual.
- QAL (Quaternius), Fab Standard, Royalty Free: sin crédito, pero **no redistribuir** el asset; con Royalty Free de CGTrader además hay que impedir la extracción.
- Guardar en el repo `assets/LICENSES.md` con modelo, autor, URL, licencia y fecha de descarga: la licencia vigente al descargar es la que gobierna (Quaternius cambió de CC0 a QAL en ago-2026).

## Checklist antes de dar por listo un modelo

- [ ] Licencia escrita y compatible; crédito preparado si es CC BY.
- [ ] Clips con nombres estables (`Idle`, `Walk`, `Sit`) y sin duplicados.
- [ ] `.opt.glb` ≤ 120 kB, ≤ 3k tris, 1 textura WebP 512, Meshopt.
- [ ] Se reproduce bien en el visor de Don McCurdy y en gltf.report sin errores.
- [ ] Componente TSX generado con `--types --keepnames`, sin `--transform`.
- [ ] `LICENSES.md` actualizado.
