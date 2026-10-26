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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
