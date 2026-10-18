# Spec: global model client

- `resolvePetModelFileUrl(meta, baseUrl)` returns absolute URL when kind is glb.
- Confirming design calls the admin upload API.
- Home uses the public meta file URL for `Cat3DViewer.modelUrl`.
- Login prefers Nest session for bootstrap credentials when the API accepts them.
