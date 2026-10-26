# Remove the browser-local admin login

Validated Prompt1 proposal: remove the public bootstrap credentials and local super_admin fallback; retain the existing Nest login, cookie, roles and backend.
Prompt2 authorized implementation and verification of T1–T7. Prompt3 now authorizes native RDD and exactly one 26-file commit only if it approves, plus an open-PR description update; no push or production operations. The original planning checkpoint remains historical.

## Requested outcome

- “Eliminar el login hardcodeado.”
- “Si Nest falla, el login muestra el error, como cualquier login fallido. Sin alternativa local.”
- “Si existen sesiones locales hardcodeadas guardadas en el navegador de alguien, que ya no habiliten el admin: tratarlas como sesión inválida.”
- “ningún archivo de `src/` contiene el email, la contraseña ni el token viejos.”
- “No implementes todavía.” / “Sin commits.”

## What the code actually does

The client LoginPage imports the credential matcher and local-session builder. It rejects non-legacy credentials **before** contacting Nest, then creates a local super_admin session whenever the Nest request throws. Removing only the catch fallback would still prevent ordinary real administrators from signing in.

The admin layout is a client-only role gate over localStorage. It does not authenticate the stored token with Nest. Nest guards protect data; client navigation is not a security boundary. Details and evidence: [design](design.md).

## Proposed bounded change

1. Delete the hardcoded module and remove the pre-Nest filter and catch fallback.
2. Preserve the real Nest request and role check; show the login error without saving a session or navigating on failure.
3. Reject the retired constructor's distinctive user ID during session rehydration, through the shared getter and both existing storage keys. Do not keep any old credential/token literal in src.
4. Document real super_admin bootstrap in the frontend README, linking the existing backend procedure.

Do not add server-side layout authentication, profile requests, new cookies, role rules, storage formats, broad logout or backend changes. The existing layout remains client-only.

## Boundaries and risks

- Known old sessions become invalid; arbitrary forged localStorage is not newly authenticated or prevented by this change.
- Do not blacklist the old credential pair at the UI: if Nest genuinely accepts it, that is a real login. Human password rotation is separate.
- Shared-session changes affect other consumers; preserve real-session behavior and existing error/storage handling.
- Never reproduce the old credential values in these documents. Future regression fixtures belong only in test/.
- Security risk: item 2; shared session-reader preservation: item 3.
- A prior candidate's accepted missing verifier does not authorize omitting verification for this change.

## Review path

Read the [design](design.md), [login spec](specs/login.md), [session spec](specs/session-access.md), [scope spec](specs/source-and-scope.md), then [tasks](tasks.md).
