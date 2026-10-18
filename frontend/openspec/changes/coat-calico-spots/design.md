# Design: calico-aware coat extract

1. Keep fur candidate filter (drop sky/grass, near-white/black extremes).
2. Weight = center falloff × shadow penalty (lum < ~50) × chroma boost (sat).
3. Primary = top mid-luminance bucket when a non-dark alternative has enough weight;
   otherwise top bucket (solid dark cats still work).
4. Secondary = next distinct color (distance gate).
5. Accent = most saturated leftover distinct color (spots / nose), else pink fallback.
