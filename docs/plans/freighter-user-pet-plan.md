# Freighter y mascota en la cuenta — plan completo actualizado

Estado: APROBADO PARA IMPLEMENTAR, con la modificación del owner del 27/10/2026: sin constraint triggers diferidos de credenciales. Flags de backend apagados por defecto. La ejecución y su evidencia se registran en `odd/tasks/freighter-user-pet.md`; este plan no acredita resultados todavía no observados.
Base relevada: `main`, `70906fdb87e2279268901ee791afeb1371051dd2`.
Archivo: `docs/plans/freighter-user-pet-plan.md`. Este documento reemplaza el plan anterior entregado por chat.

## 1. Alcance y decisiones vigentes

1. Freighter se suma al email; usa adaptador propio sobre `@stellar/freighter-api`, sin Stellar Wallets Kit ni WalletConnect.
2. La identidad y la propiedad se resuelven por `users.id`. NO se crea una tabla puente `accounts`.
3. `users.email` y `users.password` aceptarán NULL; las filas existentes no cambian. Se exige email+password o una identidad Stellar vinculada.
4. Una dirección G por usuario, solo testnet, sin desvinculación, reemplazo ni fusión de cuentas. Ingresar con wallet no habilita administración.
5. Una mascota vigente por usuario. Si hay conflicto, un único diálogo pregunta cuál conservar; la otra se archiva en el servidor, invisible al usuario y recuperable por soporte.
6. Sin elección no hay adopción, archivo ni movimientos de monedas; se conserva la clave invitada para reintentar.
7. Saldo de tienda y libro de movimientos por usuario; incorporación única del saldo legado al adoptar. Cuidado y renombrados siguen gratis.
8. Desafío de 5 minutos ligado al navegador y al propósito; control de firmas y umbral para cuentas Stellar existentes.
9. Se revoca el acceso por clave invitada después de adoptar; se limpia un Bearer anterior al ingresar con Freighter.
10. Freighter funciona independientemente de Pollar. No se agrega un puente de confianza desde Pollar.
11. La clave privada del usuario nunca entra en PetsApp. La clave de servicio SEP-10, aprobada, es dedicada, distinta de la futura cuenta de cobros, secreta de backend y separada por entorno; nunca en `NEXT_PUBLIC`, repositorio ni logs.

No se incluyen pagos USDC, acreditación desde Stellar, mainnet, recuperación de wallets, nuevas vías administrativas, una interfaz de mascotas guardadas ni botones para activar/cambiar mascotas.

## 2. Compatibilidad y hallazgos del código

### 2.1 Users, JWT y credenciales

Hoy `email`, `password` y `name` son obligatorios. JWT ya busca por `sub`, no por email: no hay un bloqueo concreto para extender `users` como decidió el owner.

Adaptaciones necesarias:

- Propagar `email: string | null` y `password: string | null` en persistencia y tipos internos; las respuestas públicas nunca incluyen password.
- Mantener `sub = users.id`. Admitir email NULL en payload y perfil; nunca usar un email ficticio ni `String(null)`.
- Mantener roles en `roles`/`user_roles`, estado activo y bloqueo. El alta wallet asigna `member` en la misma transacción.
- Comprobar que existe password antes de bcrypt en login, cambio/verificación de contraseña y baja por contraseña.
- Conservar los DTO de entrada de login y registro por email: siguen exigiendo strings válidos, con sus reglas actuales.
- Para un usuario sin password, el login email rechaza con el error genérico actual de credenciales inválidas; no revela el método de acceso. Las operaciones autenticadas que exigen contraseña responden `409 PASSWORD_NOT_CONFIGURED`, sin bcrypt ni mutación. No se agrega una baja por wallet ni una conversión de credenciales no solicitada.
- No modificar el mecanismo de Google existente ni fusionar usuarios por una dirección enviada desde el cliente.

Referencias: `backend/src/db/schema.ts:40–53`; `backend/src/auth/auth.service.ts:81–94,224–282`; `backend/src/auth/strategies/jwt.strategy.ts:15,59–75`; `backend/src/users/users.service.ts:120–132`.

### 2.2 Admin y frontend sin email

- El normalizador actual descarta sesiones sin email; debe aceptar la variante wallet con ID, rol y sesión del servidor válidos, sin relajar el ingreso email.
- La búsqueda de clientes llama a `u.email.toLowerCase()` y puede lanzar una excepción. Se vuelve null-safe y conserva la búsqueda actual por nombre/email/ID.
- La lista no filtra por email y se ordena por ID: no hay un problema de orden por email que resolver ni se cambia ese orden.
- Mostrar “Sin email · Freighter” en los lugares correspondientes. CSV conserva columnas y usa celda vacía, no el texto `null` ni un email inventado.
- El editor admin convierte NULL a texto vacío y hoy lo envía al guardar. Si se cambia nombre/país de un usuario wallet, debe omitir el email sin cambios, no mandar `email: ""`.
- No se convierte un usuario wallet a email mediante un PATCH incompleto ni se permite borrar la última credencial. Omitido, NULL y vacío no se tratan como equivalentes.
- `/account` muestra la identidad disponible y mantiene las funciones existentes para usuarios email. No muestra archivos de mascotas ni agrega un selector.

Referencias: `frontend/src/stores/auth-session.ts:61–67,91–94`; `frontend/src/app/admin/customers/page.tsx:62–90`; `frontend/src/app/admin/_components/customers/AdminUserDetailView.tsx:67–71,106–110`.

### 2.3 Invitado y home

El gato tiene UUID propio, `guest_key` única y coins en su fila. Incluso una home autenticada actual sigue operando con la clave invitada. Las rutas `/pet/*` son públicas y sus tests pet-only no ejercitan todos los guards globales.

Se conserva el contrato de invitado para mascotas no adoptadas. La denegación por clave de una mascota adoptada es el cambio de autorización expresamente aprobado.

No se rediseña el gate de la home pública: la rama Nest actual oculta el escenario sin sesión. Propiedad invitada y visibilidad anónima de UI son conceptos distintos; no se afirma que esa home hoy sea jugable sin login.

