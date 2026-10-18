# Design: Google coming-soon button

## Behavior

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` empty/missing → render a non-interactive button:
  Google glyph + “Próximamente”, muted gray styles, `disabled`, `aria-disabled`.
- Key present → keep current GIS `renderButton` flow.
- Do not surface env var names in the UI.

## Placement

Same slot as today’s `GoogleSignInButton` on the Nest home gate.
