# UI/UX and accessibility improvements

Branch `feat/ui-ux-a11y`, worktree `.worktrees/audit-ui-ux`. Source: 2026-11 audit
with web research (Engram `petsapp/audit/frontend-uiux`). Spanish UI copy in
Rioplatense voseo; identifiers/comments in English. Keep the current visual
identity (green/pet theme); improve, do not redesign from scratch. A parallel
security branch owns `src/stores/**`, `src/lib/**`, `src/app/_lib/**`,
`src/app/petsapp-api/**`, `src/app/admin/**`, `next.config.ts`, `src/proxy.ts`,
`src/features/auth/api/**` — do not edit those.

## Specs

- S1 Contrast: no text below WCAG 2.2 AA (4.5:1 normal, 3:1 large/UI). Add a
  text-safe primary token (e.g. `--primario-texto`) and use it wherever
  `--primario` (#3dff8a) is text on light surfaces; one error token
  (`--estado-error`) replaces the scattered hard-coded error colors. No text under
  12px; care-button labels/need labels/rename hint at least 0.8rem.
- S2 App Router boundaries: root `src/app/not-found.tsx` (branded, link home),
  `src/app/error.tsx` (client, retry via `reset`), `src/app/global-error.tsx`,
  and `loading.tsx` skeletons for `/` and `/account`. Spanish copy.
- S3 Keyboard access to the pet: a visible "Acariciar" control (button) next to the
  care actions triggers the same `onPetInteract` path as tapping the cat; the 3D
  canvas keeps its `role="img"` + aria-label.
- S4 Auth modal: initial focus on the first field, focus trap while open, focus
  restored to the opener on close, Escape keeps closing; the country picker becomes
  a native `<select>` (keep the same values).
- S5 Forms (auth modal and `/login`): show/hide password toggle (button with
  `aria-pressed` and label "Mostrar contraseña"/"Ocultar contraseña"); the password
  rule ("Mínimo 8 caracteres") is visible before submit and linked with
  `aria-describedby`; field-level errors with `aria-invalid` + `aria-describedby`;
  keep the banner `role="alert"` for server errors.
- S6 Notifications (`TopNotification`): close button with accessible label, pause
  on hover AND focus, default duration ~6s, progress animation via CSS instead of a
  per-frame React re-render.
- S7 Touch targets ≥ 24×24 CSS px (prefer 44) for `.coinAdd`, the pet-name edit
  button and every icon button on the home/pet screen.
- S8 Design tokens: replace hard-coded colors in `pet-home.module.css` and
  `home.module.css` with tokens in `globals.css`; remove the dead neon-landing CSS
  (`.hero*`, `.footer*`, `.tituloNeonCyan`, …) after confirming no usage.
- S9 Copy consistency: voseo everywhere in UI copy (e.g. "Indicá tu nombre completo"),
  accented country names ("México", "Perú").
- S10 `/account`: move inline styles to a CSS module using the tokens, and add an
  "Mi cuenta" link in the home header for signed-in users.
- S11 Pet-load failure on the home shows a prominent retry button and a
  `role="alert"` message instead of silently disabled actions.
- S12 Respect `prefers-reduced-motion` for every new animation.

## Tasks

| ID | Specs | Route | Commit |
| --- | --- | --- | --- |
| T1 | S1, S7, S8 | worker | |
| T2 | S2, S11 | worker | |
| T3 | S3, S6, S12 | worker | |
| T4 | S4, S5, S9 | worker | |
| T5 | S10 | worker | |

## Log

- L1 (user, verbatim): "Haceme una investigación exhaustiva de nuestro software, quiero que busques errores, problemas, vulnerabilidades, y mejores el diseño la UI/UX bsucanlas mejores prácticas en internet y hagamoslo que esté software sea el mejor posible"
- L2 (user, verbatim): "Todas haceme en worktrres paralelos las que puedas hacer"
- L3 (parent): research references from the audit: nextjs.org/docs/app/getting-started/error-handling, w3.org/WAI/WCAG22/Understanding/target-size-minimum, web.dev/articles/sign-up-form-best-practices, pauljadam.com/demos/canvas.html.
