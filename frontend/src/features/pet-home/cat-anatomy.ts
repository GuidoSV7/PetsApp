/** Declarative sitting-cat parts for the procedural 3D Michi. */

export const CAT_MATERIAL_ROLES = [
  "primary",
  "secondary",
  "accent",
  "eye",
  "pupil",
  "whisker",
] as const;

export type CatMaterialRole = (typeof CAT_MATERIAL_ROLES)[number];

export type CatGeomKind = "sphere" | "cone" | "capsule" | "box" | "cylinder";

export type CatPart = {
  id: string;
  kind: CatGeomKind;
  role: CatMaterialRole;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  /** Arguments forwarded to the matching three.js geometry. */
  args: readonly number[];
};

/**
 * Sitting housecat facing +Z. Coordinates are local to the model root.
 * Tuned for feline silhouette: deep chest, high head, pointed ears, curl tail.
 */
export const CAT_ANATOMY: readonly CatPart[] = [
  // Torso — elongated loaf (deeper than tall)
  {
    id: "body",
    kind: "sphere",
    role: "primary",
    position: [0, 0.22, 0.02],
    scale: [1.12, 0.92, 1.38],
    args: [0.42, 36, 28],
  },
  {
    id: "chest",
    kind: "sphere",
    role: "secondary",
    position: [0, 0.18, 0.32],
    scale: [0.78, 0.72, 0.55],
    args: [0.34, 28, 24],
  },
  // Haunches
  {
    id: "hipL",
    kind: "sphere",
    role: "primary",
    position: [-0.22, 0.16, -0.22],
    scale: [0.85, 0.95, 0.9],
    args: [0.2, 20, 18],
  },
  {
    id: "hipR",
    kind: "sphere",
    role: "primary",
    position: [0.22, 0.16, -0.22],
    scale: [0.85, 0.95, 0.9],
    args: [0.2, 20, 18],
  },
  // Head + face
  {
    id: "head",
    kind: "sphere",
    role: "primary",
    position: [0, 0.78, 0.22],
    scale: [1.05, 0.95, 1.02],
    args: [0.34, 36, 28],
  },
  {
    id: "cheekL",
    kind: "sphere",
    role: "primary",
    position: [-0.2, 0.68, 0.38],
    scale: [0.7, 0.55, 0.55],
    args: [0.14, 18, 16],
  },
  {
    id: "cheekR",
    kind: "sphere",
    role: "primary",
    position: [0.2, 0.68, 0.38],
    scale: [0.7, 0.55, 0.55],
    args: [0.14, 18, 16],
  },
  {
    id: "muzzle",
    kind: "sphere",
    role: "secondary",
    position: [0, 0.62, 0.48],
    scale: [0.72, 0.5, 0.55],
    args: [0.16, 22, 18],
  },
  // Ears (outer + pink inner)
  {
    id: "earL",
    kind: "cone",
    role: "primary",
    position: [-0.2, 1.08, 0.14],
    rotation: [0.2, 0.15, -0.42],
    args: [0.13, 0.3, 5],
  },
  {
    id: "earInnerL",
    kind: "cone",
    role: "secondary",
    position: [-0.2, 1.04, 0.17],
    rotation: [0.2, 0.15, -0.42],
    scale: [0.55, 0.55, 0.55],
    args: [0.13, 0.3, 5],
  },
  {
    id: "earR",
    kind: "cone",
    role: "primary",
    position: [0.2, 1.08, 0.14],
    rotation: [0.2, -0.15, 0.42],
    args: [0.13, 0.3, 5],
  },
  {
    id: "earInnerR",
    kind: "cone",
    role: "secondary",
    position: [0.2, 1.04, 0.17],
    rotation: [0.2, -0.15, 0.42],
    scale: [0.55, 0.55, 0.55],
    args: [0.13, 0.3, 5],
  },
  // Eyes — large dark sclera + vertical slit pupils
  {
    id: "eyeL",
    kind: "sphere",
    role: "eye",
    position: [-0.11, 0.82, 0.5],
    scale: [1, 1.15, 0.7],
    args: [0.065, 18, 16],
  },
  {
    id: "eyeR",
    kind: "sphere",
    role: "eye",
    position: [0.11, 0.82, 0.5],
    scale: [1, 1.15, 0.7],
    args: [0.065, 18, 16],
  },
  {
    id: "pupilL",
    kind: "box",
    role: "pupil",
    position: [-0.11, 0.82, 0.55],
    scale: [0.35, 1.35, 0.45],
    args: [0.04, 0.04, 0.04],
  },
  {
    id: "pupilR",
    kind: "box",
    role: "pupil",
    position: [0.11, 0.82, 0.55],
    scale: [0.35, 1.35, 0.45],
    args: [0.04, 0.04, 0.04],
  },
  // Nose + mouth hint
  {
    id: "nose",
    kind: "cone",
    role: "accent",
    position: [0, 0.66, 0.58],
    rotation: [Math.PI / 2, 0, 0],
    args: [0.038, 0.05, 3],
  },
  {
    id: "philtrum",
    kind: "box",
    role: "accent",
    position: [0, 0.6, 0.57],
    scale: [0.2, 0.9, 0.3],
    args: [0.02, 0.04, 0.02],
  },
  // Whiskers
  {
    id: "whiskerL1",
    kind: "cylinder",
    role: "whisker",
    position: [-0.22, 0.64, 0.52],
    rotation: [0, 0, 1.35],
    args: [0.006, 0.006, 0.28, 6],
  },
  {
    id: "whiskerL2",
    kind: "cylinder",
    role: "whisker",
    position: [-0.24, 0.6, 0.5],
    rotation: [0, 0, 1.55],
    args: [0.006, 0.006, 0.3, 6],
  },
  {
    id: "whiskerR1",
    kind: "cylinder",
    role: "whisker",
    position: [0.22, 0.64, 0.52],
    rotation: [0, 0, -1.35],
    args: [0.006, 0.006, 0.28, 6],
  },
  {
    id: "whiskerR2",
    kind: "cylinder",
    role: "whisker",
    position: [0.24, 0.6, 0.5],
    rotation: [0, 0, -1.55],
    args: [0.006, 0.006, 0.3, 6],
  },
  // Curled tail (base → tip along the right side)
  {
    id: "tailBase",
    kind: "capsule",
    role: "primary",
    position: [0.38, 0.28, -0.28],
    rotation: [0.55, 0.85, 0.35],
    scale: [0.85, 0.85, 0.85],
    args: [0.08, 0.28, 4, 10],
  },
  {
    id: "tailMid",
    kind: "capsule",
    role: "primary",
    position: [0.52, 0.48, -0.18],
    rotation: [-0.35, 0.4, 0.9],
    scale: [0.75, 0.75, 0.75],
    args: [0.07, 0.26, 4, 10],
  },
  {
    id: "tailTip",
    kind: "capsule",
    role: "primary",
    position: [0.42, 0.68, 0.02],
    rotation: [-1.1, 0.1, 0.5],
    scale: [0.65, 0.65, 0.65],
    args: [0.055, 0.2, 4, 10],
  },
  // Front legs + paws
  {
    id: "legFL",
    kind: "capsule",
    role: "primary",
    position: [-0.16, -0.02, 0.28],
    rotation: [0.15, 0, 0.08],
    args: [0.07, 0.16, 3, 10],
  },
  {
    id: "legFR",
    kind: "capsule",
    role: "primary",
    position: [0.16, -0.02, 0.28],
    rotation: [0.15, 0, -0.08],
    args: [0.07, 0.16, 3, 10],
  },
  {
    id: "pawFL",
    kind: "sphere",
    role: "primary",
    position: [-0.16, -0.22, 0.34],
    scale: [1.1, 0.7, 1.2],
    args: [0.1, 16, 14],
  },
  {
    id: "pawFR",
    kind: "sphere",
    role: "primary",
    position: [0.16, -0.22, 0.34],
    scale: [1.1, 0.7, 1.2],
    args: [0.1, 16, 14],
  },
  {
    id: "padFL",
    kind: "sphere",
    role: "accent",
    position: [-0.16, -0.26, 0.38],
    scale: [0.7, 0.4, 0.7],
    args: [0.05, 12, 10],
  },
  {
    id: "padFR",
    kind: "sphere",
    role: "accent",
    position: [0.16, -0.26, 0.38],
    scale: [0.7, 0.4, 0.7],
    args: [0.05, 12, 10],
  },
  // Back paws tucked under
  {
    id: "pawBL",
    kind: "sphere",
    role: "primary",
    position: [-0.24, -0.18, -0.18],
    scale: [1.15, 0.75, 1.25],
    args: [0.11, 16, 14],
  },
  {
    id: "pawBR",
    kind: "sphere",
    role: "primary",
    position: [0.24, -0.18, -0.18],
    scale: [1.15, 0.75, 1.25],
    args: [0.11, 16, 14],
  },
] as const;

export function getCatPart(id: string): CatPart | undefined {
  return CAT_ANATOMY.find((part) => part.id === id);
}
