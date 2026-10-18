# Design: need visuals on Michi

## UI

- Delete `needsGrid` / `NeedMeter` usage from `PetHomeStage`.
- Care buttons + personalize strip unchanged.
- Mood line + speech bubble remain.

## Cue module (`need-visuals.ts`)

Threshold `NEED_LOW_THRESHOLD = 45` (strictly below = low).

| Need low | Visual |
|----------|--------|
| hunger   | Body / chest scale slims (`bodySlim` < 1) |
| fun      | Ears rotate/droop (`earDroop`) |
| energy   | Head lowers, slower/weaker idle bob (`headDroop`, `idleAmp`, `idleSpeed`), pupils shrink |
| hygiene  | Primary/secondary coat mixes toward dirt brown (`dirtMix`) |

`needVisualCues(needs)` → pure cues object.  
`applyNeedVisualsToAnatomy(parts, cues)` → adjusted `CatPart[]`.  
`describeNeedVisuals(cues)` → short Spanish hint for `aria-label`.

## Wiring

- `PetHomeStage` passes `needs` into `Cat3DViewer` → `Cat3DModel`.
- Model applies anatomy + palette + idle motion from cues (on top of admin
  design tunables).
- Stage root exposes `data-hunger-low` / `data-fun-low` / `data-energy-low` /
  `data-hygiene-low` (`"true"` | `"false"`) for tests without meters.
