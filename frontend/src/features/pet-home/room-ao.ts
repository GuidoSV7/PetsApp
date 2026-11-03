/** Factors multiply Linear-sRGB channels, not gamma-encoded hex bytes. */
export const AO_FACTORS = [0.55, 0.70, 0.85, 1] as const;
export type AoLevel = 0 | 1 | 2 | 3;

export function aoLevel(side1: boolean, side2: boolean, corner: boolean): AoLevel {
  return side1 && side2 ? 0 : (3 - Number(side1) - Number(side2) - Number(corner)) as AoLevel;
}

/** Corner order: 00, 10, 11, 01 (counterclockwise from outside). */
export function flipDiagonal(levels: readonly [number, number, number, number]): boolean {
  return levels[0] + levels[2] > levels[1] + levels[3];
}
