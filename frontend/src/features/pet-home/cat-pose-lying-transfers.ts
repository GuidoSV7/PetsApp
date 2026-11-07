import { Euler, Quaternion, Vector3 } from "three";
import { CAT_JOINT_IDS } from "./cat-pose-data";
import { createCatPoseReference } from "./cat-pose-reference";
import { createCatPoseVisualFit } from "./cat-pose-visual-fit";
import type { CatSkeleton } from "./cat-skeleton";
import { BASE_SIZE, type CatPoseLibrary, type PoseTrack } from "./cat-pose-tracks";

const arcs = [["sphinx", "side"], ["side", "sphinx"], ["side", "curled"], ["curled", "side"], ["side", "bellyUp"], ["bellyUp", "side"]] as const;
const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const index = (id: string) => CAT_JOINT_IDS.indexOf(("joint-" + id) as typeof CAT_JOINT_IDS[number]) * 4;

/** Setup-owned FK/support authoring only. Playback uses existing samples, never
 * a live hull correction, head solver, airborne target IK or second clock.
 */
export function compileCatPoseLyingTransfers(skeleton: CatSkeleton, library: CatPoseLibrary): CatPoseLibrary {
  const reference = createCatPoseReference(skeleton);
  const ordered = CAT_JOINT_IDS.map(id => ({ node: reference.joints.get(id)!,
    bind: skeleton.joints.find(joint => joint.id === id)!,
    rest: new Quaternion().setFromEuler(new Euler(...skeleton.joints.find(joint => joint.id === id)!.rotation)) }));
  const qa = new Quaternion(), qb = new Quaternion(), point = new Vector3();
  function floor(id: string) {
    const node = reference.boxes.get(id)!, args = skeleton.bindings.get(id)!.part.args, matrix = node.matrixWorld.elements;
    return matrix[13] - (Math.abs(matrix[1]) * args[0] + Math.abs(matrix[5]) * args[1] + Math.abs(matrix[9]) * args[2]) / 2;
  }
  const ground = floor("pawFL");
  // Full-weight pre-IK geometry, exactly as in Bind. Post-IK skin adjustment is
  // not the support hull and cannot be used to hide an invalid root height.
  for (const id of ["hipL", "hipR"]) {
    const bind = skeleton.bindings.get(id)!, node = reference.boxes.get(id)!;
    const fit = createCatPoseVisualFit(bind, skeleton.joints.find(joint => joint.id === bind.jointId)!);
    node.position.set(bind.position[0], bind.position[1], bind.position[2]);
    node.scale.set(bind.scale[0], bind.scale[1], bind.scale[2]);
    node.quaternion.identity();
    if (fit.limb) {
      node.position.lerpVectors(fit.restPosition, fit.fitPosition, 1);
      node.scale.lerpVectors(fit.restScale, fit.fitScale, 1);
      node.quaternion.slerp(fit.fitRotation, 1);
    }
  }
  const body = skeleton.bindings.get("body")!;
  const hipOrdinate = (id: string) => skeleton.joints.find(joint => joint.id === skeleton.bindings.get(id)!.jointId)!.position[1];
  function support(base: Float64Array, belly: boolean) {
    for (const [i, {node,bind,rest}] of ordered.entries()) {
      node.position.set(...bind.position); node.quaternion.copy(rest).multiply(qa.fromArray(base,i*4));
      if (i===0) node.position.add(point.fromArray(base,88));
    }
    reference.root.updateMatrixWorld(true);
    const ny = reference.joints.get("joint-torso")!.matrixWorld.elements[5];
    // Body expands, whereas each fitted hip translates with its torso-child
    // attachment. The hip corner's own local Y is NOT its expansion ordinate.
    const bodyY = body.position[1] - Math.sign(ny) * body.part.args[1] * body.scale[1] / 2;
    const hull = [{ height: floor("body"), ordinate: bodyY }];
    if (!belly) for (const id of ["hipL", "hipR"]) hull.push({ height: floor(id), ordinate: hipOrdinate(id) });
    const active = hull.reduce((a,b) => a.height <= b.height ? a : b);
    if (Math.abs(ny) < 1e-12) return { height: active.height, pivot: body.position[1] };
    // For both signs of ±1% breathing, inactive support i must satisfy
    // .01*|ny|*|ordinate_i-pivot| <= gap_i + the existing .0005 support budget.
    // Intersect those closed-form bounds; prefer the exact active ordinate.
    // This is setup authoring, not a new acceptance gate or feasibility claim:
    // actual fractional SLERP/root/pivot samples must still pass public checks.
    let low = -Infinity, high = Infinity;
    for (const candidate of hull) {
      const radius = (candidate.height - active.height + .0005) / (.01 * Math.abs(ny));
      low = Math.max(low, candidate.ordinate-radius); high = Math.min(high, candidate.ordinate+radius);
    }
    const pivot = low <= high ? Math.max(low, Math.min(high, active.ordinate)) : active.ordinate;
    return { height: active.height, pivot };
  }

  const neck = index("neck"), head = index("head");
  const neckRest = ordered[neck/4].rest, headRest = ordered[head/4].rest;
  const lever = new Vector3(...ordered[head/4].bind.position).normalize();
  const neckD = new Quaternion(), neckC = new Quaternion(), lifted = new Quaternion();
  const totalD = new Quaternion(), totalC = new Quaternion(), currentNeck = new Quaternion(), currentHead = new Quaternion();
  const torso = new Quaternion(), swing = new Quaternion(), up = new Vector3();
  function curlHead(output: Float64Array, progress: number, side: Float64Array, curled: Float64Array) {
    // Orientation-only lift of the resolved neck/head lever, in the real
    // parent's frame. Keep D's total head orientation during lift, turn while
    // elevated, then lower with C's total orientation. Reverse the SAME path.
    torso.copy(ordered[0].rest).multiply(qa.fromArray(output,0))
      .multiply(ordered[1].rest).multiply(qb.fromArray(output,4));
    up.set(0,1,0).applyQuaternion(torso.invert());
    neckD.copy(neckRest).multiply(qa.fromArray(side,neck));
    neckC.copy(neckRest).multiply(qa.fromArray(curled,neck));
    point.copy(lever).applyQuaternion(neckD);
    swing.setFromUnitVectors(point,up); lifted.copy(swing).multiply(neckD);
    totalD.copy(neckD).multiply(headRest).multiply(qa.fromArray(side,head));
    totalC.copy(neckC).multiply(headRest).multiply(qa.fromArray(curled,head));
    if (progress < .25) {
      currentNeck.copy(neckD).slerp(lifted,ease(progress/.25)); currentHead.copy(totalD);
    } else if (progress < .75) {
      currentNeck.copy(lifted); currentHead.copy(totalD).slerp(totalC,ease((progress-.25)/.5));
    } else {
      currentNeck.copy(lifted).slerp(neckC,ease((progress-.75)/.25)); currentHead.copy(totalC);
    }
    qa.copy(neckRest).invert().multiply(currentNeck).normalize().toArray(output,neck);
    qa.copy(headRest).invert().multiply(qb.copy(currentNeck).invert()).multiply(currentHead).normalize().toArray(output,head);
  }

  // D/B-only model-space FK corridor. Do not transport a torso-local head
  // total through a moving parent: the root/torso roll would rotate it again.
  const parentD = new Quaternion(), parentB = new Quaternion(), parentNow = new Quaternion();
  const modelNeckD = new Quaternion(), modelNeckB = new Quaternion(), modelLift = new Quaternion();
  const modelHeadD = new Quaternion(), modelHeadB = new Quaternion();
  const modelNeck = new Quaternion(), modelHead = new Quaternion(), modelUp = new Vector3(0,1,0);
  function rollParent(base: Float64Array, result: Quaternion) {
    result.setFromAxisAngle(modelUp,base[91]*Math.PI/180)
      .multiply(ordered[0].rest).multiply(qa.fromArray(base,0))
      .multiply(ordered[1].rest).multiply(qb.fromArray(base,4));
  }
  function rollHead(output: Float64Array, progress: number, side: Float64Array, back: Float64Array) {
    rollParent(side,parentD); rollParent(back,parentB); rollParent(output,parentNow);
    modelNeckD.copy(parentD).multiply(neckRest).multiply(qa.fromArray(side,neck));
    modelNeckB.copy(parentB).multiply(neckRest).multiply(qa.fromArray(back,neck));
    point.copy(lever).applyQuaternion(modelNeckD);
    swing.setFromUnitVectors(point,modelUp); modelLift.copy(swing).multiply(modelNeckD);
    modelHeadD.copy(modelNeckD).multiply(headRest).multiply(qa.fromArray(side,head));
    modelHeadB.copy(modelNeckB).multiply(headRest).multiply(qa.fromArray(back,head));
    if (progress < .2) {
      // Lift at fixed D parent, retaining D's model-space head orientation.
      modelNeck.copy(modelNeckD).slerp(modelLift,ease(progress/.2)); modelHead.copy(modelHeadD);
    } else if (progress < .8) {
      // The parent rolls underneath the elevated lever. Turn the head in MODEL
      // space, then derive local rotations through the actual moving parent.
      modelNeck.copy(modelLift); modelHead.copy(modelHeadD).slerp(modelHeadB,ease((progress-.2)/.6));
    } else {
      // Parent is already B; lower to its exact frozen rigid authoring.
      modelNeck.copy(modelLift).slerp(modelNeckB,ease((progress-.8)/.2)); modelHead.copy(modelHeadB);
    }
    qa.copy(neckRest).invert().multiply(qb.copy(parentNow).invert()).multiply(modelNeck).normalize().toArray(output,neck);
    qa.copy(headRest).invert().multiply(qb.copy(modelNeck).invert()).multiply(modelHead).normalize().toArray(output,head);
  }

  const tracks = { ...library.tracks };
  for (const [from,to] of arcs) {
    const original = library.tracks[from][to]!, a = library.stable[from], b = library.stable[to];
    const frames = new Float64Array(original.frames.length), visibility = new Uint8Array(original.duration+1);
    const breathAnchors = new Float64Array(original.duration+1);
    const sphinxTransfer = from === "sphinx" || to === "sphinx";
    const curlTransfer = from === "curled" || to === "curled";
    const backTransfer = from === "bellyUp" || to === "bellyUp";
    // One authoring function F(t,b) supplies nominal AND every breath knot.
    function author(tick: number, knot: number, output: Float64Array) {
      const t=tick/original.duration;
      const source = a.breathFK?.variants[knot] ?? a.base, target = b.breathFK?.variants[knot] ?? b.base;
      const downTime = from === "sphinx" ? t : 1-t;
      const roll = ease((downTime-.4)/.6);
      let weight = sphinxTransfer ? (from === "sphinx" ? roll : 1-roll) : ease(t);
      if (backTransfer) {
        const backProgress = from === "side" ? t : 1-t;
        const parentRoll = ease((backProgress-.2)/.6);
        weight = from === "side" ? parentRoll : 1-parentRoll;
      }
      for(let i=0;i<88;i+=4) qa.fromArray(source,i).slerp(qb.fromArray(target,i),weight).normalize().toArray(output,i);
      for(let i=88;i<BASE_SIZE;i++) output[i]=a.base[i]+(b.base[i]-a.base[i])*weight;
      if (sphinxTransfer) {
        const sphinx = library.stable.sphinx.base, side = library.stable.side.base, fold = library.stable.loaf.base;
        for (const id of ["shoulderFL","elbowFL","wristFL","shoulderFR","elbowFR","wristFR"]) {
          const i = index(id);
          if (downTime <= .4) qa.fromArray(sphinx,i).slerp(qb.fromArray(fold,i),ease((downTime-.2)/.2));
          else qa.fromArray(fold,i).slerp(qb.fromArray(side,i),roll);
          qa.normalize().toArray(output,i);
        }
      }
      if (curlTransfer) curlHead(output,from === "side" ? t : 1-t,
        from === "side" ? source : target,from === "curled" ? source : target);
      if (backTransfer) rollHead(output,from === "side" ? t : 1-t,
        from === "side" ? source : target,from === "bellyUp" ? source : target);
      // Exact complete endpoint family, never normalize/re-author frozen D/C.
      if(tick===0) output.set(source);
      if(tick===original.duration) output.set(target);
    }
    const output = new Float64Array(BASE_SIZE);
    for(let tick=0;tick<=original.duration;tick++) {
      const t=tick/original.duration;
      author(tick,40,output);
      const hull = support(output,(from==="sphinx" && t<.2)||(to==="sphinx" && t>=.8));
      output[89] += ground-hull.height; breathAnchors[tick] = hull.pivot;
      if(tick===0) output.set(a.base);
      if(tick===original.duration) output.set(b.base);
      frames.set(output,tick*BASE_SIZE);
      visibility[tick]=tick===0 ? a.visible : tick===original.duration ? b.visible : a.visible|b.visible;
    }
    const track: PoseTrack = { ...original, frames, visibility, breathAnchors };
    const jointMask = (a.breathFK?.jointMask ?? 0) | (b.breathFK?.jointMask ?? 0);
    if (jointMask) {
      const variants: Float64Array[] = [];
      for(let knot=0;knot<=80;knot++) {
        const variant = new Float64Array(frames);
        if (knot !== 40) for(let tick=0;tick<=original.duration;tick++) {
          author(tick,knot,output);
          for(let joint=0;joint<22;joint++) if(jointMask & (1<<joint)) {
            const i=joint*4; variant.set(output.subarray(i,i+4),tick*BASE_SIZE+i);
          }
        }
        // The neutral variant is byte-identical to nominal frames; interpolation
        // on either side of breath=1 therefore uses the SAME lifted path.
        variants.push(variant);
      }
      track.breathFK = { minimum:.99, maximum:1.01, jointMask, variants };
    }
    tracks[from] = { ...tracks[from], [to]: track };
  }
  return { ...library, tracks };
}
