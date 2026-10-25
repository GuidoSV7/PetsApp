import { describe, it, expect } from "vitest";
import {
  CAT_ANATOMY,
  CAT_MATERIAL_ROLES,
  getCatPart,
} from "@/features/pet-home/cat-anatomy";

const REQUIRED_IDS = [
  "body",
  "chest",
  "head",
  "muzzle",
  "earL",
  "earR",
  "earInnerL",
  "earInnerR",
  "eyeL",
  "eyeR",
  "pupilL",
  "pupilR",
  "nose",
  "tailBase",
  "tailMid",
  "tailTip",
  "pawFL",
  "pawFR",
  "pawBL",
  "pawBR",
] as const;

describe("cat-anatomy", () => {
  it("includes the feline part set", () => {
    for (const id of REQUIRED_IDS) {
      expect(getCatPart(id)?.id).toBe(id);
    }
  });

  it("only uses known material roles", () => {
    for (const part of CAT_ANATOMY) {
      expect(CAT_MATERIAL_ROLES).toContain(part.role);
    }
  });

  it("places the head above the body for a sitting pose", () => {
    const body = getCatPart("body")!;
    const head = getCatPart("head")!;
    expect(head.position[1]).toBeGreaterThan(body.position[1]);
  });

  it("uses a voxel body deeper than it is wide", () => {
    const body = getCatPart("body")!;
    expect(body.kind).toBe("box");
    expect(body.args[2]).toBeGreaterThan(body.args[0]);
  });

  it("has several whiskers for a real-cat face", () => {
    const whiskers = CAT_ANATOMY.filter((p) => p.id.startsWith("whisker"));
    expect(whiskers.length).toBeGreaterThanOrEqual(4);
    expect(whiskers.every((w) => w.role === "whisker")).toBe(true);
  });

  it("uses thin vertical pupils", () => {
    const pupil = getCatPart("pupilL")!;
    expect(pupil.role).toBe("pupil");
    expect(pupil.kind).toBe("box");
    expect(pupil.args[1]).toBeGreaterThan(pupil.args[0]);
  });
});


describe("voxel base invariants", () => {
  it("uses only three positive box dimensions and no base transforms", () => {
    for (const part of CAT_ANATOMY) {
      expect(part.kind, part.id).toBe("box");
      expect(part.args, part.id).toHaveLength(3);
      expect(part.args.every((n) => Number.isFinite(n) && n > 0)).toBe(true);
      expect(part).not.toHaveProperty("rotation");
      expect(part).not.toHaveProperty("scale");
    }
  });
  it("preserves the complete unique ID/material manifest", () => {
    const expected = {
      "body": "primary",
      "hipL": "primary",
      "hipR": "primary",
      "head": "primary",
      "cheekL": "primary",
      "cheekR": "primary",
      "earL": "primary",
      "earR": "primary",
      "tailBase": "primary",
      "tailMid": "primary",
      "tailTip": "primary",
      "legFL": "primary",
      "legFR": "primary",
      "pawFL": "primary",
      "pawFR": "primary",
      "pawBL": "primary",
      "pawBR": "primary",
      "chest": "secondary",
      "muzzle": "secondary",
      "earInnerL": "secondary",
      "earInnerR": "secondary",
      "eyeL": "eye",
      "eyeR": "eye",
      "pupilL": "pupil",
      "pupilR": "pupil",
      "nose": "accent",
      "philtrum": "accent",
      "padFL": "accent",
      "padFR": "accent",
      "whiskerL1": "whisker",
      "whiskerR1": "whisker",
      "whiskerL2": "whisker",
      "whiskerR2": "whisker"
};
    expect(new Set(CAT_ANATOMY.map((p) => p.id)).size).toBe(33);
    expect(Object.fromEntries(CAT_ANATOMY.map((p) => [p.id, p.role]))).toEqual(expected);
  });
  it("keeps matching left/right dimensions and mirrored rest positions", () => {
    for (const left of CAT_ANATOMY.filter((p) => /L[12]?$/.test(p.id))) {
      const right = getCatPart(left.id.replace(/L(?=[12]?$)/, "R"))!;
      expect(right.position).toEqual([-left.position[0], left.position[1], left.position[2]]);
      expect(right.args).toEqual(left.args);
      expect(right.role).toBe(left.role);
    }
  });
  it("keeps every rest box corner within the model frame", () => {
    const limits = [[-0.5, 0.5], [-0.32, 1.25], [-0.72, 0.6]];
    for (const part of CAT_ANATOMY.filter((p) => p.kind === "box")) for (let axis = 0; axis < 3; axis++) {
      expect(part.position[axis] - part.args[axis] / 2, part.id).toBeGreaterThanOrEqual(limits[axis][0] - 1e-6);
      expect(part.position[axis] + part.args[axis] / 2, part.id).toBeLessThanOrEqual(limits[axis][1] + 1e-6);
    }
  });
});


it("declares every required parent without inventing new roots", () => {
  const expected: Record<string, string> = {
    cheekL: "head", cheekR: "head", muzzle: "head", earL: "head", earR: "head",
    eyeL: "head", eyeR: "head", nose: "head", philtrum: "head",
    whiskerL1: "head", whiskerR1: "head", whiskerL2: "head", whiskerR2: "head",
    earInnerL: "earL", earInnerR: "earR", pupilL: "eyeL", pupilR: "eyeR",
    chest: "body", tailTip: "tailMid", padFL: "pawFL", padFR: "pawFR",
  };
  expect(Object.fromEntries(CAT_ANATOMY.filter((p) => p.parent).map((p) => [p.id, p.parent]))).toEqual(expected);
});
