# Spec: coat colors

- Default coat is grey (`DEFAULT_GREY_COAT`).
- `extractCoatColors(imageData)` ignores near-white/near-black samples.
- Given a synthetic image filled with a mid brown, primary is close to that brown.
- Given two distinct mid colors (majority / minority), primary tracks majority
  and secondary tracks minority.
- Pet stage exposes a control to open the camera color flow.
- After applying colors, status text reflects the custom coat.
