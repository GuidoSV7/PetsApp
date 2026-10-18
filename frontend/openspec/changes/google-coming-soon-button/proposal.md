# Proposal: Google “Próximamente” placeholder

## Problem

Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, the home gate shows a raw red env error.
That looks broken and leaks config details to users.

## Solution

When Google is not configured, show a disabled gray button with the Google icon
and the label **Próximamente**. Email/password remains available.
