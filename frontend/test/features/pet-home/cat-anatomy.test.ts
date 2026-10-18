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

  it("uses an elongated body instead of a toy sphere", () => {
    const body = getCatPart("body")!;
    expect(body.kind === "capsule" || body.kind === "sphere").toBe(true);
    if (body.kind === "sphere") {
      const [, sy, sz] = body.scale;
      expect(Math.max(sy, sz)).toBeGreaterThan(1);
    }
    if (body.kind === "capsule") {
      expect(body.args[1]).toBeGreaterThan(body.args[0]);
    }
  });

  it("has several whiskers for a real-cat face", () => {
    const whiskers = CAT_ANATOMY.filter((p) => p.id.startsWith("whisker"));
    expect(whiskers.length).toBeGreaterThanOrEqual(4);
    expect(whiskers.every((w) => w.role === "whisker")).toBe(true);
  });

  it("uses thin vertical pupils", () => {
    const pupil = getCatPart("pupilL")!;
    expect(pupil.role).toBe("pupil");
    expect(["box", "capsule", "cylinder"]).toContain(pupil.kind);
    const [, sy] = pupil.scale;
    expect(sy).toBeGreaterThan(pupil.scale[0]);
  });
});
