# Live quality requirements

Prompt2-authorized implementation; all state is per mounted viewer. Read [design](../design.md).

## S4 — Controlled initial ceiling and monitor configuration

Prompt2 replacement, verbatim:
> `Cat3DViewer` guarda la resolución elegida en estado, con el techo como valor inicial, y la pasa como número: `dpr={selectedDpr}`. Este es el patrón documentado de drei para `PerformanceMonitor`.

Canvas receives the selected NUMBER, initially maxDprForDevice(hints). PerformanceMonitor receives factor1, step0.15, bounds as a function returning[45,58], flipflops8. Camera, antialiasing and all lights remain unchanged. Capture real component props in tests; the obsolete tuple assertion is replaced, not preserved as a second renderer owner.

## S5 — Factor mapping and parent rerenders

Prompt2 requirements, verbatim:
> `onChange` actualiza el estado solo si cambia el valor cuantizado.
> Como el padre siempre pasa el valor elegido, un redibujado no lo pisa: se eliminan el driver de layout effect y el test de reconfiguración forzada del store.
> Mantené el test que confirma que un redibujado del padre (empezar y terminar la órbita) conserva la resolución elegida, también después del fallback.

Clamp factor to[0,1], map1+(ceiling-1)*factor, quantize downward to0.05 within[1,ceiling]. Ceiling1.75 factors0/.2/.4/.5/.55/.7/.85/1 give1/1.15/1.30/1.35/1.40/1.50/1.60/1.75. Outside factors clamp; ceiling1 stays1; ceiling1.5/factor.5→1.25; ceiling1.25/factor.5→1.10. Pin decimal boundaries against accidental floating-point tick loss without exceeding the cap.

Same quantized DPR means no state update, including repeated callbacks before React commits. Lower/increase through onChange, then orbit-start/end: numeric selected DPR persists and existing interaction/forwarding assertions hold. No per-frame state, renderer driver, useThree/setDpr adapter or forced-store-reconfiguration test.

## S6 — Synchronous fallback and vendor semantics

Prompt2 requirement, verbatim:
> El latch del fallback sigue igual: es síncrono, usa el último factor y no acepta cambios posteriores.

Derive final DPR from api.factor through the same mapping, apply and latch synchronously. Test onChange then onFallback before queued state commits; final callback factor wins, not a stale closure. Later change/fallback callbacks and orbit parent rerenders cannot change the selection. No forcing DPR1 or remounting the model. A new mount begins a new session.

Prompt2 preserves flipflops8. Installed drei condition flipped>8 triggers on the NINTH qualifying event; repeats/endpoints count, not only direction reversals. Do not alter dependencies/counter.

## S7 — Human-approved fixed shadow resolution 256

Prompt3 decision, verbatim:
> **Decisión humana:** comparé las capturas emparejadas y 256 se ve igual que 512. La sombra queda **fija en 256** y no hay cambio de escalón en vivo.

ContactShadows receives resolution={256} unconditionally. Keep position[0,-0.62,0], opacity0.28, scale3.4, blur2.6, far2.2, color#1c2b22, smooth and continuous frames unchanged. No shadow-tier mapper/state, threshold-crossing tests, allocation transitions or fallback shadow policy.

The required four Chromium captures were presented in Prompt2 and the owner selected fixed256 in Prompt3. Preserve those originals and record the decision; no automated visual verdict replaces it. Add an assertion RED against the current implicit512, then GREEN with explicit256 while asserting every other shadow prop unchanged. The final browser captures must show the production fixed256 shadow; adaptive-normal-stats-off.png is the declared final capture.

No hiding/freezing the moving production shadow, anatomy change or blur compensation.
