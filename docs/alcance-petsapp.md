# Alcance — PetsApp

Actualizado: 2026-10-26.

## Qué es

Webapp donde cada usuario cuida un gato virtual 3D al estilo Pou, con una landing pública que explica el proyecto. Más adelante se suma un ecommerce: ropa y accesorios que se compran para el gato virtual y llegan en físico para el gato real, con pagos en Stellar.

## Incluye — hecho

- **Cuentas y admin.** Registro y login con cookie de sesión y roles, panel admin de usuarios (`GET/PATCH /admin/users`, `toggle-block`), cuenta mínima de miembro (`/account`) y proxy same-origin `/petsapp-api` hacia el backend.
- **Landing pública.**
- **Mascota (backend).** Un gato por clave de invitado: el navegador guarda la clave en `localStorage` y la manda en el header `X-Pet-Guest-Key`. Cuatro necesidades de 0 a 100 (hambre, diversión, energía, higiene), cinco acciones de cuidado (`feed`, `play`, `sleep`, `bathe`, `pet`), nombre editable y monedas.
- **Monedas.** Se empieza con 5. Alimentar cuesta 5 y renombrar (desde el segundo cambio) también cuesta. Hoy no hay forma de ganarlas.
- **Gato voxel por código.** 33 piezas con ids fijos y jerarquía padre-hijo, parpadeo, cola y orejas en reposo, señales visuales de las necesidades, resolución adaptativa al dispositivo y sombra de contacto.
- **Pelaje.** Tres colores más un patrón (liso, atigrado, esmoquin, calicó, siamés) guardados en el backend, con sugerencia de colores desde la cámara.
- **Admin Diseño 3D.** Vista previa local de proporciones del gato; los ajustes quedan en el navegador.

## Incluye — planeado, en orden

Detalle completo en el plan "Gato natural y escenario 3D".

- **Línea A, animación:** A1 esqueleto (sin cambio visible), A2 poses y transiciones, A3 cerebro que decide qué hacer, A4 caminar, A5 gestos finos y voz.
- **Línea B, escenario:** B1 habitación 3D en el home (visor más grande, reemplaza la imagen de fondo), B2 catálogo e inventario en el backend, B3 modo Decorar, B4 objetos que el gato usa, B5 tienda.

## Fuera de alcance por ahora

- Rediseño visual de toda la app. Excepción: el home del gato cambia con B1.
- Pagos o wallet en el frontend. La tienda (B5) espera al ecommerce con Stellar.
- Promover roles desde la UI pública (solo seed o super admin).
- Modelos GLB o rig de artista, retirados en los specs 1 y 2.
- Objetos pagados atados a un invitado: el inventario irá atado a una cuenta.

## Paleta

Tokens de `frontend/src/app/globals.css`. El modo oscuro mantiene los mismos valores, y las áreas `admin` y `cliente` usan el mismo primario y secundario.

| Token | Hex | Uso |
| --- | --- | --- |
| `--fondo` | `#07140c` | Fondo general, bosque oscuro |
| `--texto` | `#131317` | Texto principal en zonas claras |
| `--panel-izquierdo-fondo` | `#0f2418` | Fondo del panel lateral |
| `--panel-izquierdo-acento` | `#3dcc7a` | Acento del panel lateral |
| `--panel-izquierdo-texto` | `#e8f5ec` | Texto del panel lateral |
| `--superficie` | `#eef6f0` | Fondo del área de contenido |
| `--tarjeta` | `#ffffff` | Tarjetas dentro del contenido |
| `--primario` | `#3dff8a` | Botones y enlaces |
| `--secundario` | `#2fd976` | Acento secundario |
| `--estado-exito` | `#3dff8a` | Éxito |
| `--estado-informacion` | `#6ee7b0` | Información |
| `--estado-error` | `#f500dc` | Error |
| `--estado-advertencia` | `#ffcc33` | Advertencia |

Los textos secundarios y los bordes se derivan con `color-mix` del texto: 70 % para texto secundario, 18 % y 22 % para bordes.

Los colores del gato no usan esta paleta: salen de los presets de pelaje (`pet-customize.ts`).

## Decisiones abiertas

- Antes de B1: tamaño del visor, cámara y gestos táctiles.
- Antes de B2: inventario atado a una cuenta y paso de invitado a cuenta.
- Economía: cómo se ganan monedas y si los objetos virtuales se pagan con monedas, con USDC en Stellar o solo comprando el producto físico.
