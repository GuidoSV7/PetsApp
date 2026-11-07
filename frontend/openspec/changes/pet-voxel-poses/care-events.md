# Successful-care and preview boundary

`PetHomeStage` forwards optional `{ sequence, action }` care events to the existing
Viewer only after the existing successful `await applyPetAction` and `applyState`.
The sequence increases within that mounted Stage. Feed, play, sleep and bathe are
care events; petting retains its existing purr/pulse feedback without emitting one.
HTTP/network errors and legacy `broke` responses do not consume a sequence or emit
an event. Stage remount starts without an event inferred from persisted pet state.

The existing API, coins callback, busy/error behavior and play pulse are preserved.
No store, route, authentication or transport change is introduced. When Freighter
resumes, merge main with a merge commit (no rebase) and keep this emission after
its owner/epoch validity checks.

Viewer also declares the optional `CatPosePreview`/borrowed diagnostics contract in
`cat-pose-preview.ts`; null diagnostics mean unmeasured, not a passed contact gate.
These declarations and Stage emission do **not** implement visual consumption.
The runtime consumer must process each new sequence once, avoid Model-remount
replay, absorb only the matching new play pulse, and still accept a later pet pulse.
The actual renderer/plate/preview/contact integration is a separate pending unit.

Focused Stage tests inspect the public forwarded props and preserved side effects;
they do not prove actual A2 animation. The initial worker's missing contemporaneous
RED source identity is recorded in `renderer.md`; subsequent passing gates cannot
retroactively supply it.
