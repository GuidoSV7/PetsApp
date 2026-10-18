# Proposal: Global pet 3D model for all users

## Problem

Admin Diseño 3D stores the GLB in the browser (IndexedDB). Only that device
sees the custom mesh; every other user still gets the procedural cat.

## Solution

Persist one global pet model on the API:

- Public `GET /pet/model` (+ file stream) so every home client loads the same mesh.
- Admin `PUT /admin/pet-model` / `DELETE` to confirm or clear the model.
- Store file + metadata on disk (`PET_MODEL_DIR`); no per-user pet row changes.