Referencias: `backend/src/pet/pet.controller.ts:9–40`; `backend/src/pet/infrastructure/drizzle-pet.repository.ts:44–98`; `frontend/src/features/pet-home/api/pet.service.ts:6–100`.

## 3. Modelo de datos y restricción de identidad

### 3.1 Users, sin tabla puente

`users` conserva IDs, nombres, estados, roles y filas existentes. Se permite NULL en email/password únicamente para usuarios que tengan identidad Stellar.

Reglas:

- El método email requiere email y password presentes; un valor aislado no habilita ese método ni basta para sostener una cuenta sin identidad Stellar.
- Al confirmar una transacción se exige exactamente la condición del owner: `(email IS NOT NULL AND password IS NOT NULL) OR identidad_Stellar_vinculada`. No se agrega una prohibición independiente de valores parciales cuando ya existe una identidad válida.
- La unicidad actual de emails no nulos continúa. PostgreSQL permite varios NULL bajo su UNIQUE normal; no se usa `NULLS NOT DISTINCT` para email.
- El alta wallet inserta usuario, identidad y rol member en una sola transacción. Nunca deja un usuario sin método de acceso confirmado.

### 3.2 Alta atómica, sin triggers de credenciales

Por decisión explícita del owner, esta entrega no instala constraint triggers diferidos ni un CHECK que consulte identidades. Tampoco permite desvincular direcciones, borrar contraseñas ni convertir cuentas.

El alta wallet crea usuario, identidad Stellar, rol member y saldo 0 en una sola transacción. La aplicación no confirma un alta wallet sin método de ingreso. Una prueba en PostgreSQL aislado debe demostrar el alta completa y que un fallo a mitad hace rollback sin usuarios, identidades, roles ni saldos huérfanos.

Esta garantía cubre las operaciones habilitadas por la aplicación, no afirma impedir cualquier SQL directo que borre credenciales. Si un feature futuro agrega desvincular direcciones o borrar credenciales, ese feature debe traer su propia garantía en la base y las pruebas correspondientes. No se agrega ahora una carrera de eliminación que la entrega no permite.

### 3.3 Tablas y relaciones

| Objeto | Contenido y garantía principal |
|---|---|
| `user_stellar_identities` | FK a `users.id`, dirección G, red y fecha. UNIQUE(user_id) y UNIQUE(network, address); una dirección por usuario y sin doble dueño. |
| `stellar_auth_challenges` | Propósito, dirección/red, hash del cuerpo XDR, vínculo de navegador/sesión, expiración, intentos y consumo único. |
| `stellar_auth_attempts` | Contadores temporales compartidos, no un Map por instancia. |
| `user_pet_ownership` | FK a `users.id` y `pet_states.id`; estado current/archived, fecha, motivo y operación. UNIQUE(pet_id) y unicidad parcial de una fila current por usuario. |
| `pet_claim_operations` | Usuario, mascotas involucradas, decisión opcional, estado y resultado idempotente. Un resultado confirmado no se vuelve a aplicar. |
| `user_coin_balances` | PK/FK users.id y saldo entero no negativo, inicialmente 0. |
| `user_coin_entries` | Libro de movimientos por users.id. Crédito legado único por pet_id y referencia a la operación que lo incorporó. |

`pet_states` retiene sus datos y su UUID. No se usa `statusKey` de gameplay para archivar. La fila archivada queda íntegra y fuera de cualquier escritura de cuidado o consulta pública; la metadata de archivo se guarda separada.

Un gato creado directamente para un usuario puede conservar un guest_key interno aleatorio por compatibilidad del esquema existente. No se entrega al navegador ni autoriza la ruta de invitado: la propiedad se crea en la misma transacción.

No hay cascadas que borren mascotas o movimientos de monedas al desactivar un usuario. La recuperación de un archivo conserva ID, estado completo, propietario, motivo, operación y timestamps.

## 4. Migraciones y orden

Nombres propuestos; se confirman al implementar contra el journal vigente. Hoy termina en `0005_free_pet_care`, idx 5.

### 0006 — `stellar_user_identity`

En una migración transaccional:

- Crear identidades, desafíos y contadores, con sus claves foráneas y unicidades; sin triggers de credenciales.
- Permitir NULL en `users.email` y `users.password` sin alterar valores existentes.
- El alta wallet se implementa como una transacción de usuario + identidad + rol member + saldo 0, con prueba de rollback sin filas huérfanas. La tabla de saldo se incorpora en 0008; los flujos permanecen apagados hasta disponer del esquema completo.
- Conservar índices de email y referencias de roles; no fabricar emails, passwords ni hacer un backfill de usuarios.
- Validar las filas anteriores. Si aparece una inconsistencia real, detenerse y reportarla; no repararla silenciosamente.

### 0007 — `user_pet_ownership`

- Crear propiedad vigente/archivo y operaciones de adopción.
- Una mascota vigente por usuario; un dueño por mascota.
- No adoptar, archivar ni modificar filas existentes durante la migración.

### 0008 — `user_coin_ledger`

- Crear saldo y movimientos por users.id, con referencias a mascotas y operaciones ya disponibles.
- Crédito legado único por mascota; restricciones de importes y relaciones.
- No mover ni resetear saldos durante la migración. El traslado sucede al adoptar, bajo transacción.

### Compatibilidad del historial

- 0000–0005 quedan intactas; sin UPDATE/backfill de datos existentes.
- Los tests históricos se ejecutan hasta su objetivo real: coat hasta 0004 y cuidado gratis hasta 0005. No se debilitan sus aserciones para aceptar las migraciones nuevas.
- Agregar pruebas separadas de 0006, 0007 y 0008, prefijo del journal, aplicación completa y reejecución sin efectos adicionales.
- Usar ventanas/lock_timeout definidos y fallar ante bloqueo, no esperar indefinidamente.
- La prueba compara todas las columnas de usuarios y gatos preexistentes, incluidos hashes de contraseña, roles, saldos 0/5/37 y timestamps.

