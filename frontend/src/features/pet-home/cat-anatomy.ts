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

export type CatGeomKind = "box";

export type CatPart = {
  id: string;
  kind: CatGeomKind;
  /** Parent ID; base positions remain in model-world rest coordinates. */
  parent?: string;
  role: CatMaterialRole;
  position: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: readonly [number, number, number];
  /** Box width, height and depth. */
  args: readonly [number, number, number];
};

/** Box-only sitting cat facing +Z; immutable rest coordinates, runtime transforms separate. */
export const CAT_ANATOMY: readonly CatPart[] = [
  {id: "body", kind: "box", role: "primary", position: [0.0, 0.2, -0.02], args: [0.62, 0.5, 0.78]},
  {id: "chest", kind: "box", role: "secondary", position: [0.0, 0.2, 0.39], args: [0.4, 0.36, 0.04], parent: "body"},
  {id: "hipL", kind: "box", role: "primary", position: [-0.27, 0.0, -0.22], args: [0.2, 0.38, 0.3]},
  {id: "hipR", kind: "box", role: "primary", position: [0.27, 0.0, -0.22], args: [0.2, 0.38, 0.3]},
  {id: "head", kind: "box", role: "primary", position: [0.0, 0.7, 0.2], args: [0.56, 0.5, 0.5]},
  {id: "cheekL", kind: "box", role: "primary", position: [-0.31, 0.62, 0.3], args: [0.08, 0.14, 0.2], parent: "head"},
  {id: "cheekR", kind: "box", role: "primary", position: [0.31, 0.62, 0.3], args: [0.08, 0.14, 0.2], parent: "head"},
  {id: "muzzle", kind: "box", role: "secondary", position: [0.0, 0.6, 0.47], args: [0.26, 0.14, 0.06], parent: "head"},
  {id: "earL", kind: "box", role: "primary", position: [-0.18, 1.0, 0.14], args: [0.16, 0.18, 0.08], parent: "head"},
  {id: "earInnerL", kind: "box", role: "secondary", position: [-0.18, 1.01, 0.185], args: [0.08, 0.1, 0.01], parent: "earL"},
  {id: "earR", kind: "box", role: "primary", position: [0.18, 1.0, 0.14], args: [0.16, 0.18, 0.08], parent: "head"},
  {id: "earInnerR", kind: "box", role: "secondary", position: [0.18, 1.01, 0.185], args: [0.08, 0.1, 0.01], parent: "earR"},
  {id: "eyeL", kind: "box", role: "eye", position: [-0.13, 0.78, 0.46], args: [0.11, 0.12, 0.02], parent: "head"},
  {id: "eyeR", kind: "box", role: "eye", position: [0.13, 0.78, 0.46], args: [0.11, 0.12, 0.02], parent: "head"},
  {id: "pupilL", kind: "box", role: "pupil", position: [-0.13, 0.78, 0.472], args: [0.035, 0.1, 0.01], parent: "eyeL"},
  {id: "pupilR", kind: "box", role: "pupil", position: [0.13, 0.78, 0.472], args: [0.035, 0.1, 0.01], parent: "eyeR"},
  {id: "nose", kind: "box", role: "accent", position: [0.0, 0.66, 0.51], args: [0.07, 0.05, 0.02], parent: "head"},
  {id: "philtrum", kind: "box", role: "accent", position: [0.0, 0.6, 0.505], args: [0.02, 0.06, 0.01], parent: "head"},
  {id: "whiskerL1", kind: "box", role: "whisker", position: [-0.24, 0.63, 0.47], args: [0.22, 0.012, 0.012], parent: "head"},
  {id: "whiskerL2", kind: "box", role: "whisker", position: [-0.24, 0.59, 0.47], args: [0.22, 0.012, 0.012], parent: "head"},
  {id: "whiskerR1", kind: "box", role: "whisker", position: [0.24, 0.63, 0.47], args: [0.22, 0.012, 0.012], parent: "head"},
  {id: "whiskerR2", kind: "box", role: "whisker", position: [0.24, 0.59, 0.47], args: [0.22, 0.012, 0.012], parent: "head"},
  {id: "tailBase", kind: "box", role: "primary", position: [0.22, 0.1, -0.45], args: [0.1, 0.1, 0.3]},
  {id: "tailMid", kind: "box", role: "primary", position: [0.22, 0.31, -0.6], args: [0.1, 0.32, 0.1]},
  {id: "tailTip", kind: "box", role: "primary", position: [0.22, 0.53, -0.6], args: [0.1, 0.12, 0.1], parent: "tailMid"},
  {id: "legFL", kind: "box", role: "primary", position: [-0.16, -0.1, 0.27], args: [0.12, 0.22, 0.12]},
  {id: "legFR", kind: "box", role: "primary", position: [0.16, -0.1, 0.27], args: [0.12, 0.22, 0.12]},
  {id: "pawFL", kind: "box", role: "primary", position: [-0.16, -0.25, 0.31], args: [0.14, 0.08, 0.16]},
  {id: "pawFR", kind: "box", role: "primary", position: [0.16, -0.25, 0.31], args: [0.14, 0.08, 0.16]},
  {id: "padFL", kind: "box", role: "accent", position: [-0.16, -0.25, 0.395], args: [0.08, 0.04, 0.01], parent: "pawFL"},
  {id: "padFR", kind: "box", role: "accent", position: [0.16, -0.25, 0.395], args: [0.08, 0.04, 0.01], parent: "pawFR"},
  {id: "pawBL", kind: "box", role: "primary", position: [-0.27, -0.24, -0.16], args: [0.16, 0.1, 0.2]},
  {id: "pawBR", kind: "box", role: "primary", position: [0.27, -0.24, -0.16], args: [0.16, 0.1, 0.2]},
];

export function getCatPart(id: string): CatPart | undefined {
  return CAT_ANATOMY.find((part) => part.id === id);
}
