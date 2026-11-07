import { describe, expect, it } from "vitest";
import ts from "typescript";
import { exportCatPose } from "@/features/admin/cat-pose-export";
import { CAT_JOINT_IDS, CAT_POSES, CAT_POSE_IDS } from "@/features/pet-home/cat-pose-data";
import type { CatPoseDefinition } from "@/features/pet-home/cat-pose-types";

function readLiteral(text: string) {
  const source = ts.createSourceFile("pose.ts", `const pose = ${text};`, ts.ScriptTarget.Latest, true);
  const diagnostics = (source as ts.SourceFile & { parseDiagnostics: readonly unknown[] }).parseDiagnostics;
  expect(diagnostics).toEqual([]);
  // The public format is a data-only object literal, deliberately JSON-compatible TS.
  return JSON.parse(text);
}

describe("exportCatPose", () => {
  it("exports readable schema-versioned code with complete degree vectors and all metadata for seven presets", () => {
    for (const id of CAT_POSE_IDS) {
      const pose = CAT_POSES[id];
      const before = JSON.stringify(pose);
      const text = exportCatPose(pose);
      expect(text).toContain('\n  "schemaVersion": 1,');
      expect(text.split("\n").length).toBeGreaterThan(30);
      const value = readLiteral(text);
      expect(value).toEqual({ schemaVersion: 1, ...pose });
      expect(Object.keys(value.rotationDeg)).toEqual(CAT_JOINT_IDS);
      expect(exportCatPose(pose)).toBe(text);
      expect(JSON.stringify(pose)).toBe(before);
    }
  });

  it("preserves numeric values, unwrapped heading, root XYZ, labels and metadata without randomness or timestamps", () => {
    const pose: CatPoseDefinition = { ...CAT_POSES.curled, label: 'Quote " and\nline',
      headingDeg: 730.125, rootOffset: [.0123456789012345, -.13579, 2e-12],
      rotationDeg: { ...CAT_POSES.curled.rotationDeg, "joint-head": [1e-8, -45.123456789, 35] },
      visibleParts: ["jaw", "tongue"], supports: ["BL"] };
    expect(readLiteral(exportCatPose(pose))).toEqual({ schemaVersion: 1, ...pose });
    expect(exportCatPose(pose)).not.toMatch(/Math\.random|timestamp|Quaternion/);
  });
});