Permitir NULL es una ampliación compatible del esquema, aprobada por el owner; no es una eliminación de columnas ni de credenciales existentes. No se ejecutan estas migraciones en este paso.

## 5. Adaptador Freighter y flujo SEP-10

### 5.1 Adaptador propio

Interfaz: `kind`, `connect`, `disconnect`, `getAddress`, `getNetwork`, `signTransaction`.

- Usar `requestAccess`, lectura de dirección/red y `signTransaction` de Freighter.
- Cargar el adaptador/SDK de forma diferida; no agregar trabajo al frame del gato.
- Configurar la red en PetsApp; no confiar en URLs suministradas por la wallet.
- Pasar la passphrase y dirección esperadas al firmar. No pasar simultáneamente `network` y `networkPassphrase`: la primera tiene precedencia en la API.
- Normalizar extensión ausente, permiso rechazado, firma cancelada y red incorrecta.
- `connect` no autentica; `disconnect` limpia estado local, no revoca permisos de la extensión ni reemplaza el logout del servidor.
- No copiar la wallet de prueba de Tinkazo que guarda un secreto en localStorage; tampoco agregar Friendbot, generación de wallets ni envío de transacciones al login.

La referencia actual de Tinkazo reexporta el adaptador desde `wallet-lite.ts`. Si se reutiliza código MIT, se conserva su atribución/licencia.

### 5.2 Desafío y firma

1. El usuario conecta Freighter y se obtiene una dirección pública G válida.
2. La UI comprueba testnet; si no coincide, pide cambiar la red y no solicita firma.
3. El backend emite un desafío SEP-10 firmado por la clave de servicio.
4. Incluye secuencia 0, ManageData `<home domain> auth`, nonce CSPRNG de 48 bytes codificado en base64 a 64 bytes, `web_auth_domain` y time bounds de 5 minutos.
5. Se guarda el hash del cuerpo de transacción, propósito login/link, dirección/red, expiración y hash del identificador aleatorio de flujo en cookie temporal HttpOnly. Para link también queda ligado al usuario y sesión autenticados.
6. El frontend valida firma de servidor, cuerpo permitido, secuencia, dirección, red, dominios y vencimiento antes de solicitar la firma.
7. Freighter firma dentro de la extensión y devuelve `signedTxXdr` y `signerAddress`.
8. El backend vuelve a validar todo con WebAuth del SDK oficial; `readChallengeTx` sola no prueba las firmas del cliente.
9. Consume el desafío y crea/resuelve el usuario o vínculo en una única transacción. Solo después del commit emite la cookie de sesión.

La transacción SEP-10 no se publica en Stellar ni mueve fondos; su secuencia 0 impide ejecutarla. No se requiere fondear una wallet para autenticarse.

### 5.3 Umbral, red y repetición

- Para una cuenta existente, consultar signers y verificar el high threshold propuesto previamente, excluyendo la firma del servidor y exigiendo contribución efectiva del cliente. Una firma de peso cero no prueba control.
- Una clave maestra con peso cero no se acepta por el solo hecho de producir una firma Ed25519 válida.
- Para una cuenta realmente inexistente, admitir la firma de la clave maestra de esa dirección, como permite SEP-10. No confundir un fallo de Horizon con un 404.
- Si Freighter no reúne las firmas necesarias, rechazar; no rebajar el umbral ni agregar un flujo multisig fuera del alcance.
- Comparar el cuerpo completo con el emitido: no aceptar otra transacción que conserve solo el nonce.
- Un desafío login no sirve para link ni para otro navegador, usuario, sesión o red.
- Dos verificaciones concurrentes producen un solo consumo exitoso. Un desafío consumido no emite otra sesión.
- Una respuesta perdida requiere un nuevo desafío; la unicidad de la identidad impide una segunda alta.

Se usa el formato y la verificación de prueba SEP-10 para emitir nuestra sesión. No se ofrece un servicio genérico de anchor ni se reemplaza `sub = users.id` por una dirección G.

### 5.4 Claves

La clave de servicio aprobada es exclusiva de autenticación, de backend, separada por entorno y de la futura cuenta de cobros. Su secreto nunca se expone mediante `NEXT_PUBLIC`, archivos versionados, respuestas o logs. La clave pública sí se publica/configura para verificar al servidor.

PetsApp nunca solicita, recibe, persiste ni exporta claves privadas o frases de recuperación del usuario. Las pruebas sintéticas usan claves de test efímeras, nunca credenciales reales; el recorrido de navegador no importa seeds desde scripts.

## 6. Alta, vinculación y roles

### Wallet nueva

Tras probar control, crear en una transacción:

- `users` con email/password NULL, nombre válido y estados iniciales normales;
- identidad Stellar única;
- rol member en `user_roles`;
- saldo de usuario 0, sin crear una mascota antes del bootstrap.

No se crean emails o contraseñas ficticios. Se siguen comprobando isActive/isBlocked por ID.

### Wallet conocida

Resolver la identidad a users.id y cargar ese usuario, roles y estado actuales. La dirección enviada por el cliente no elige otro usuario.

### Vincular desde /account

- Exigir sesión válida y autenticación reciente con una ventana de 5 minutos, aprobada por el owner. Para email, usar el mecanismo existente de comprobación de contraseña antes de emitir la prueba link.
- Verificar nuevamente usuario/estado/rol y sesión al confirmar, no solo al preparar el desafío.
- Rechazar una dirección de otro usuario o una segunda dirección. Repetir el vínculo ya existente mediante una nueva prueba válida es idempotente.
- No asociar cuentas por nombre/email declarado ni fusionarlas.
- No exponer desvinculación ni reemplazo de dirección.

Si una persona ya tiene email, la UI explica que debe entrar con email y vincular desde /account, en vez de crear otra cuenta wallet.

### Sin acceso administrativo por wallet

