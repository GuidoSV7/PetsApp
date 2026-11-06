# Fuentes de modelos, licencias y utilidades (verificado 2-nov-2026)

Leer cuando haya que elegir o comprar un modelo, justificar una licencia, o quitar pistas de animación.

## Catálogo

| Fuente | Pack / modelo concreto | Formato | Clips | Licencia | Precio | URL |
|---|---|---|---|---|---|---|
| Sketchfab (API `animated=true&downloadable=true`) | Stylized Low Poly German Shepherd (DreamNoms): 852 tris, 13 clips (run, lie down, scratch, jump…), 0 texturas / 5 materiales | GLB/glTF/USDZ | 13 | CC BY | Gratis | https://api.sketchfab.com/v3/models/18d8fbe184c5448283762893b6ea9752 |
| Sketchfab | Stylized Dog Low Poly (micaelsampaio): 978 tris, 4 clips | GLB | 4 | CC BY | Gratis | https://api.sketchfab.com/v3/models/7dcc84a595d641fdba37c9d10b551577 |
| Sketchfab | Stylized Cat Low Poly (micaelsampaio): 888 tris, 1 clip | GLB | 1 | CC BY | Gratis | https://api.sketchfab.com/v3/models/9abfce885a834399b2c3ccaed51cd474 |
| Sketchfab | Toon Cat FREE (Omabuarts): 2.6k tris, 1 clip | GLB | 1 | CC BY | Gratis | https://sketchfab.com/3d-models/toon-cat-free-b2bd1ee7858444bda366110a2d960386 |
| Sketchfab | Rabbit Rigged (FourthGreen) 2.6k tris; parrot rebuilt (kenchoo) 2.2k tris | GLB | — | CC BY | Gratis | búsqueda API |
| Omabuarts (itch) | Pet Animals – Quirky Series: Cat, Dog, Rabbit, Parrot; 18 clips (Idle_A/B/C, Walk, Run, Sit, Eat, Jump, Fear, Hit, Death, Fly, Swim, Roll, Spin, Clicked, Bounce, Attack); 4 LOD 300–9 000 tris; textura 16×4 px | FBX/OBJ/glTF (site-wide) | 18 | No publicada en itch | 16 USD | https://omabuarts.itch.io/ |
| Omabuarts (itch) | Quirky Series – FREE Animals: Colobus, Gecko, Herring, Muskrat, Pudu, Sparrow, Squid, Taipan; mismos 18 clips | ídem | 18 | No publicada | Gratis | https://omabuarts.itch.io/quirky-series-free-animals |
| Quaternius | Ultimate Animated Animal Pack (jul-2021): 12 animales, > 12 clips c/u (Attack, Death, Gallop, Walk, Jump…). Lista de especies vía GDevelop: Husky, ShibaInu, Fox, Wolf, Deer, Horse, Cow, Alpaca… | FBX, OBJ, Blend, glTF | 12+ | QAL v1.0 (28-ago-2026); descargas anteriores CC0 | Gratis | https://quaternius.com/packs/ultimateanimatedanimals.html · https://quaternius.com/license.html |
| Quaternius (itch) | LowPoly Animated Animals (cow, horse, llama, pig, pug); comentarios reportan solo Idle + Death | FBX, OBJ, Blend | parcial | CC0 | Name your price | https://quaternius.itch.io/lowpoly-animated-animals |
| CGTrader | low-poly animated dog (made-cg): 1 353 polys, 10 clips, tex 1024 | FBX/OBJ/Blend | 10 | Royalty Free (§21A.3: impedir extracción) | 14 USD | https://www.cgtrader.com/3d-models/animal/mammal/low-poly-animated-dog |
| Fab (Epic) | Animated CAT & DOG – 3D LOW POLY: 3 gatos, 2 perros; idle, sitting, stretching, walk, run, barking, eating, blink, jump | según listing | sí | Fab Standard (no limitado a Unreal, sin crédito) | no visible sin login | https://www.fab.com/listings/10aec0b5-73fd-4816-85f9-39e8caba3859 |
| Unity Asset Store | Soporte oficial: se pueden usar en otros motores; no redistribuir standalone | FBX | varía | Unity EULA | varía | https://support.unity.com/hc/en-us/articles/34387186019988 |
| Khronos | Fox: 576 tris, 24 joints, clips Survey/Walk/Run | GLB | 3 | CC0 modelo + CC BY rig | Gratis | https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/README.md |
| Poly Pizza | 10k+ low-poly; API con `animated=true`, `tricount` | GLB | filtro | CC0 / CC BY 4.0 por modelo | Gratis | (web bloqueada al verificar; dato de 2ª mano) |
| Kenney / Poly Haven | Sin animales 3D riggeados | — | — | CC0 | — | https://kenney.nl/assets/animal-pack-redux · https://polyhaven.com/license |

Sketchfab sigue sirviendo descargas gratuitas tras cerrar su tienda y migrar a Fab: https://sketchfab.com/blogs/community/sketchfab-update-what-you-need-to-know-now-that-fabs-live/

## IA generativa

