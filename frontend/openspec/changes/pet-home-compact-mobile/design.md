# Design: compact mobile

## Density tokens (`pet-layout.ts`)

```ts
PET_LAYOUT_MODE = "compact"
PET_LAYOUT = {
  petFrameMaxPx: 168,
  stageGapPx: 8,
  careMinHeightPx: 52,
}
```

Stage sets CSS variables from these tokens and `data-layout="compact"`.

## Structure changes

- Merge mood speech + Ánimo into the top of the pet card (drop separate mood card).
- Shrink pet frame (~168px), needs paddings, action tiles.
- Hint as a single compact line under the canvas.
- Home: header padding ↓; main padding ↓; `min-height: 100dvh` shell;
  main `flex: 1` without large bottom padding.

## Breakpoint

Default = compact (mobile-first). Slightly roomier from `min-width: 480px` only
if space allows, without reintroducing a tall scroll stack.
