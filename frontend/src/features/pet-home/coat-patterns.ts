import { getCatPart } from "@/features/pet-home/cat-anatomy";
import { hexToRgb, rgbToHex, type PetCoatColors } from "@/features/pet-home/extract-coat-colors";

/** Persisted identifiers: append only, in backend order. */
export const COAT_PATTERNS = ["solid", "tabby", "tuxedo", "calico", "pointed"] as const;
export type CoatPattern = (typeof COAT_PATTERNS)[number];
export type PetCoatState = PetCoatColors & { pattern: CoatPattern };
export type PetCoatInput = PetCoatColors & { pattern?: CoatPattern };
type Vec3 = readonly [number, number, number];
type Ink = "stripe" | "secondary" | "accent";
export type CoatPatternBox = {
  id: string;
  anchorId: string;
  face: "+Z";
  center: readonly [number, number];
  size: readonly [number, number];
  position: Vec3;
  rotation: Vec3;
  args: Vec3;
  ink: Ink;
};

type Recipe = readonly [anchor: string, u: number, v: number, width: number, height: number, ink: Ink, angle?: number];

function frontSocks(ink: Ink): Recipe[] {
  return ["L", "R"].flatMap(side => [
    [`legF${side}`, 0, -.04, .10, .12, ink] as Recipe,
    [`pawF${side}`, -.055, 0, .022, .06, ink] as Recipe,
    [`pawF${side}`, .055, 0, .022, .06, ink] as Recipe,
  ]);
}

/** Approved frontal table; all offsets are local to the named anchor mesh. */
const recipes: Record<CoatPattern, readonly Recipe[]> = {
  solid: [],
  tabby: [
    ["head", -.1365, .195, .036, .10, "stripe"],
    ["head", .1365, .195, .036, .10, "stripe"],
    ["head", -.06, .195, .032, .12, "stripe", .96],
    ["head", .06, .195, .032, .12, "stripe", -.96],
    ["head", -.235, .115, .07, .04, "stripe"],
    ["head", .235, .115, .07, .04, "stripe"],
    ["head", -.235, .035, .07, .04, "stripe"],
    ["head", .235, .035, .07, .04, "stripe"],
    ["legFL", 0, .005, .10, .04, "stripe"],
    ["legFL", 0, -.07, .10, .04, "stripe"],
    ["legFR", 0, .005, .10, .04, "stripe"],
    ["legFR", 0, -.07, .10, .04, "stripe"],
  ],
  tuxedo: [
    ["body", -.245, -.015, .09, .34, "secondary"],
    ["body", .245, -.015, .09, .34, "secondary"],
    ...frontSocks("secondary"),
  ],
  calico: [
    ["head", -.175, .195, .19, .10, "accent"],
    ["head", .004, .13, .128, .23, "secondary"],
    ["head", .17, .195, .198, .10, "secondary"],
    ["legFR", 0, -.035, .10, .14, "accent"],
  ],
  pointed: [
    ["head", -.205, -.075, .12, .17, "accent"],
    ["head", .205, -.075, .12, .17, "accent"],
    ["head", 0, -.21, .52, .07, "accent"],
    ["head", 0, -.005, .14, .03, "accent"],
    ["earL", 0, .078, .14, .018, "accent"],
    ["earR", 0, .078, .14, .018, "accent"],
    ...frontSocks("accent"),
  ],
};

/** Read compatibility only; writes must not silently replace invalid identifiers. */
export function normalizeCoatPattern(value: unknown): CoatPattern {
  return typeof value === "string" && (COAT_PATTERNS as readonly string[]).includes(value)
    ? value as CoatPattern
    : "solid";
}

export function getCoatPatternBoxes(pattern: CoatPattern): readonly CoatPatternBox[] {
  const indices = new Map<string, number>();
  return recipes[pattern].map(([anchorId, u, v, width, height, ink, angle = 0]) => {
    const anchor = getCatPart(anchorId)!;
    const index = indices.get(anchorId) ?? 0;
    indices.set(anchorId, index + 1);
    return {
      id: `${pattern}-${anchorId}-${index}`,
      anchorId,
      face: "+Z",
      center: [u, v],
      size: [width, height],
      position: [u, v, anchor.args[2] / 2 + .001],
      rotation: [0, 0, angle],
      args: [width, height, .004],
      ink,
    };
  });
}

/** Apply once to the primary after the existing dirt mix, never to accent. */
export function deriveTabbyStripeColor(primary: string): string {
  const { r, g, b } = hexToRgb(primary);
  return rgbToHex(Math.round(r * .50), Math.round(g * .50), Math.round(b * .50));
}
