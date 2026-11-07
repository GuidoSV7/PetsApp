#!/usr/bin/env bash
# Optimiza un .glb animado para web con glTF-Transform (Meshopt + WebP 512 + resample).
# Uso: scripts/optimize-glb.sh input.glb output.opt.glb [texture-size] [--no-simplify]
# Requiere: npm i -D @gltf-transform/cli@4.5.1  (o npx)
set -euo pipefail

IN="${1:?input.glb}"
OUT="${2:?output.glb}"
TEX="${3:-512}"
SIMPLIFY_FLAG="${4:-}"

GT="npx --yes @gltf-transform/cli@4.5.1"

echo "== Antes =="
$GT inspect "$IN"
$GT validate "$IN"

SIMPLIFY_ARGS=(--simplify-error 0.0001)
if [[ "$SIMPLIFY_FLAG" == "--no-simplify" ]]; then
  SIMPLIFY_ARGS=(--no-simplify)
fi

$GT optimize "$IN" "$OUT" \
  --compress meshopt --meshopt-level high \
  --texture-compress webp --texture-size "$TEX" \
  "${SIMPLIFY_ARGS[@]}" \
  --no-join

echo "== Después =="
$GT inspect "$OUT"
$GT validate "$OUT"

printf "\nTamaño: %s -> %s (gzip %s)\n" \
  "$(du -h "$IN" | cut -f1)" \
  "$(du -h "$OUT" | cut -f1)" \
  "$(gzip -9c "$OUT" | wc -c | awk '{printf "%.1f kB", $1/1024}')"
