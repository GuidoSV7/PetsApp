# Spec: seed super_admin

- Missing/blank `email`, `password`, or `name` → throw a clear Error (CLI exits 1).
- Password shorter than 8 characters → throw.
- First call with a free email creates a user with role `super_admin` and a hashed password (never stores plaintext).
- Second call with the same email returns `already_exists` and does not change the stored password or roles.
- Email is stored lower-cased and trimmed.
