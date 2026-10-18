# Spec: global pet model

- Default meta kind is `procedural` with a finite `modelScale`.
- Saving a GLB buffer sets kind `glb`, persists bytes, returns meta with `fileUrl`.
- Clearing restores kind `procedural` and removes the file.
- Reject buffers over 12 MiB.
- Public meta endpoint is `@Public`.
- Admin write endpoints require admin role.
