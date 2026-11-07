/** Shared, renderer-free authoring and simulation contracts. No runtime state. */
export type PoseVec3 = readonly [number, number, number];
export type PoseQuaternion = readonly [number, number, number, number];
export type CatPoseId = "seated" | "standing" | "loaf" | "sphinx" | "side" | "curled" | "bellyUp";
export type CatLegId = "FL" | "FR" | "BL" | "BR";
export type CatJointId = `joint-${
  | "root" | "torso" | "neck" | "head" | "jaw" | "earL" | "earR"
  | "shoulderFL" | "elbowFL" | "wristFL" | "shoulderFR" | "elbowFR" | "wristFR"
  | "hipBL" | "kneeBL" | "ankleBL" | "hipBR" | "kneeBR" | "ankleBR"
  | "tailBase" | "tailMid" | "tailTip"}`;
export type CatExtensionId = "forearmFL" | "forearmFR" | "shinBL" | "shinBR" | "jaw" | "tongue";

export type CatPoseDefinition = {
  readonly id: CatPoseId;
  readonly label: string;
  /** Local XYZ degree deltas from the resolved rigid A1 rest bind. */
  readonly rotationDeg: Readonly<Record<CatJointId, PoseVec3>>;
  readonly rootOffset: PoseVec3;
  /** Unwrapped yaw, independent of the root roll/pitch quaternion. */
  readonly headingDeg: number;
  readonly visibleParts: readonly CatExtensionId[];
  readonly supports: readonly CatLegId[];
};

export type CompiledCatPose = {
  readonly id: CatPoseId;
  readonly rotations: Readonly<Record<CatJointId, PoseQuaternion>>;
  readonly rootOffset: PoseVec3;
  readonly headingDeg: number;
  readonly visibleParts: readonly CatExtensionId[];
  readonly supports: readonly CatLegId[];
};

export type CatPoseWaypoint = {
  readonly at: number;
  readonly rotationDeg?: Readonly<Partial<Record<CatJointId, PoseVec3>>>;
  readonly rootOffset?: PoseVec3;
};
export type CatPoseEdge = {
  readonly from: CatPoseId;
  readonly to: CatPoseId;
  readonly durationTicks: number;
  readonly easing: "smoothstep" | "smootherstep";
  readonly waypoints: readonly CatPoseWaypoint[];
};

export type SupportChainInput = {
  readonly root: PoseVec3;
  readonly target: PoseVec3;
  /** World-space point toward which the elbow/knee bends. */
  readonly pole: PoseVec3;
  readonly upperLength: number;
  readonly lowerLength: number;
  readonly maxReach?: number;
};
export type SupportChainSolution = {
  readonly knee: PoseVec3;
  readonly foot: PoseVec3;
  readonly footQuaternion: PoseQuaternion;
  readonly reachable: boolean;
  readonly error: number;
};

export type CatCareAction = "feed" | "play" | "sleep" | "bathe";
export type CatCareEvent = { readonly sequence: number; readonly action: CatCareAction };
