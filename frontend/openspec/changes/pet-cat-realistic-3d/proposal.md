# Proposal: more realistic 3D Michi

## Problem

The procedural cat is a blunt sphere/cone stack. It reads as a toy blob, not a
housecat, even when coat colors are correct.

## Goal

Keep a procedural, coat-tintable model (no external GLTF dependency) but with
feline proportions: sitting body, pointed ears, muzzle, slit pupils, whiskers,
segmented tail, and fur-like materials.

## Scope

- Declarative `cat-anatomy` parts (unit-tested).
- Rebuild `Cat3DModel` from that anatomy.
- Slight lighting/camera polish in `Cat3DViewer`.
- Preserve orbit, purr tap, bounce, `yawBias`, coat palette.

## Out of scope

- Photoreal fur shaders / GLTF downloads.
- Changing care API or home chrome.
