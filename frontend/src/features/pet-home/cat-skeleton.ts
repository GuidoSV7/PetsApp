import { Euler, Matrix4, Quaternion, Vector3, type Object3D } from "three";
import { CAT_ANATOMY, type CatPart } from "@/features/pet-home/cat-anatomy";
import { buildCatPartTree, resolveCatPartPose, type CatPartNode } from "@/features/pet-home/cat-part-tree";
import type { CatIdleMotion } from "@/features/pet-home/cat-idle-motion";

export type Vec3 = readonly [number, number, number];
export type CatBoxBind = { part: CatPart; jointId: string; position: Vec3; scale: Vec3; visible: boolean };
export type CatJointBind = { id: string; parent?: string; position: Vec3; rotation: Vec3; scale: Vec3; children: CatJointBind[]; boxes: CatBoxBind[] };
export type CatAccessoryBind = { id: string; parent: string; position: Vec3 };
export type CatSkeleton = { joints: CatJointBind[]; roots: CatJointBind[]; bindings: Map<string, CatBoxBind>; anchors: CatAccessoryBind[] };
const unit: Vec3 = [1, 1, 1], zero: Vec3 = [0, 0, 0];
const vector = (v: Vec3) => new Vector3(...v);
const tuple = (v: Vector3): Vec3 => Object.freeze([v.x, v.y, v.z]);