- La vía wallet no admite admin/super_admin ni concede permisos administrativos.
- Registrar en la nueva sesión que el método fue Stellar; los JWT anteriores de email mantienen su compatibilidad.
- Revalidar el método frente a los permisos actuales al usar la sesión: promover después a un usuario no debe convertir una cookie wallet en una sesión administrativa.
- Los administradores conservan su login y sus rutas actuales. Ajustar que puedan ver/editar datos permitidos de usuarios sin email no significa permitir que entren con wallet.

## 7. Una mascota y conflicto con invitado

### 7.1 Casos sin conflicto

| Situación | Resultado |
|---|---|
| Invitado existente y usuario sin mascota vigente | Adoptar la misma fila, conservar su UUID/estado y dejarla vigente. |
| Sin invitado existente y con mascota de usuario | Usar la vigente; no generar un invitado para adoptar. |
| Sin invitado existente y sin mascota de usuario | Crear una mascota propia con reglas actuales y saldo inicial 0. |
| Reintento de una operación completada | Devolver el resultado previo, sin modificar propiedad ni saldo otra vez. |
| Clave de mascota perteneciente a otro usuario | Denegar sin transferir ni revelar el dueño. |

Leer la clave local no debe generar una nueva para el bootstrap. Buscar un invitado para el conflicto tampoco debe crearlo por efecto lateral.

### 7.2 Conflicto: diálogo único

Si existen dos gatos distintos, el servidor devuelve `409 PET_CONFLICT`, un operation_id ligado al usuario y las dos opciones necesarias para elegir:

- “Conservar el de mi cuenta”.
- “Conservar el de este dispositivo”.

Explicar antes de elegir que el otro quedará archivado para soporte, no disponible en la UI. No hay una elección por defecto ni una segunda confirmación encadenada.

La preparación solo puede guardar metadata pendiente de la operación; NO cambia propietarios, archivos, mascotas ni saldos.

| Elección explícita | Mascota vigente después del commit | Otra mascota |
|---|---|---|
| Conservar cuenta | La que ya tenía el usuario | La invitada queda archivada y bajo custodia histórica del usuario. |
| Conservar invitado | La invitada adoptada | La anterior del usuario queda archivada. |
| No elegir/cerrar/perder conexión antes de enviar elección | La anterior del usuario, sin cambios | La invitada sigue sin adoptar; se conserva la clave local. |

No existe una sección “Mascotas guardadas”, listado de archivos, botón de activar ni cambio de mascota de autoservicio. Luego del commit solo se muestra la vigente.

### 7.3 Red, reintentos y elección ya enviada

- Cerrar el diálogo sin elegir deja la resolución pendiente. No se vuelve a abrir en bucle: se ofrece un reintento explícito, sin repetir confirmaciones automáticas.
- Después de elegir, los reintentos técnicos reutilizan operation_id y la misma decisión, sin volver a preguntarla.
- Si el usuario eligió y el servidor confirmó pero la respuesta se perdió, puede haber una adopción completada. Se consulta el estado o se repite idempotentemente; no se supone que “error de red” significa rollback.
- La clave local se conserva hasta tener confirmación del servidor. Entonces se retira/rota la clave antigua, aunque ya esté invalidada en el servidor.
- Si otra operación cambió la mascota vigente, se rechaza como `409 PET_CONFLICT_STALE`; no se aplica una elección sobre otro par de gatos. La UI vuelve a estado pendiente para resolución manual, sin archivar automáticamente.

“Sin elección no se adopta nada” no se confunde con una respuesta perdida después de una elección explícita.

### 7.4 Atomicidad y archivo de soporte

La resolución bloquea en orden estable usuario, operación, propiedad y filas de mascotas. Se verifica la vigencia del par y se toma el estado más reciente bajo bloqueo.

En una sola transacción se cambia propiedad/archivo, se incorpora el saldo que corresponda y se confirma el resultado. Si falla, se revierte todo.

- Como máximo una mascota current por users.id; la unicidad protege también carreras entre dispositivos.
- El archivo conserva fila íntegra y procedencia; se impide toda escritura normal sobre ella.
- La consulta de estado y las mutaciones de usuario filtran exclusivamente current.
- Las rutas de invitado rechazan cualquier mascota ya adoptada, vigente o archivada.
- Las mutaciones invitadas y la adopción comparten bloqueo/control de propiedad; no basta un SELECT seguido de un UPDATE antiguo por guest_key.
- No se agrega ni cambia geometría, patrón, esqueleto, necesidades, efectos, validación de nombres o costos.

Soporte tendrá un procedimiento documentado de recuperación, sin endpoint de autoservicio ni borrado. Debe identificar propietario/operación, conservar auditoría y probar en una DB aislada que recupera el estado íntegro, mantiene una sola mascota vigente y no vuelve a acreditar monedas. Ejecutarlo sobre datos reales necesitaría autorización específica; no se hace aquí.

Una clave perdida antes de cualquier adopción no puede reconstruirse mágicamente. La garantía nueva comienza con una asociación confirmada; un conflicto pendiente conserva la referencia local original.

## 8. Saldo y libro de movimientos

Saldo canónico en `user_coin_balances`, propietario users.id. Definición vigente: 1 moneda = 1 USDC de crédito de tienda, no token ni saldo rescatable. No se implementan cobros ni pagos en Stellar.

- El servidor obtiene el saldo legado de la fila bloqueada, nunca de un coins del body.
- Inserta un movimiento de incorporación único por pet_id y actualiza el saldo en la misma transacción de adopción/resolución.
- Resolver el conflicto también incorpora la custodia del invitado aunque quede archivado. Por eso, ambas elecciones incorporan su saldo legado una sola vez; no se destruye dinero por elegir un gato.
- Archivar la mascota anterior no vuelve a acreditar su saldo: ya pertenece al usuario.
- Sin elección no se mueve dinero.
- Reintentar, recuperar un archivo mediante soporte o volver a ingresar no genera otro crédito.
- El coins de la fila legada puede conservarse como dato histórico, pero ya no es autoridad ni resulta accesible mediante la clave antigua.
- El DTO de mascota de usuario conserva el campo coins, obtenido del saldo de usuario. El invitado no adoptado mantiene su DTO y saldo legado actuales.
- Cuidado/renombrado no escriben el saldo de usuario ni copian un snapshot viejo sobre él.

