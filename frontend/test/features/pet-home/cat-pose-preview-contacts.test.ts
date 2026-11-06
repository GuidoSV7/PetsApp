import { expect, it } from "vitest";
import { CatPoseRenderer, type CatPoseRenderInputs } from "@/features/pet-home/cat-pose-renderer";
import { CAT_POSES } from "@/features/pet-home/cat-pose-data";
import { needVisualCues } from "@/features/pet-home/need-visuals";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";
import { poseScene } from "./cat-pose-fixture";
import { measureRenderedContactDomain } from "./cat-pose-rendered-contact-domain";

const inputs = (): CatPoseRenderInputs => ({ cues: needVisualCues(PREVIEW_PET_NEEDS), reducedMotion: false, reactPulse: 0 });
const preview = (progress: number) => ({
  pose: "seated" as const, definition: CAT_POSES.seated, breathing: true, reducedMotion: false,
  showHidden: false, contacts: true, selectedJoint: null,
  transition: { from: "seated" as const, to: "standing" as const, progress, playing: false },
});

// T7 defect (S41/L188): the admin preview hides forearm/shin extension bits the
// gameplay route keeps visible, so fitted limb boxes separate from their
// neighbours mid-transition. The rendered structural chain must stay closed at
// the S25 gate (≤ .001) wherever the same route is clean in gameplay.
it("keeps every rendered structural contact closed through the preview seated→standing transition", () => {
  const rig = poseScene(0);
  const renderer = new CatPoseRenderer(rig.skeleton, rig.joints, rig.boxes, inputs(), 0);
  for (const progress of [.05, .1, .2, .3, .4, .5, .6, .7, .8, .9, .96]) {
    renderer.synchronize({ ...inputs(), posePreview: preview(progress) });
    renderer.render(0);
    const gaps = measureRenderedContactDomain(rig).contacts
      .filter(contact => contact.kind === "structural" && contact.distance > .001)
      .map(contact => ({ link: contact.parent + "/" + contact.child, distance: contact.distance, via: contact.via }));
    expect(gaps, "progress " + progress).toEqual([]);
  }
}, 30_000);
