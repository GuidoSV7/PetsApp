# Spec

- Unauthenticated POST `/admin/pet-model` returns **401** (not 404).
- Admin JWT + multipart `modelScale` (+ optional `file`) returns **200** with kind `glb` or scale update.
- PUT hits the same handler as POST.
- Frontend upload client uses POST.
