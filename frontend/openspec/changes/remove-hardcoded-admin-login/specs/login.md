# Spec: Nest-only admin login

## S1 — Remove the public login shortcut

Requirement: “Borrar el módulo del admin hardcodeado (credenciales, token y constructor de sesión local) y la alternativa del `LoginPage` que crea esa sesión cuando falla Nest.”

The hardcoded module SHALL be absent. LoginPage SHALL neither import its helpers nor enforce the legacy credential pair before contacting Nest.

Given the formerly hardcoded pair and a rejected Nest request, submitting SHALL show an error, SHALL NOT save a session, and SHALL NOT navigate to /admin. The old values SHALL have no special client-side authority.

## S2 — Accept the real allowed-role response

Requirement: “El acceso al admin queda solo con el login real de Nest y un usuario con rol admin o super_admin.”

Given arbitrary non-legacy credentials and a successful Nest login returning admin or super_admin, the page SHALL call the existing service, save exactly the returned token/user and navigate to /admin.

Both roles SHALL be covered. Existing member-role rejection SHALL remain: no local admin session/save/navigation. The real service, cookie issuance and role definitions SHALL remain unchanged.

If Nest legitimately accepts the former pair, it SHALL follow the same real-login path; no new credential blacklist is introduced.

## S3 — Failure creates no session

Requirement: “Si Nest falla, el login muestra el error, como cualquier login fallido. Sin alternativa local.”

For both an API rejection and a network failure, the page SHALL show a safe error, reset pending state and neither save session data nor navigate. Starting with empty storage, both session keys SHALL remain absent; starting with a stored invalid legacy session, its bytes SHALL remain unchanged and invalid.

Tests SHALL assert service calls, visible error, storage/save effects, navigation and restored submit availability. No credential/token values SHALL appear in new user-facing errors or logs.
