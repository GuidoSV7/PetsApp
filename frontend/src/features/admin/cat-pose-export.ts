import { CAT_JOINT_IDS } from "@/features/pet-home/cat-pose-data";
import type { CatPoseDefinition, PoseVec3 } from "@/features/pet-home/cat-pose-types";

const numberLiteral = (value: number) => Object.is(value, -0) ? "-0" : String(value);
const vectorLiteral = (vector: PoseVec3) => `[${vector.map(numberLiteral).join(", ")}]`;

/** Deterministic data-only TypeScript literal; no rounding, clock or side effects. */
export function exportCatPose(definition: CatPoseDefinition): string {
  return [
    "{",
    '  "schemaVersion": 1,',
    `  "id": ${JSON.stringify(definition.id)},`,
    `  "label": ${JSON.stringify(definition.label)},`,
    '  "rotationDeg": {',
    CAT_JOINT_IDS.map(id => `    ${JSON.stringify(id)}: ${vectorLiteral(definition.rotationDeg[id])}`).join(",\n"),
    "  },",
    `  "rootOffset": ${vectorLiteral(definition.rootOffset)},`,
    `  "headingDeg": ${numberLiteral(definition.headingDeg)},`,
    `  "visibleParts": ${JSON.stringify(definition.visibleParts)},`,
    `  "supports": ${JSON.stringify(definition.supports)}`,
    "}",
  ].join("\n");
}