/** Compile ONLY when admin/resolved needs change. No clock or idle input. */
export function buildCatSkeleton(resolved: readonly CatPart[]): CatSkeleton {
  const parts = new Map(resolved.map(p => [p.id, p]));
  const worlds = new Map<string, Matrix4>(), scales = new Map<string, Vec3>();
  const visit = (node: CatPartNode, parent = new Matrix4(), inherited: Vec3 = unit) => {
    const pose = resolveCatPartPose(node, parts.get(node.part.id)!);
    const local = new Matrix4().compose(vector(pose.position), new Quaternion().setFromEuler(new Euler(...pose.rotation)), vector(pose.scale));
    const world = parent.clone().multiply(local);
    worlds.set(node.part.id, world);
    scales.set(node.part.id, [inherited[0] * pose.scale[0], inherited[1] * pose.scale[1], inherited[2] * pose.scale[2]]);
    node.children.forEach(child => visit(child, world, scales.get(node.part.id)!));
  };
  buildCatPartTree(CAT_ANATOMY).forEach(node => visit(node));
  const base = (id: string) => CAT_ANATOMY.find(p => p.id === id)!;
  const bodyPoint = (point: Vec3) => vector(point).sub(vector(base("body").position)).applyMatrix4(worlds.get("body")!);
  const headPoint = (point: Vec3) => vector(point).sub(vector(base("head").position)).applyMatrix4(worlds.get("head")!);
  const center = (id: string) => new Vector3().setFromMatrixPosition(worlds.get(id)!);
  const hinge = (id: string) => new Vector3(0, -base(id).args[1] / 2, 0).applyMatrix4(worlds.get(id)!);
  const skeleton: CatSkeleton = { joints: [], roots: [], bindings: new Map(), anchors: [] };
  const byId = new Map<string, CatJointBind>(), jointWorlds = new Map<string, Matrix4>();
  const owners = new Map<string, string>();
  const add = (id: string, parent: string | undefined, point: Vector3, boxes: string[], rotation: Vec3 = zero) => {
    const name = "joint-" + id, parentName = parent ? "joint-" + parent : undefined;
    const world = new Matrix4().compose(point, new Quaternion().setFromEuler(new Euler(...rotation)), vector(unit));
    const local = parentName ? jointWorlds.get(parentName)!.clone().invert().multiply(world) : world;
    const p = new Vector3(), q = new Quaternion(), s = new Vector3(); local.decompose(p, q, s);
    const e = new Euler().setFromQuaternion(q);
    const joint: CatJointBind = { id: name, parent: parentName, position: tuple(p), rotation: [e.x, e.y, e.z], scale: unit, children: [], boxes: [] };
    byId.set(name, joint); jointWorlds.set(name, world); skeleton.joints.push(joint);
    if (parentName) byId.get(parentName)!.children.push(joint); else skeleton.roots.push(joint);
    boxes.forEach(box => owners.set(box, name));
  };
  add("root", undefined, vector(zero), []);
  add("torso", "root", center("body"), ["body", "chest"]);
  add("neck", "torso", bodyPoint([0, .45, .20]), []);
  add("head", "neck", center("head"), ["head", "cheekL", "cheekR", "muzzle", "eyeL", "eyeR", "pupilL", "pupilR", "nose", "philtrum", "whiskerL1", "whiskerL2", "whiskerR1", "whiskerR2"]);
  add("jaw", "head", headPoint([0, .60, .45]), ["jaw", "tongue"]);
  for (const [side, x] of [["L", -.16], ["R", .16]] as const) {
    add("shoulderF" + side, "torso", bodyPoint([x, -.05, .30]), ["legF" + side]);
    add("elbowF" + side, "shoulderF" + side, vector([x, -.12, .27]), ["forearmF" + side]);
    add("wristF" + side, "elbowF" + side, vector([x, -.21, .27]), ["pawF" + side, "padF" + side]);
  }
  for (const [side, x] of [["L", -.31], ["R", .31]] as const) {
    const suffix = "B" + side, pawX = side === "L" ? -.27 : .27;
    add("hip" + suffix, "torso", bodyPoint([x, .10, -.22]), ["hip" + side]);
    add("knee" + suffix, "hip" + suffix, vector([pawX, -.07, -.22]), ["shin" + suffix]);
    add("ankle" + suffix, "knee" + suffix, vector([pawX, -.19, -.16]), ["paw" + suffix]);
  }
  add("tailBase", "torso", bodyPoint([.22, .10, -.41]), ["tailBase"]);
  add("tailMid", "tailBase", hinge("tailMid"), ["tailMid"]);
  add("tailTip", "tailMid", hinge("tailTip"), ["tailTip"]);
  for (const side of ["L", "R"]) add("ear" + side, "head", hinge("ear" + side), ["ear" + side, "earInner" + side], parts.get("ear" + side)!.rotation ?? zero);

  const extras: readonly [string, string, Vec3, Vec3][] = [
    ["forearmFL", "legFL", [-.16, -.16, .27], [.10, .08, .10]],
    ["forearmFR", "legFR", [.16, -.16, .27], [.10, .08, .10]],
    ["shinBL", "hipL", [-.27, -.13, -.22], [.14, .12, .20]],
    ["shinBR", "hipR", [.27, -.13, -.22], [.14, .12, .20]],
    ["jaw", "muzzle", [0, .57, .47], [.20, .06, .04]],
    ["tongue", "jaw", [0, .565, .476], [.10, .012, .024]],
  ];
  for (const [id, host, position, args] of extras) {
    const hostPart = parts.get(host)!;
    const part: CatPart = { id, kind: "box", role: id === "tongue" ? "accent" : hostPart.role, position, args };
    // Positions are canonical model coordinates; inherit the container's visual scale.
    const hostBase = base(host) ?? parts.get(host)!;
    worlds.set(id, worlds.get(host)!.clone().multiply(new Matrix4().makeTranslation(...tuple(vector(position).sub(vector(hostBase.position))))));
    scales.set(id, scales.get(host)!); parts.set(id, part);
  }
  // Map insertion preserves the original33 IDs as an exact prefix; extras append.
  for (const part of [...resolved, ...extras.map(([id]) => parts.get(id)!)]) {
    const jointId = owners.get(part.id)!;
    const local = jointWorlds.get(jointId)!.clone().invert().multiply(worlds.get(part.id)!);
    const bind: CatBoxBind = Object.freeze({ part, jointId, position: tuple(new Vector3().setFromMatrixPosition(local)), scale: Object.freeze([...scales.get(part.id)!]) as Vec3, visible: !extras.some(([id]) => id === part.id) });
    skeleton.bindings.set(part.id, bind); byId.get(jointId)!.boxes.push(bind);
  }
  for (const [id, parent, point] of [
    ["accessory-neck", "joint-neck", bodyPoint([0, .45, .20])],
    ["accessory-head", "joint-head", headPoint([0, .95, .20])],
    ["accessory-back", "joint-torso", bodyPoint([0, .45, -.22])],
  ] as const) skeleton.anchors.push({ id, parent, position: tuple(point.applyMatrix4(jointWorlds.get(parent)!.clone().invert())) });
  return skeleton;
}

/** Reuse compiled binds; rotate rigid joints and apply blink separately to boxes. */
export function applyCatSkeletonMotion(skeleton: CatSkeleton, joints: ReadonlyMap<string, Object3D>, boxes: ReadonlyMap<string, Object3D>, motion: CatIdleMotion): void {
  for (const id of ["earL", "earR", "tailMid", "tailTip"] as const) {
    const bind = skeleton.joints.find(j => j.id === "joint-" + id)!, joint = joints.get(bind.id);
    if (!joint) continue;
    const delta = motion[id]?.rotation ?? zero;
    joint.position.set(...bind.position); joint.rotation.set(bind.rotation[0] + delta[0], bind.rotation[1] + delta[1], bind.rotation[2] + delta[2]);
    joint.scale.set(...unit);
  }
  for (const side of ["L", "R"] as const) for (const part of ["eye", "pupil"]) {
    const id = part + side, bind = skeleton.bindings.get(id)!, mesh = boxes.get(id);
    // Existing eye/pupil centerY is shared, so their blink changes scale only.
    mesh?.scale.set(bind.scale[0], bind.scale[1] * (motion[("eye" + side) as "eyeL" | "eyeR"]?.scaleY ?? 1), bind.scale[2]);
  }
}
