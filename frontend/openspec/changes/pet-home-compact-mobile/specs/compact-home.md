# Spec: compact home

- `PET_LAYOUT_MODE` is `"compact"`.
- `PET_LAYOUT.petFrameMaxPx` is ≤ 180.
- `PetHomeStage` root exposes `data-layout="compact"`.
- Stage applies CSS vars `--pet-frame-max` and `--stage-gap` from `PET_LAYOUT`.
- Mood copy still appears (speech + Ánimo) without a separate full mood card section label requirement — speech and Ánimo remain in the document.
- Care actions and need meters remain present.
