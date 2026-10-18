# Spec: Google auth + home gate

- `POST /auth/google` with a verified Google profile issues a session user + token.
- Unverified Google email is rejected (401/400).
- Unknown email creates a `member` and signs them in.
- Existing email signs in without creating a duplicate.
- Missing/invalid `GOOGLE_CLIENT_ID` configuration fails closed when verifying.
- Home without session does not render the pet stage (`Escenario de Michi`).
- Home with session renders the pet stage.
- Member post-login landing path is `/`.
