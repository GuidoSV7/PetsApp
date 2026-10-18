# Proposal: Fix 404 on admin pet-model upload

## Problem

Browser shows Nest `Cannot PUT /admin/pet-model` (404). That means the
running API has no matching verb+path — usually an old backend image, or
PUT+multipart being a fragile choice behind proxies.

## Solution

1. Expose **POST** `/admin/pet-model` as the primary upsert (multer-native).
2. Keep PUT as alias.
3. Add HTTP e2e so CI proves the route exists (401 without JWT, 200 with admin).
4. Depend on `multer` directly so production `npm ci --omit=dev` always has it.
5. Client switches to POST; map 404 to a clear redeploy hint.
