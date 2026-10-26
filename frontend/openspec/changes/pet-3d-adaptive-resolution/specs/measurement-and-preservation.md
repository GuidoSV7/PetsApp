# Measurement, preservation and authorization

Implementation authorized by Prompt2 with mandatory shadow checkpoint; read [design](../design.md).

## S8 — Opt-in phone FPS inspection

User requirement, verbatim:
> **Medición en celulares reales:** proponé una forma de ver los fotogramas por segundo en un celular sin agregar dependencias (por ejemplo, el `Stats` de drei detrás de un parámetro de URL). Si va en producción, que esté apagado por defecto. Una persona va a probar en un Android de gama baja y en un iPhone.

Propose the exact query parameter pet3dStats=1. Absent,0,false or other values leave the overlay unmounted; only1 enables the existing drei Stats FPS panel. Apply at client mount/reload, on either existing viewer page. Document enabling/disabling in frontend/README.md during implementation.

Use a local overlay parent with pointer-events:none. No navigation/action interception, extra render loop, telemetry, persisted flag or direct new stats dependency. Unmount must remove the panel and loop subscriptions through the vendor cleanup.

Future tests: default-off, exact opt-in, non-enabling values, cleanup and preserved pointer interaction. Real browser checks actual nonblank WebGL output and overlay visibility/cleanup. A human records Android/iPhone foreground startup/settled FPS, device/browser, reduced-motion setting and shadow appearance. No phone result, GPU duration or target FPS is claimed before measurement.

## S9 — Preserve the viewer and both callers

User requirements, verbatim:
> Anatomía, jerarquía, movimiento en reposo, cámara, controles de órbita, luces, home, Diseño 3D, acciones e interacciones.

> el movimiento reducido y las interacciones no cambian.

Keep Cat3DModel, anatomy/tree/idle/frame helpers, useReducedMotion, home/admin callers and their services unchanged. Quality components must not remount the model on factor changes or fallback. Reduced mode continues its existing blinking-only idle policy and intentional tap bounce; there is no new frameloop policy.

Retain all existing viewer forwarding/camera/orbit assertions, changing only the old fixed-cap expectation. Test orbit-start/end, tap callback, needs/design/colors/yaw/reactPulse forwarding, quality changes and fallback together. Run existing anatomy/contact/tree/idle/frame/connection, reduced-motion, pet-home and admin-design-settings tests as controls.

A public-behavior baseline comparison must show no unrequested differences in these interactions/props; only documented DPR, shadow sampling quality and opted-in diagnostics may differ. Browser checks normal/reduced mode and home/admin preview with isolated state, without production operations.

## S10 — Dependencies, proof and authorization

User requirements, verbatim:
> Sin dependencias nuevas.

> **No implementes todavía.** Seguimos ODD + TDD + RDD.

> Sin commits. Cuando los haya: Conventional Commits, sin `Co-authored-by` ni "Generated with…".

The quotations above preserve Prompt1 history; Prompt2 now authorizes implementation AFTER these document adjustments and assertion RED against the existing tuple. It does not authorize commits, merge or push. The complete24path inventory is in design before source writes; local runners/raw logs are explicitly excluded.

Prompt2 candidate-specific decision, verbatim:
> **Decisión humana para este candidato:** el verificador independiente queda sin ejecutar (su perfil aísla `HOME` contra las reglas del VPS). Registralo como limitación, sin presentarlo como aprobado.
> Si el RDD se bloquea, pará y reportá.

Independent verifier remains UNEXECUTED / NOT APPROVED; do not launch it or inherit a different candidate's receipt. The S7 screenshot stop was obeyed and Prompt3 selected fixed256. Full focused/controls/suite/tsc/build/differential and real-browser checks are now authorized. Phone testing is deferred to a human; review.md must contain the ready-to-follow procedure, not an invented phone result. Native RDD follows complete verification and must stop/report on any block.

Structural planning validation proves file/link/spec/task/scope consistency only. It cannot prove FPS, visual equivalence, fallback behavior or mobile performance.
