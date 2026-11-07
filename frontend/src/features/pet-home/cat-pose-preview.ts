import type { CatJointId, CatPoseDefinition, CatPoseId } from "./cat-pose-types";

/** Borrowed live diagnostics: null means unmeasured, never a manufactured pass. */
export type CatPoseDiagnostics = {
  tick: number;
  transitionProgress: number;
  plantedFeet: number;
  unreachableFeet: number;
  maxFootDrift: number | null;
  maxFootDriftPx: number | null;
  maxSeamGap: number | null;
  maxFloorPenetration: number | null;
  /** All fixed ticks + interpolation + rig/support IK + node copying this frame. */
  cpuMs: number;
};

/** Frozen contract shared by independent renderer/editor units. Preview-only. */
export type CatPosePreview = {
  readonly pose: CatPoseId;
  readonly definition: CatPoseDefinition;
  readonly transition?: {
    readonly from: CatPoseId;
    readonly to: CatPoseId;
    readonly progress: number;
    readonly playing: boolean;
  };
  readonly breathing: boolean;
  readonly reducedMotion: boolean;
  readonly showHidden: boolean;
  readonly contacts: boolean;
  readonly selectedJoint: CatJointId | null;
  /** Caller polls outside useFrame; renderer only mutates a stable output object. */
  readonly diagnostics?: { current: CatPoseDiagnostics | null };
};
