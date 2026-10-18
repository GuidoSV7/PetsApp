# Proposal: Client loads global admin GLB

## Problem

Diseño 3D confirm only writes IndexedDB on the admin device.

## Solution

- Confirm uploads to `PUT /admin/pet-model` (and scale-only updates).
- Home `PetHomeStage` loads `GET /pet/model` and uses `fileUrl` for all users.
- `/login` tries Nest login with bootstrap credentials so admin JWT works for PUT.
