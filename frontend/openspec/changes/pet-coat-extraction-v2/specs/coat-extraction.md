# Spec: coat extraction v2

- Solid mid-brown fill still maps primary close to that brown.
- Image with colored background edges and a distinct fur color in the center
  maps **primary** to the center fur color (not the edge background).
- Strong green (grass-like) backgrounds do not become primary when a warmer
  brown/orange subject occupies the center.
- Mid-dark grey fur is accepted (primary near that grey, not forced default).
- `cropCenterImageData` returns a smaller ImageData focused on the middle.
- Camera capture hint mentions centering the pet.