| Herramienta | Rig cuadrúpedo | Animación | Licencia | URL |
|---|---|---|---|---|
| Meshy | Sí (humanoid, quadruped, smart-rig) | Cuadrúpedos: solo caminata; 600+ presets y Text-to-Motion son humanoides | Free 100 cr/mes → CC BY 4.0; Pro 20 USD → privada | https://docs.meshy.ai/en/webapp/guides/animate · https://www.meshy.ai/pricing |
| Tripo rig v3.0 (sep-2026) | biped, quadruped, hexapod, avian… | 16 presets universales (`preset:quadruped:walk`); rig 25 cr, anim 10 cr | No pude abrir precios/licencia | https://developers.tripo3d.com/en/models/rig |
| Rodin / Hyper3D | No | No | Creator 30 USD, Business 120 USD | https://makerstack.co/reviews/hyper3d-rodin-review/ |
| Animate Anything (Anything World) | quadrupeds, birds, fish | No genera clips | 20 cr gratis/mes | https://www.cgchannel.com/2023/10/animate-anything-uses-ai-to-rig-your-3d-characters |

Veredicto: generar malla + un ciclo de caminata es viable; idle/sit/cola con calidad de mascota no. Pack de artista primero.

## Animación de cuadrúpedos

- Mixamo: solo bípedos humanoides (FAQ): https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- Rigify meta-rigs Basic Quadruped, Cat, Wolf, Horse, Shark: https://docs.blender.org/manual/en/latest/addons/rigging/rigify/basics.html
- Rokoko addon: retarget documentado solo para humanoides: https://github.com/Rokoko/rokoko-studio-live-blender
- DigiDogs (mocap canino): solo investigación no comercial: https://cvssp.org/data/DigiDogs/
- Truebones FREE ZOO (75 animales FBX/BVH): sin licencia publicada.

## Quitar pistas de un clip (p. ej. `Head.quaternion` para que `dampLookAt` no compita)

```js
// scripts/strip-track.mjs — node scripts/strip-track.mjs in.glb out.glb Idle Head quaternion
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const [,, input, output, clipName, nodeName, path] = process.argv;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(input);
for (const anim of doc.getRoot().listAnimations()) {
  if (anim.getName() !== clipName) continue;
  for (const ch of anim.listChannels()) {
    if (ch.getTargetNode()?.getName() === nodeName && ch.getTargetPath() === path) { anim.removeChannel(ch); ch.dispose(); }
  }
}
await io.write(output, doc);
```

Correr antes de `optimize` (prune limpia samplers huérfanos).

## Exportador de Blender — referencia

Manual: https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html · Releases: https://developer.blender.org/docs/release_notes/ · glTF-IO: https://github.com/KhronosGroup/glTF-Blender-IO

En Blender ≥ 4.4 los NLA tracks se fusionan por acción (antes por nombre). Bone Influences distinto de 4 u 8 puede mostrarse mal.

## glTF-Transform — referencia

CLI: https://gltf-transform.dev/cli · `simplify`: https://gltf-transform.dev/modules/functions/functions/simplify · `meshopt`: https://gltf-transform.dev/modules/functions/functions/meshopt · meshoptimizer gltfpack: https://github.com/zeux/meshoptimizer/blob/master/gltf/README.md

Help oficial: Draco comprime geometría; Meshopt y quantization comprimen geometría y animación. `instance`: las mallas instanciadas no pueden animarse. `sparse` ayuda solo con morph targets.

KTX2: KTX-Software ≥ 4.4.0 (4.4.2 del 4-oct-2025); toktx legacy se elimina en 4.5/5.0: https://github.com/KhronosGroup/KTX-Software/releases. Medido: transcoder basis 527 kB; VRAM Fox 5.59 MB (PNG 1024) → 1.4 MB (WebP 512, sin KTX).

## Presupuestos externos

- Khronos 3D Commerce Publishing Targets v1.0: móvil/web ≤ 3 MB, ≤ 150k tris, < 20 draw calls, tex ≤ 2K; banner 500 kB–1 MB, 30–60k tris: https://github.com/mlimper/3DC-Asset-Creation/blob/main/asset-creation-guidelines/full-version/sec99_PublishingTargets/PublishingTargets.md
- 3DC validator defaults: ≤ 100k tris, ≤ 5 120 kB, texturas 512–2048 potencia de 2, ≤ 5 materiales: https://cdn.jsdelivr.net/npm/@mikefesta/3dc-validator@1.0.0/README.md
- Don McCurdy: idealmente < 5 MB, ≤ 100k tris, 1K–2K: https://discourse.threejs.org/t/maximum-3d-model-size-to-load/46077/7

## Atribución

- Buenas prácticas CC (TASL): https://wiki.creativecommons.org/wiki/Best_practices_for_attribution
- Sketchfab, cómo acreditar: https://help.sketchfab.com/en/articles/16152215-crediting-users-for-3d-model-downloads · licencias: https://sketchfab.com/licenses
- CGTrader términos (§21A.3): https://www.cgtrader.com/pages/terms-and-conditions
- Fab CLA: https://www.fab.com/cla

## No verificado

- Especies exactas del pack de Quaternius en su web; licencia y formatos de Omabuarts; precios/licencia de Tripo; estado de Luma Genie; precio del listing de Fab; meta-rig "Bird" en Rigify.
