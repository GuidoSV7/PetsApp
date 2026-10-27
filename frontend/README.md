This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin login and first super_admin

`/login` uses the real Nest login. Only a successful response with the `admin`
or `super_admin` role creates an admin session; a rejected request or network
failure shows an error without a local fallback.

To create the first `super_admin`, follow the existing
[backend seed procedure](../backend/README.md#seed-the-first-super_admin-no-ui):

1. From `backend/`, complete the documented database configuration and migrations
   (`DATABASE_URL` and `npm run db:migrate`), then run `npm run build`.
2. Supply `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` through your secure
   environment, using real credentials that are **never committed**.
3. Run `npm run seed:admin` from `backend/`, then sign in at `/login`.

The seed skips an existing email without changing its user, role or password.
It is not a password-rotation command. If production was seeded with the retired
public credentials, a human must separately review and rotate the affected
super_admin password. Removing the browser shortcut does not rotate passwords;
no production seed, credential change or deployment is performed by this change.

### Authentication boundary

The admin layout is a **client-only UI gate**: it reads localStorage and checks
its role. It does not authenticate the token server-side or request
`/auth/profile`, and localStorage can be forged. Nest authentication and role
guards protect API data; the layout is not a data-security boundary. Nest login,
session-cookie handling and roles remain unchanged.

Known retired local sessions are treated as invalid through the shared session
reader under either existing storage key, without deleting or rewriting their
stored bytes. Real sessions retain their existing behavior.

Follow-up, not implemented here: validate the layout session against
`/auth/profile` instead of relying only on localStorage.

## Free pet care

Feeding, playing, sleeping, bathing, petting and every rename are free.
New pets start with zero coins; existing balances remain unchanged. Both home
variants hide the coin counter and add affordance, while keeping the API `coins`
field and balance propagation for the future store. The reusable `CoinBalance`
component remains available but is not mounted by `HomeHeader`.

A legacy `broke` status on GET is presented as neutral (`idle`) without writing
pet state. A legacy `broke` POST response is rejected by the API client and uses
the existing save-error UI, never successful care or rename feedback. Free care
requires the updated backend; the client does not simulate successful writes or
bypass backend validation.

## Voxel viewer FPS diagnostics

The viewer starts at a client-device DPR ceiling and adapts its numeric Canvas
DPR using drei PerformanceMonitor. On fallback it keeps the final selected
quality for that mounted viewer; a reload begins a new session.

Append `?pet3dStats=1` to the existing home or Diseño 3D URL (use
`&pet3dStats=1` if it already has query parameters), then reload to show the
existing drei FPS panel. It is absent by default, including production; only
the exact value `1` enables it. Remove the parameter and reload to disable it.
The local overlay does not intercept orbit/tap input and adds no dependency.

For low-end Android and iPhone checks, record device/browser, viewport,
battery/thermal conditions and reduced-motion preference. Observe startup and
at least 30 seconds of settled foreground FPS, then orbit/tap and check the
shadow. Repeat with reduced motion and the admin preview. FPS instrumentation
adds overhead and is not GPU timing or proof of a specific bottleneck.
Phone results must be recorded by the human tester, not inferred from server
or software-rendered Chromium performance.

Contact shadows use fixed resolution 256, selected by the human after paired
512/256 captures looked equivalent. Other shadow settings stay unchanged;
there are no live shadow tiers or factor thresholds.

## Voxel coat patterns

The home presets include solid Gris/Blanco/Naranja, Atigrado (`tabby`),
Calicó (`calico`), Esmoquin (`tuxedo`) and Siamés (`pointed`). Pattern boxes
are direct children of the original voxel meshes. A1 retains all33 original
visible boxes and adds six explicitly hidden boxes; needs/idle behavior,
admin design settings and adaptive/shadow policies are unchanged.
Tabby uses12 boxes and derives stripe RGB with `round(channel * 0.50)`
after the existing dirt mix; accent colors are not dirt-mixed. Calico uses4
larger asymmetric boxes representing three logical spots, without thin body
or face-side bars. Tuxedo/pointed use8/12 boxes; the hard ceiling is12.

Pet-state reads normalize missing or unknown `coat.pattern` to `solid`.
Preset writes include an explicit pattern; camera/photo writes include only
three colors and preserve the saved backend pattern. Preset selection checks
both primary color (case-insensitive) and pattern.

See the [pattern design](openspec/changes/pet-voxel-coat-patterns/design.md)
for the patch layout and color contracts.

**Backend compatibility:** pattern writes require backend `coat.pattern`
support. The frontend's `solid` read fallback does not add backend support;
older backends reject pattern writes.

## A1 voxel skeleton

Each original/new box is owned by a mesh-free, unit-scale joint; visual
scale stays on boxes. The22-joint hierarchy has three empty accessory anchors.
Forearms, shins, jaw and tongue are present but hidden, with no A1 toggle.
Static box binds are compiled only when admin/resolved needs change. Idle
rotates ear/tail joints and applies separate blink scales to eyes/pupils;
it never solves a legacy animated world per frame. The A1 rest-offset
compensation preserves independent legacy limbs; A2 will decide whether
limbs follow the body. Existing mesh-tree helpers and default frame callers
retain their contracts. See [A1 design](openspec/changes/pet-voxel-skeleton/design.md).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
