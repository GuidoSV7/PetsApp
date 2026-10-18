# Spec: Google coming soon

- Without a Google client id, the sign-in control is a disabled button labelled
  Próximamente that includes a Google icon.
- The control does not expose `NEXT_PUBLIC_GOOGLE_CLIENT_ID` or other env names.
- With a client id configured, the live Google Identity Services button is used.
