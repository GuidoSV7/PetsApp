# Spec: old local sessions cannot open admin

## S4 — Invalidate both persisted legacy forms

Requirement: “Si existen sesiones locales hardcodeadas guardadas en el navegador de alguien, que ya no habiliten el admin: tratarlas como sesión inválida.”

Given a session emitted by the retired constructor, stored separately under petsapp_session_v1 or petsapp_sesion_v1, getPetsAppSession SHALL return null and getSessionToken SHALL return null.

The shared getter SHALL reject the constructor's distinctive user.id marker without retaining the old email, password or token literal in src. It SHALL NOT delete/rewrite storage or introduce a new key/version. Existing key precedence SHALL remain.

## S5 — Prove the actual client gate

Requirement: “Verificar que el acceso al panel del admin depende solo de la sesión real. Revisá cómo funciona hoy la protección del layout del admin y anotá si es solo del lado del cliente: los datos los protegen los guards de Nest, pero hay que saberlo.”

With either old-session key preloaded, the actual admin layout SHALL NOT render protected children and SHALL follow its existing absent-session redirect to /. LoginPage SHALL NOT mount-redirect that session to /admin.

A session saved from a successful real allowed-role login SHALL pass the current client gate. Member and absent-session cases SHALL preserve /account and / redirects respectively.

The documentation SHALL explicitly state that the current layout checks local role data only, has no server authentication/profile lookup, and is not a data-security boundary. Nest guards remain authoritative. This change SHALL NOT claim to authenticate arbitrary localStorage or add server-side layout protection.

## S6 — Preserve real-session contracts

Requirement: “El login real de Nest, la cookie de sesión, los roles, el backend y el resto del panel del admin.”

Real admin, super_admin and member sessions, including alternate-key reads, SHALL retain existing public store/helper outcomes. Successful save SHALL still write the primary key and remove the alternate key.

Tests SHALL preserve malformed/absent/storage-unavailable outcomes already covered, public token/session/user-update behavior, role rules and unchanged service/proxy contracts. No cookie handling, backend, real JWT processing, role definitions or unrelated admin page SHALL change.