Ejemplo verificable: usuario 37 + invitado 5 => 42 al resolver con cualquiera de las dos elecciones; todos los reintentos y una recuperación de soporte mantienen 42. Sin elección queda 37 en usuario y 5 en invitado, sin cambios.

## 9. Sesión del frontend y Pollar

- Reutilizar la cookie de sesión: HttpOnly, SameSite, Secure y prefijo __Host- en producción según la política actual. JWT siempre refiere a users.id.
- El flujo email conserva respuesta/token, validaciones, cookie y navegación actuales.
- La nueva respuesta wallet puede entregar perfil y estado público sin exponer un token Stellar. La credencial operativa es la cookie; no se agrega un JWT wallet persistido en localStorage.
- El almacenamiento/normalizador distingue la sesión wallet sin email; no trata una dirección o marcador local como autenticación. Al hidratar, confirmar perfil contra el servidor.
- Al completar wallet login, retirar el Bearer previo y sus claves legacy antes de perfil, bootstrap y pedidos privados: hoy Authorization tiene precedencia sobre cookie.
- Invalidar cachés, cancelar/descartar respuestas del propietario anterior y recargar el escenario por identidad. Un resultado tardío de otro usuario no debe pintar ni modificar el gato actual.
- Ejecutar bootstrap/adopción antes de cargar el estado privado; un GET no adopta ni archiva.
- Ante cookie inválida, mostrar reautenticación: no caer silenciosamente a un gato invitado que parezca una pérdida de datos.
- Con o sin clave Pollar, Freighter usa el adaptador y la verificación Nest propios, no Pollar login ni su red inferida de la clave.
- El resto de Pollar no se convierte automáticamente en una cuenta de servidor. No se confía en su estado frontend para asignar users.id.
- Logout de nuestra sesión llama a Nest, limpia credenciales/cachés y el estado local del adaptador, también cuando la home usa la rama Pollar. Un conflicto no resuelto no borra la clave invitada.

## 10. Lista completa de endpoints

Los nombres nuevos son contratos propuestos para implementar. No implican que exista una tabla accounts.

### 10.1 Rutas actuales que se conservan

| Endpoint | Contrato conservado |
|---|---|
| POST /auth/login, /auth/register, /auth/google | Email/Google y respuestas actuales, con sus validaciones y controles. |
| POST /auth/logout | Limpieza de nuestra cookie según contrato actual. |
| GET /auth/profile y GET /users/me | Mismo usuario por ID; email puede ser NULL solo para la nueva clase de usuario wallet. |
| POST /auth/change-password, /auth/verify-password; DELETE /users/me | Comportamiento email intacto; para ausencia de contraseña, rechazo controlado sin bcrypt ni mutación. |
| GET /pet/state | Invitado por X-Pet-Guest-Key; inicialización y DTO actuales para mascotas no adoptadas. |
| POST /pet/actions/:action | Cuidado invitado, validaciones y reglas actuales. |
| POST /pet/coat | Personalización invitada actual. |
| POST /pet/name | Renombrado invitado actual. |
| Rutas admin actuales | Roles y permisos intactos; respuestas/edición null-safe sin convertirlas en rutas wallet. |

