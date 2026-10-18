# Proposal: better coat color capture

## Problem

`extractCoatColors` often misses the pet: wall/grass/sky dominate the
histogram, dark/grey fur is filtered out, and camera/gallery samples the full
frame without favoring the subject.

## Goal

Detect a usable fur palette (primary / secondary / accent) from typical phone
photos of a cat, even when the background is large or colorful.

## Scope

- Improve `extractCoatColors` (center bias, fur-like filters, secondary pick).
- Crop/center-weight camera capture before extract.
- Hint copy: center the pet in frame.
- Unit tests with synthetic scenes (subject + background).

## Out of scope

- ML / on-device segmentation models.
- Changing the 3D cat mesh.
