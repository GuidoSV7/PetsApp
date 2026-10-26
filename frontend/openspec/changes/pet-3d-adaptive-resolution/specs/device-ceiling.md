# Device ceiling requirements

Prompt2-approved requirements; read [design](../design.md). No browser capability is a measured GPU score.

## S1 — Memory-first tier

User requirement, verbatim:
> Con `deviceMemory` disponible (solo navegadores basados en Chromium): hasta 2 GB → 1.25; hasta 4 → 1.5; más → 1.75.

For available positive memory hints, a pure maxDprForDevice selects <=2:1.25, >2 and<=4:1.5, >4:1.75 before the DPR clamp. Core count cannot lower or raise this branch.

Acceptance: memory0.5/1/2 at DPR3 gives1.25; memory2.01/4 gives1.5; memory8 gives1.75 with both cores2 and unknown. No navigator/window access in the pure function.

## S2 — Missing-memory fallback

User requirement, verbatim:
> Sin `deviceMemory` (Safari, Firefox): 1.5, salvo `hardwareConcurrency` de 2 o menos → 1.25. **No usar los núcleos como señal principal:** según [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency), el navegador puede informar menos núcleos de los que tiene.

At DPR3 and unavailable memory: known positive cores1/2 gives1.25; unknown or cores4/8 gives1.5. No UA-based browser classification. Unknown core count must not be interpreted as a slow two-core device.

## S3 — Clamp, quantization and client-only detection

User requirements, verbatim:
> Siempre: techo ≤ `devicePixelRatio`, ≥ 1, redondeado hacia abajo a múltiplos de 0.05.

> La detección del dispositivo corre solo en el cliente (el visor ya se carga sin SSR).

For reported DPR>=1, the output is the downward0.05 quantization of min(device tier,DPR), within[1,DPR]. Examples: memory8/DPR1→1; DPR1.37→1.35; DPR1.74→1.70; memory4/DPR1.49→1.45; memory2/DPR1.23→1.20. Exact ticks1.25/1.5/1.75 must stay unchanged. Do not round to the nearest tick.

Read hints only on the client at viewer initialization. Both existing ssr:false call sites remain unchanged. Separate injected hint inputs from navigator access so deterministic tests require no real device.

**Prompt2 human-approved exception**, verbatim:
> **`devicePixelRatio` < 1:** aprobado, el techo es 1. Agregá el caso a S3 como excepción aprobada por el humano.

Acceptance: DPR0.8 returns1 for either memory branch. This explicitly prioritizes the floor over <=reportedDPR below1; do not claim both original inequalities hold in this case.
