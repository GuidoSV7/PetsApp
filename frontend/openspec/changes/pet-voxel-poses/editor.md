# Admin pose editor (T4b)

## Entry point and local scope

Open the existing `/admin/design-3d` page, then expand **Poses y transiciones**.
The existing admin guard and route are unchanged. The disclosure starts closed,
so the original four model sliders, preview hint, save and reset behavior remain
unchanged. Those four model settings still use the existing browser-local design
storage; none of the new controls writes storage, gameplay needs, or an API.
Closing the disclosure preserves the current draft until the page unmounts.

There is one dynamically loaded **Cat3DViewer**, not a second canvas or editor
animation. The page passes the original design draft unchanged. CatPoseEditor
supplies the frozen `CatPosePreview` contract plus local coat/need overrides.
The renderer owns graph routing, playback, local pivot overlay and actual motion.

## Controls

- Choose one of seven presets. Each preset keeps all 22 local XYZ degree triplets,
  visibility and support metadata. **Volver a sentado** resets only the pose.
- Select X, Y or Z; exactly one slider for each of the 22 exact joint IDs edits
  that component. Other components remain intact. Focusing/editing a slider
  forwards its joint ID for the renderer's pivot/local-frame overlay.
- Root height edits only root Y; heading is a separate **unwrapped** number
  (for example 730°, never normalized to 10°).
- From/to, play/pause and scrub forward transition inputs to the shared renderer.
  Scrubbing pauses playback. Choosing a preset clears the transition override.
  There is no UI animation clock. On an explicit Pause, the latest borrowed
  whole-route progress becomes the paused scrub value; with no measurement it
  retains the last request. Polling never advances animation or overwrites poses.
- Hunger 0–100, five existing coat patterns, breathing, reduced motion, hidden
  pieces and contact diagnostics are preview-local. Existing colors and coat
  recipes are reused. None is a new persisted morphology or gameplay setting.
  Reduced motion initially follows the live system preference; an explicit
  checkbox change overrides it only for this mounted preview, without storage.

Diagnostics borrow a stable mutable output object. A 250 ms UI poll exists only
while the disclosure and contact diagnostics are open; closing/unmounting clears
it. Null metrics read **sin validar**, never a manufactured zero or green pass.
Until a renderer sample arrives, progress reads **sin comprobar**. Numeric results
are observations, not contact or CPU acceptance certificates.

## Copy format

**Copiar pose TypeScript** is the only clipboard trigger; success and failure
have separate feedback. The pure `exportCatPose(definition)` function returns a
readable, deterministic object literal, valid as a TypeScript expression:

```ts
const pose = {
  "schemaVersion": 1,
  // id, label, all 22 rotationDeg triplets, rootOffset, headingDeg,
  // visibleParts and supports are emitted, with no omitted zero entries.
};
```

Actual output contains complete data, not the illustrative comments above.
Degree vectors stay on individual lines, numbers are not rounded, and labels
are escaped. Root XYZ, unwrapped heading and all visibility/support metadata
survive export. No timestamp, random ID, quaternion-only representation, network
publication or automatic clipboard write is introduced. Paste the literal into
versioned pose data for ordinary review; this UI does not publish it.

## Evidence boundary and remaining gates

Focused React tests mock the dynamic Viewer boundary and assert forwarded props,
local state, clipboard feedback and preservation of the four stored settings.
Exporter tests parse the literal as TypeScript and round-trip its complete data.
These checks are **not browser, WebGL, contact, screenshot or animation proof**.
The parent owns real-renderer integration, browser/owner videos, full suite,
global types/lint/build, baseline differential and independent verification.
Initial pose catalog values and editor limits are not validated physical poses.

S9's event seam belongs to the renderer/Stage unit, not this editor. For the PR:
when Freighter resumes, merge `main` into `feat/freighter-user-pet` using a merge
commit (no rebase); care-event emission stays behind its owner/epoch checks.
This unit does not change Stage, authentication, routes, APIs or that paused branch.
