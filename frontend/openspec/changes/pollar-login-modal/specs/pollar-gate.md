# Spec: Pollar login gate

- With Pollar configured, home without auth shows a dialog labelled for login
  with Google and Freighter options.
- Choosing Google calls Pollar login with provider `google`.
- Choosing Freighter calls Pollar login with Freighter wallet type.
- When Pollar reports authenticated, the pet stage is visible and the gate is not.
- Logout clears the Pollar session and returns to the gate.
