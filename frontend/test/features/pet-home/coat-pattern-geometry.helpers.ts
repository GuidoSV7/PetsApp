import { readFileSync } from "node:fs";
import ts from "typescript";
import { Euler, Matrix3, Matrix4, PerspectiveCamera, Quaternion, Vector3 } from "three";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import type { CatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { resolveCatAnatomy, resolveModelScale } from "@/features/admin/resolve-cat-design";
import { applyNeedVisualsToAnatomy, needVisualCues } from "@/features/pet-home/need-visuals";
import type { PetNeeds } from "@/features/pet-home/pet-stats";
import type { CoatPatternBox } from "@/features/pet-home/coat-patterns";

type Vec3 = readonly [number, number, number];
export type Box = { matrix: Matrix4; inverse: Matrix4; half: readonly number[] };
const EPS = 1e-8;

function source(file: string) {
  return ts.createSourceFile(file, readFileSync(new URL(`../../../src/features/pet-home/${file}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
function literal(node: ts.Expression): unknown {
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -(literal(node.operand) as number);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(n => literal(n as ts.Expression));
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(p => {
    if (!ts.isPropertyAssignment(p)) throw Error("Expected static camera property");
    return [p.name.getText().replace(/["']/g, ""), literal(p.initializer)];
  }));
  throw Error(`Expected actual static viewer/root literal: ${node.getText()}`);
}
function attribute(ast: ts.SourceFile, tag: string, name: string) {
  let result: ts.Expression | undefined;
  function visit(node: ts.Node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === tag) {
      const item = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === name);
      if (item && ts.isJsxAttribute(item) && item.initializer && ts.isJsxExpression(item.initializer)) result = item.initializer.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!result) throw Error(`Missing actual ${tag}.${name}`);
  return result;
}

/** Read the actual component inputs; no second camera configuration to drift. */
export function homeView() {
  const viewer = source("components/Cat3DViewer.tsx"), model = source("components/Cat3DModel.tsx");
  const cameraProps = literal(attribute(viewer, "Canvas", "camera")) as { position: Vec3; fov: number };
  const target = literal(attribute(viewer, "OrbitControls", "target")) as Vec3;
  const rootPosition = literal(attribute(model, "group", "position")) as Vec3;
  if (attribute(model, "group", "scale").getText(model) !== "modelScale") throw Error("Read the new actual model scale expression before updating this test");
  const design = defaultCatDesign(), scale = resolveModelScale(design);
  const camera = new PerspectiveCamera(cameraProps.fov, 1);
  camera.position.fromArray(cameraProps.position);
  camera.lookAt(new Vector3(...target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return { camera, rootPosition, scale, design };
}
export function matrix(position: Vec3, rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]) {
  return new Matrix4().compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(...scale));
}
export function box(matrix: Matrix4, half: readonly number[]): Box {
  return { matrix, inverse: matrix.clone().invert(), half };
}
export function baseBoxes(needs: PetNeeds, idle: CatIdleMotion = {}, view = homeView()) {
  const resolved = new Map(applyNeedVisualsToAnatomy(resolveCatAnatomy(CAT_ANATOMY, view.design), needVisualCues(needs)).map(p => [p.id, p]));
  const boxes = new Map<string, Box>();
  function visit(node: CatPartNode, parent: Matrix4) {
    const pose = resolveCatPartPose(node, resolved.get(node.part.id), idle[node.part.id as keyof CatIdleMotion]);
    const world = parent.clone().multiply(matrix(pose.position, pose.rotation, pose.scale));
    boxes.set(node.part.id, box(world, node.part.args.map(n => n / 2)));
    node.children.forEach(child => visit(child, world));
  }
  const root = matrix(view.rootPosition, [0, 0, 0], [view.scale, view.scale, view.scale]);
  buildCatPartTree(CAT_ANATOMY).forEach(node => visit(node, root));
  return boxes;
}
export function patchBox(patch: CoatPatternBox, bases: Map<string, Box>) {
  return box(bases.get(patch.anchorId)!.matrix.clone().multiply(matrix(patch.position, patch.rotation)), patch.args.map(n => n / 2));
}
export function face(b: Box, axis: number, sign: number) {
  const tangent = [0, 1, 2].filter(i => i !== axis);
  const polygon = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => new Vector3()
    .setComponent(axis, sign * b.half[axis])
    .setComponent(tangent[0], u * b.half[tangent[0]])
    .setComponent(tangent[1], v * b.half[tangent[1]])
    .applyMatrix4(b.matrix));
  const normal = new Vector3().setComponent(axis, sign).applyMatrix3(new Matrix3().getNormalMatrix(b.matrix)).normalize();
  return { axis, sign, polygon, normal };
}
export function polygonArea(polygon: Vector3[]) {
  const sum = new Vector3();
  for (let i = 0; i < polygon.length; i++) sum.add(new Vector3().crossVectors(polygon[i], polygon[(i + 1) % polygon.length]));
  return sum.length() / 2;
}
/** Complete polygon clipping, not corner or center sampling. */
export function clipToBox(polygon: Vector3[], b: Box, inset = 0) {
  let result = polygon.map(p => p.clone().applyMatrix4(b.inverse));
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const input = result;
    result = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], c = input[(i + 1) % input.length];
      const da = sign * a.getComponent(axis) - (b.half[axis] - inset);
      const dc = sign * c.getComponent(axis) - (b.half[axis] - inset);
      const insideA = da <= EPS, insideC = dc <= EPS;
      if (insideA) result.push(a);
      if (insideA !== insideC) result.push(a.clone().lerp(c, da / (da - dc)));
    }
  }
  return result;
}
export function burial(patch: CoatPatternBox, bases: Map<string, Box>) {
  const polygon = face(patchBox(patch, bases), 2, 1).polygon;
  return [...bases].filter(([, b]) => polygonArea(clipToBox(polygon, b, 1e-7)) > 1e-10).map(([id]) => id);
}
function segmentEnters(start: Vector3, end: Vector3, b: Box) {
  const origin = start.clone().applyMatrix4(b.inverse), delta = end.clone().applyMatrix4(b.inverse).sub(origin);
  let low = 0, high = 1;
  for (let axis = 0; axis < 3; axis++) {
    const h = b.half[axis] - 1e-7, x = origin.getComponent(axis), d = delta.getComponent(axis);
    if (Math.abs(d) < 1e-12) { if (x <= -h || x >= h) return false; continue; }
    let a = (-h - x) / d, c = (h - x) / d;
    if (a > c) [a, c] = [c, a];
    low = Math.max(low, a); high = Math.min(high, c);
    if (low >= high) return false;
  }
  return high > 1e-7 && low < 1 - 1e-7;
}
export function visibleSamples(patch: CoatPatternBox, bases: Map<string, Box>, camera: PerspectiveCamera) {
  const b = patchBox(patch, bases), normal = face(b, 2, 1).normal;
  let visible = 0;
  for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
    const point = new Vector3(((i + .5) / 9 - .5) * patch.args[0], ((j + .5) / 9 - .5) * patch.args[1], patch.args[2] / 2).applyMatrix4(b.matrix);
    if (normal.dot(camera.position.clone().sub(point)) <= EPS) continue;
    const ndc = point.clone().project(camera);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || Math.abs(ndc.z) > 1) continue;
    if (![...bases.values()].some(base => segmentEnters(point, camera.position, base))) visible++;
  }
  return visible;
}
export function coplanarPairs(patches: readonly CoatPatternBox[], bases: Map<string, Box>) {
  const sameFacing: string[] = [], opposing: { patch: string; base: string; patchAxis: number; patchSign: number; localArea: number }[] = [];
  const faces = (b: Box) => [0, 1, 2].flatMap(axis => [-1, 1].map(sign => face(b, axis, sign)));
  function compare(id: string, a: Box, other: string, b: Box) {
    for (const fa of faces(a)) for (const fb of faces(b)) {
      const dot = fa.normal.dot(fb.normal);
      if (Math.abs(dot) < 1 - 1e-7) continue;
      if (fa.polygon.some(p => Math.abs(fb.normal.dot(p.clone().sub(fb.polygon[0]))) > 1e-7)) continue;
      const area = polygonArea(clipToBox(fa.polygon, b));
      if (area <= 1e-10) continue;
      if (dot > 0) sameFacing.push(`${id}/${other}`);
      else opposing.push({ patch: id, base: other, patchAxis: fa.axis, patchSign: fa.sign, localArea: area });
    }
  }
  patches.forEach((p, i) => {
    const a = patchBox(p, bases);
    for (const [id, b] of bases) compare(p.id, a, id, b);
    for (const q of patches.slice(i + 1)) compare(p.id, a, q.id, patchBox(q, bases));
  });
  return { sameFacing, opposing };
}