Solo cambia el acceso por clave a una mascota adoptada: `403 GUEST_PET_UNAVAILABLE`, sin revelar dueño ni datos. No se transforman implícitamente los pedidos viejos /pet/* en pedidos de usuario.

### 10.2 Rutas nuevas

| Endpoint | Autorización y propósito | Resultado principal |
|---|---|---|
| POST /auth/stellar/challenge | Público con guard de origen y límite; dirección G y flujo navegador | 200 con transaction, network_passphrase y metadata de expiración. |
| POST /auth/stellar/verify | Prueba firmada + mismo flujo; no acepta user_id elegido por cliente | 200, perfil y cookie después de consumo/alta atómica. |
| GET /account/stellar | Sesión de usuario | Vínculo propio o ausencia de vínculo; nunca secretos. |
| POST /account/stellar/challenge | Sesión member reciente y protección de origen | 200, desafío de propósito link ligado a sesión/usuario. |
| POST /account/stellar/verify | Sesión/propósito/prueba coincidentes | 200, vínculo confirmado; 409 si dirección/usuario ya tiene otro vínculo. |
| POST /account/pet/claim-guest | Sesión; clave invitada si existe; choice/operation_id solo para resolver | 200 adoptado/inicializado/sin cambios; 409 PET_CONFLICT si falta elección. |
| GET /account/pet/claims/:operationId | Sesión y operación del mismo usuario | Estado pendiente/confirmado y resultado mínimo, sin exponer el archivo. |
| GET /account/pet/state | Sesión y propiedad current | DTO del gato vigente con coins del usuario; 404 PET_NOT_INITIALIZED antes de bootstrap. |
| POST /account/pet/actions/:action | Sesión y mascota current | Mismas reglas de cuidado gratis. |
| POST /account/pet/coat | Sesión y mascota current | Misma validación de coat/pattern. |
| POST /account/pet/name | Sesión y mascota current | Misma validación y renombrado gratis. |

El POST de bootstrap/claim también usa la mascota vigente, o crea una propia cuando el servidor comprueba que no existe invitado ni vigente. No hace falta un endpoint de inicialización adicional. GET /account/pet/state no crea un gato antes de resolver el bootstrap.

La elección es `keep_account` o `keep_guest`, ligada a la operación preparada por el servidor. No se aceptan propietarios, snapshots, saldos ni IDs arbitrarios de otras mascotas.

No existen endpoints públicos de listado de archivos, activación, cambio de mascota, desvinculación de wallet, fusión ni restauración de soporte.

### 10.3 Errores nuevos previstos

- 400: formato/address/XDR no soportado, elección inválida o entrada incompleta.
- 401: sesión/prueba/flujo inválido, desafío vencido o firma que no prueba autoridad. No emitir cookie nueva.
- 403: método wallet para acceso administrativo, propiedad ajena o clave de gato adoptado.
- 409: vínculo incompatible, desafío consumido, conflicto de gatos pendiente/desactualizado, operación con otra decisión o contraseña no configurada.
- 429: límite alcanzado, con Retry-After.
- 503: verificación externa temporalmente indisponible o feature no habilitada; no fingir cuenta inexistente ni éxito.

Los errores actuales de email e invitado conservan sus contratos. La nueva clase wallet y la revocación aprobada agregan los estados descritos, no sustituyen los existentes.

## 11. Seguridad, límites y persistencia

### 11.1 Límites iniciales propuestos

| Control | Límite |
|---|---|
| Desafíos login/link por dirección | 5 cada 5 minutos, agregados entre propósitos/instancias. |
| Desafíos por IP | 30 cada 5 minutos. |
| Desafíos pendientes del mismo flujo/dirección/propósito | Uno vigente; un reemplazo afecta solo a ese flujo. |
| Firmas incorrectas por desafío y flujo legítimo | 3; luego se invalida ese desafío. |
| Vencimiento | 5 minutos, verificados por reloj del servidor y time bounds. |

No hay bloqueo permanente de usuario por intentos externos. Las peticiones de otro navegador no consumen el desafío legítimo ni permiten vincularlo. Los límites generales existentes continúan; no reemplazan los específicos.

Contadores compartidos en PostgreSQL; IP obtenida solo mediante la política de proxy confiable, identificadores minimizados/HMAC y retención corta documentada. No introducir Redis ni otra infraestructura para este alcance.

Los fallos de red/Horizon no son firmas inválidas. No consumir el desafío ni incrementar el contador criptográfico por un fallo de infraestructura; sí pueden contar en límites de volumen.

### 11.2 Configuración

Backend: red/passphrase testnet, Horizon fijo permitido, dominios canónicos, firmador/clave de servicio, límites y flags de habilitación. Frontend: red esperada y clave pública/dominios esperados; nunca el secreto de firma.

No usar Host, red, RPC URL, clave de servidor o user_id aportados por el cliente como raíz de confianza. Una configuración mainnet no habilita esta feature: solo testnet en este alcance.

Proteger rutas públicas de challenge/verify con el guard de origen como los POST públicos de auth existentes. Rutas privadas exigen JWT de usuario, autorización por users.id y controles de origen para cookie; no usar un client-secret interno como sustituto de usuario.

### 11.3 Guardado y auditoría

Guardar direcciones públicas, relaciones por users.id, metadatos/hashes de desafío, tiempos, intentos, operaciones de adopción, procedencia de archivos, saldo y movimientos.

No guardar ni loguear claves privadas/seed de usuario, secreto de servicio, cookies, tokens, XDR firmados ni cuerpos completos de autenticación. La clave pública de servicio no es un secreto.

Los desafíos, contadores y operaciones pendientes tienen retención y limpieza; un resultado financiero confirmado conserva la trazabilidad necesaria para impedir doble crédito. Limpiar metadata transitoria no borra gatos, identidades vigentes ni movimientos de monedas.

## 12. Tests y RED esperado

Esta sección define las pruebas exigidas. La evidencia real RED/GREEN y de navegador se registra durante la implementación en `odd/tasks/freighter-user-pet.md`; una prueba prevista no cuenta como una ejecución observada.

Cada regla tendrá un test RED antes del cambio correspondiente. Se registran comando, exit code y fallo exacto; errores de fixture/runner o tablas/rutas todavía inexistentes no se presentan como evidencia de una regla criptográfica ya ejercitada.

| Regla | RED esperado | GREEN exigido y efectos observables |
|---|---|---|
| Usuario wallet real | Esquema/tipos actuales rechazan NULL o el normalizador descarta la sesión. | Usuario+identidad+member confirmados en una transacción; email/password NULL; sesión usable y perfil correcto. |
| Alta wallet atómica | Un alta no transaccional podría dejar usuario sin método de ingreso tras un fallo intermedio. | Usuario + identidad + rol member + saldo 0 se confirman juntos; fallo a mitad hace rollback sin filas huérfanas en PostgreSQL real. No se implementan ni prueban operaciones de eliminación de credenciales no habilitadas. |
| Login email | Control puede empezar verde. | Mismos status/body/cookie, validaciones, roles, bloqueos y errores actuales. |
| Password ausente | Bcrypt/tipos actuales pueden fallar con NULL. | Cambio/verificación/baja basados en password devuelven 409 controlado, sin mutación; email sigue igual. |
| Admin sin email | Búsqueda puede lanzar TypeError; editor envía email vacío. | Lista/detalle/búsqueda/CSV no fallan; editar nombre/país omite email sin cambios; mismo orden/columnas y autorización. |
| SEP-10 completo | Feature inicialmente ausente; no contar un 404 como prueba de protección de firmas. | Prueba válida autentica; servidor falso, cuerpo cambiado, secuencia/ops/dominio/red incorrectos, firma inválida y firmante de peso cero son rechazados. |
| Vencimiento y replay | Sin estado atómico se reutiliza el desafío. | Borde temporal válido/vencido y dos verificaciones simultáneas: un consumo, una alta y ninguna sesión nueva en el rechazo. |
| Vínculo | Una dirección aislada o desafío de login no debe bastar. | Link requiere sesión reciente/propósito/browser; una dirección y un usuario únicos; sin fusión, sin admin wallet. |
| Conflicto sin elección | La adopción automática anterior violaría la decisión. | Solo metadata pendiente: propietarios, filas de gatos, estado, saldos y libro intactos; clave local conservada. |
| Conservar cuenta | Resolver sin archivo seguro puede perder el invitado. | Vigente anterior idéntico, invitado archivado íntegro e inaccesible por guest key; un crédito legado. |
| Conservar invitado | Reemplazar/borrar puede perder el gato anterior. | Invitado vigente con mismo ID/estado; anterior archivado íntegro; una sola mascota current y un crédito. |
| Respuesta perdida/reintento | Sin operación idempotente puede reaparecer el diálogo o duplicarse crédito. | Misma decisión/operation_id devuelve resultado previo; no repregunta, no duplica ni modifica otro usuario. |
| Dos dispositivos | Sin locks/unicidad podrían adoptar dos dueños o resolver un par viejo. | Un dueño/current; operación desactualizada rechazada sin archivo ni crédito parcial. |
| Guest key revocada | Repositorio actual accede solamente por clave. | Tras adopción, GET y todas las mutaciones invitadas se deniegan; antes conservan sus contratos. |
| Saldos | Snapshot o reintento podría duplicar/pisar coins. | Casos 0/5/37 y ejemplo 37+5=42 en ambas elecciones; no elección sin cambios; cuidado gratis y soporte no acreditan otra vez. |
| Archivo invisible/recuperable | Solo ocultar un componente no protege datos. | Ningún endpoint/UI normal lista o modifica archivos; procedimiento aislado recupera estado íntegro sin borrar ni recrear dinero. |
| Cambio de sesión | Bearer previo/caché puede mantener el dueño anterior. | Cookie wallet opera como users.id correcto, email NULL persiste, no respuestas tardías cruzadas; logout y adopción pendiente conservan las garantías. |

### Verificación funcional e integración

- PostgreSQL aislado real, con conexiones independientes para carreras; no producción ni nombres de base compartidos.
- Comparar columnas completas de usuarios/gatos antes y después de cada migración; incluir credenciales existentes, roles, coats, nombre, renameCount y timestamps.
- Comprobar estado almacenado y ausencia de efectos parciales en cada rechazo. Los contadores de intentos solo cambian cuando corresponde a su política, no se promete que todo contador quede inmóvil.
- Probar HTTP con los guards globales, JWT y origen reales, no solo módulos pet-only sin autorización global.
- Adaptar fakes a NULL/UNIQUE/search de SQL; no usar sus resultados como sustituto de la garantía multi-tabla real.
- Tests frontend de sesión email/wallet, admin nullable, diálogo único, cierre sin elegir, elección enviada con respuesta perdida y limpieza del Bearer legacy.
- Diferencial con la base: email/Google/logout/perfiles y rutas invitadas no adoptadas, con fixtures aisladas, comparando status, body y efectos posteriores. Cualquier diferencia no pedida se trata como regresión.
- Suites completas backend/frontend, lint configurado, TypeScript y builds; no inventar un linter frontend si no está configurado.
- Conservar pruebas/fixtures de cuidado gratis, 3D, patrones y esqueleto; no regenerar goldens A1 para esconder cambios.
- Instalar/verificar nuevas dependencias con lockfile reproducible y entorno normal; sin Wallets Kit/WalletConnect ni flags para ocultar fallos.

## 13. Navegador real: Freighter testnet y screenshots

### Preparación

- App y Nest locales con DB PostgreSQL desechable y puertos propios; no conectar a producción.
- Extensión Freighter real y versión registrada, testnet, perfil de prueba autorizado.
- El operador prepara/desbloquea la wallet en Freighter. Scripts y app no reciben seeds ni importan claves de usuario desde fixtures.
- Usar API real y firmas reales; mocks del adaptador quedan como pruebas de UI, no aceptación del login.

### Recorridos obligatorios

1. Invitado reconocible + wallet nueva: conectar, revisar testnet, firmar, verificar cookie y users.id; adoptar y conservar todos los datos.
2. Alimentar/renombrar gratis, recargar y confirmar persistencia.
3. Borrar datos del sitio/cerrar sesión sin tocar almacenamiento de la extensión; ingresar otra vez y recuperar el mismo usuario, gato y saldo. Cuando haya dos perfiles/dispositivos de prueba autorizados, repetir con la misma wallet configurada por el operador, sin que PetsApp maneje su secreto.
4. Usuario email: vincular Freighter, salir, entrar por Freighter, salir y volver por contraseña. Ambas entradas llegan al mismo users.id.
5. Conflicto: conservar cuenta; comprobar un solo diálogo, invitado archivado y no visible, estado correcto y crédito único.
6. En otro fixture aislado, conservar invitado; verificar archivo íntegro del anterior, sin selector/listado de mascotas.
7. Cerrar sin elegir y cortar red antes de enviar elección: no adopción/archivo/crédito, clave retenida y reintento explícito.
8. Cortar respuesta después de enviar una elección: consultar/reintentar la misma operación, sin repregunta ni duplicados.
9. Cancelar firma, red incorrecta y desafío vencido: sin nueva sesión ni adopción; UI recuperable.
10. Admin por email: listar/buscar/editar nombre o país de wallet-only sin error ni email vacío enviado. Ingreso administrativo por wallet rechazado.
11. Repetir la entrada Freighter con Pollar configurado y sin él; misma verificación Nest, sin usar la sesión Pollar como prueba.

### Evidencia requerida

- Screenshot de consentimiento/firma de autenticación testnet sin secretos.
- `/account` con identidad Stellar y, cuando corresponde, email NULL presentado correctamente.
- Diálogo de conflicto con las dos opciones, sin doble confirmación.
- Resultado de cada elección mostrando solo el gato vigente; archivo comprobado por API/DB de prueba, no por una UI de mascotas guardadas.
- Recarga/reingreso con gato y saldo recuperados; admin con usuario sin email.
- Logs técnicos sanitizados: red, versiones, commit, resultados HTTP y cookie comprobada sin volcar su valor.
- Home responsive, sin errores JS/red y con canvas WebGL no vacío. SwiftShader no se presenta como prueba de GPU/teléfono físico.
- Cleanup físico comprobado de servidores, DB y perfiles temporales propios, no solo un flag de éxito del runner.

Si no se dispone del contexto Freighter real o de su intervención, se registra la prueba faltante como bloqueada: un mock o screenshot de viewport no la reemplaza.

El adaptador elegido no promete login desde un navegador móvil común sin proveedor compatible. La ruta documentada de Freighter Mobile con WalletConnect queda fuera del alcance; móvil conserva email y un mensaje de disponibilidad honesto.

## 14. Unidades de implementación y activación futura

Plan e implementación autorizados por el owner, con flags apagados por defecto:

1. Migración 0006 y tipos null-safe; pruebas de alta wallet atómica/rollback, email y admin, sin triggers de credenciales.
2. SEP-10/identidad/sesión, vínculo y bloqueo de administración por wallet.
3. Migraciones 0007/0008 y persistencia transaccional de adopción, archivo y ledger.
4. Endpoints privados/guest revocado y pruebas de conflicto, elección pendiente y carreras.
5. Adaptador/UI, sesión NULL-email, admin, bootstrap y manejo de respuestas perdidas.
6. Suites/diferencial/builds, navegador Freighter real, verificación independiente y assessment/review nativo si corresponde.

Código, tests y documentación de cada comportamiento viajan juntos en commits revisables. No se fija aquí un número de PRs ni se da permiso para publicarlos.

### Condición de activación

Las migraciones por sí solas no habilitan login ni adopciones. Mantener flags de backend apagados hasta que todas las instancias soporten NULL y conozcan la propiedad/archivo.

Antes de la primera adopción debe desaparecer cualquier backend que acceda a gatos adoptados solo por guest_key. La excepción de versiones mixtas del cuidado gratis NO se aplica a este cambio de autorización.

Una futura activación autorizada sigue este orden: esquema expandido, todos los backends compatibles y owner-aware, frontend compatible, comprobación de entorno y recién habilitación de flujos en testnet.

Después de crear usuarios sin email o adoptar gatos no se revierte a un backend que suponga NOT NULL o ignore propiedad. Una contingencia deshabilita nuevas entradas/adopciones sin revivir claves viejas, borrar vínculos, archivos o movimientos.

Nada de esto se ejecuta sobre producción en este paso. Mainnet permanece fuera del alcance.

## 15. Cierre y criterios de aceptación

Pendientes hasta implementar y observar resultados:

- [ ] Email y sus contratos siguen iguales; usuarios/contraseñas previos no cambian.
- [ ] No hay tabla puente accounts, emails ficticios ni contraseñas wallet inventadas.
- [ ] El alta wallet confirma usuario + identidad + rol member + saldo 0 juntos; un fallo intermedio hace rollback sin filas huérfanas, probado en PostgreSQL aislado. Sin triggers ni prueba de concurrencia de eliminación de credenciales.
- [ ] JWT, perfil, sesión frontend y admin funcionan con email NULL y mantienen permisos.
- [ ] Usuario sin gato adopta el invitado; conflicto exige elección explícita y deja exactamente una mascota vigente.
- [ ] Sin elección no hay adopción ni archivo ni crédito; la clave se conserva.
- [ ] El descartado queda íntegro, invisible e inaccesible, recuperable por soporte sin doble crédito.
- [ ] No hay UI/endpoints de mascotas guardadas o activación/cambio.
- [ ] Ledger y saldo por users.id incorporan una vez 0/5/37, con idempotencia ante red y concurrencia.
- [ ] Clave invitada revocada después de adoptar; cuidado gratis y DTO de invitado no adoptado preservados.
- [ ] SEP-10 real con 5 minutos, browser/purpose, umbral, uso único, límites y ninguna clave privada del usuario en PetsApp.
- [ ] Sin acceso admin por wallet; funciona sin Pollar y no conserva un Bearer anterior.
- [ ] Freighter testnet y screenshots reales, suites y verificación independiente completas; faltantes reportados sin inventar evidencia.
- [ ] 3D, patrones, esqueleto y migraciones históricas intactos; sin producción ni mainnet.

No se encontró un bloqueo concreto al modelo users decidido por el owner. Se mantiene users sin tabla puente y se prueba el alta wallet atómica. No se instalan triggers diferidos de credenciales; si se agrega desvincular o borrar credenciales en otro feature, ese feature debe traer su propia garantía en la base.

Riesgos previstos al implementar: item 1 (propiedad/archivo/saldos), item 2 (autenticación y autorización), item 4 (concurrencia) e item 5 (dependencias/activación). Este documento no es aprobación nativa ni prueba de una implementación.

## 16. Fuentes y trazabilidad

Decisiones de producto: mensaje del owner “Freighter y mascota en la cuenta — ajustes al plan”, recibido el 27/10/2026. Reemplaza las propuestas anteriores de tabla puente y mascotas guardadas. La instrucción “Freighter y mascota en la cuenta — implementación” aprueba las unidades 1–6 y reemplaza la garantía por triggers de credenciales por alta atómica con prueba de rollback; el texto completo se conserva en el Log de `odd/tasks/freighter-user-pet.md`.

- Tinkazo D-06: https://github.com/nema1502/tinkazo/blob/main/docs/architecture.md
- Contrato/reexportación: https://github.com/nema1502/tinkazo/blob/main/src/stellar/wallet.ts
- Adaptador externo actual: https://github.com/nema1502/tinkazo/blob/main/src/stellar/wallet-lite.ts
- SEP-10: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
- SDK WebAuth: https://github.com/stellar/js-stellar-sdk/blob/main/docs/reference/seps-webauth.md
- Freighter conexión/red/firma: https://docs.freighter.app/extension-freighter-api/connecting · https://docs.freighter.app/extension-freighter-api/reading-data · https://docs.freighter.app/extension-freighter-api/signing
- Freighter Mobile: https://docs.freighter.app/mobile-walletconnect/mobile
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL constraint triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html

Relevamiento: esquema, servicios de auth/usuarios, estrategia JWT, repositorios/fakes, sesión frontend, admin y rutas pet actuales. Las referencias marcan evidencia observada; el comportamiento futuro descrito no se da por implementado.

**FIN DEL PLAN COMPLETO — 16 secciones. Implementación autorizada con flags apagados por defecto. Evidencia y estado real en `odd/tasks/freighter-user-pet.md`. Sin operaciones sobre producción ni mainnet; habilitar testnet requiere una decisión posterior del owner.**
