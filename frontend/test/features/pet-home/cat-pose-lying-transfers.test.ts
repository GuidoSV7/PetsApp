import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { CAT_POSE_EDGES } from "@/features/pet-home/cat-pose-graph";
import { mirrorCatPoseBase } from "@/features/pet-home/cat-pose-mirror";
import { poseScene } from "./cat-pose-fixture";
import { measureRigJointContacts } from "./cat-pose-joint-zones";

const profiles = [
  { name: "default0", hunger: 0, design: defaultCatDesign() },
  { name: "default100", hunger: 100, design: defaultCatDesign() },
  { name: "compact0", hunger: 0, design: { ...defaultCatDesign(), bodyDepth: .7, headHeight: -.15, earSize: .6 } },
  { name: "deep100", hunger: 100, design: { ...defaultCatDesign(), bodyDepth: 1.6, headHeight: .25, earSize: 1.6 } },
];
const arcs = [["sphinx", "side"], ["side", "sphinx"], ["side", "curled"], ["curled", "side"], ["side", "bellyUp"], ["bellyUp", "side"]] as const;
const breaths = [
  { name: "awake", at: (time: number) => 1 + Math.sin(time / 60 * Math.PI * 2 * .4) * .01 },
  { name: "opposite", at: (time: number) => 1 - Math.sin(time / 60 * Math.PI * 2 * .4) * .01 },
  { name: "sleep", at: (time: number) => 1 + Math.sin(time / 60 * Math.PI * 2 * .3 + 1.7) * .006 },
];
type Rig = ReturnType<typeof poseScene>;
function snapshot(rig: Rig) {
  return { joints: [...rig.joints].map(([id,node]) => [id,...node.matrixWorld.elements]),
    boxes: [...rig.boxes].map(([id,node]) => [id,node.visible,...node.matrixWorld.elements]),
    goals: Array.from(rig.bind.contacts.copyGoalsInto(new Float64Array(12))),
    revision: rig.bind.contacts.goalRevision, diagnostics: { ...rig.bind.contacts.diagnostics } };
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("prepared-library preservation probe", () => {
  for (const profile of profiles) it(`${profile.name}/preservation`, () => {
    const stable = [];
    for (const pose of ["side", "bellyUp"] as const) for (const reflected of [false,true]) {
      const rig = poseScene(profile.hunger,profile.design), simulation = rig.prepareStable(pose);
      for (const breath of [.99,1,1.01,.99731,1.00619]) {
        const frame = simulation.sample();
        if (reflected) {
          const mirrored = mirrorCatPoseBase(rig.skeleton,frame.base);
          frame.rotations.set(mirrored.subarray(0,88)); frame.rootOffset.set(mirrored.subarray(88,91)); frame.headingDeg = mirrored[91];
        }
        frame.bodyBreath = breath; rig.bind.apply(frame); rig.root.updateMatrixWorld(true);
        stable.push({pose,reflected,breath,frame: hash(frame),output: hash(snapshot(rig))});
      }
    }
    const nonlying = [];
    for (const [from,to] of [["seated","standing"],["seated","loaf"],["loaf","seated"],["seated","sphinx"],["sphinx","seated"],["standing","sphinx"]] as const) {
      const rig = poseScene(profile.hunger,profile.design), prepared = rig.prepareEdge(from,to);
      const duration = CAT_POSE_EDGES.find(edge => edge.from===from && edge.to===to)!.durationTicks;
      const outputs=[];
      for(let tick=0;tick<=duration;tick++) for(const alpha of [0,.25,.5,.75]) {
        const frame=prepared.sample(tick,alpha); frame.bodyBreath=breaths[0].at(tick+alpha);
        rig.bind.apply(frame);rig.root.updateMatrixWorld(true);
        outputs.push(hash({frame,output:snapshot(rig)}));
      }
      nonlying.push({from,to,output:hash(outputs),samples:outputs.length});
    }
    console.log("PRESERVATION "+JSON.stringify({profile:profile.name,stable,nonlying}));
    expect(stable).toHaveLength(20); expect(nonlying).toHaveLength(6);
  }, 20000);
});

describe("passing r2 public curve digest", () => {
  for (const [from,to] of arcs.slice(0,4)) it(`default0/${from}->${to}/r2-curve-digest`, () => {
    const outputs: string[] = [];
    const duration = CAT_POSE_EDGES.find(edge=>edge.from===from && edge.to===to)!.durationTicks;
    for (const breath of breaths) {
      const rig=poseScene(0), prepared=rig.prepareEdge(from,to);
      for(let tick=0;tick<=duration;tick++) for(const alpha of [0,.25,.5,.75]) {
        const frame=prepared.sample(tick,alpha);frame.bodyBreath=breath.at(tick+alpha);
        rig.bind.apply(frame);rig.root.updateMatrixWorld(true);
        outputs.push(hash({breath:breath.name,frame,output:snapshot(rig)}));
      }
    }
    console.log("CURVE_DIGEST "+JSON.stringify({from,to,samples:outputs.length,sha256:hash(outputs)}));
    expect(outputs).toHaveLength(3*(duration+1)*4);
  },20000);
});

describe("S19 prepared lying transfer physical continuity", () => {
  for (const profile of profiles) for (const [from,to] of arcs) for (const breath of breaths) {
    it(`${profile.name}/${from}->${to}/${breath.name}: every tick and quarter`, () => {
      const rig=poseScene(profile.hunger,profile.design), prepared=rig.prepareEdge(from,to);
      const duration=CAT_POSE_EDGES.find(edge=>edge.from===from && edge.to===to)!.durationTicks;
      const goals = new Map<string,Vector3>(); let previousMask=0;
      for(let tick=0;tick<=duration;tick++) for(const alpha of [0,.25,.5,.75]) {
        const frame=prepared.sample(tick,alpha); frame.bodyBreath=breath.at(tick+alpha);
        const base=frame.base.slice(),rotations=frame.rotations.slice(),root=frame.rootOffset.slice();
        const context=`${profile.name}/${from}->${to}/${tick}+${alpha}`;
        expect(()=>rig.bind.apply(frame),context).not.toThrow();rig.root.updateMatrixWorld(true);
        expect(frame.base).toEqual(base);expect(frame.rotations).toEqual(rotations);expect(frame.rootOffset).toEqual(root);
        const diagnostics=rig.bind.contacts.diagnostics,mask=diagnostics.requestedMask!;
        expect(diagnostics.unreachableFeet,context).toBe(0);
        if(mask) expect(diagnostics.maxFootDrift,context).toBeLessThanOrEqual(.001);
        else expect(Math.min(...["body","hipL","hipR"].flatMap(id=>rig.corners(id).map(p=>p.y))),context+"/support").toBeCloseTo(-.29,3);
        for(const [i,id] of ["pawFL","pawFR","pawBL","pawBR"].entries()) if(mask & (1<<i)) {
          const paw=rig.boxes.get(id)!,position=paw.getWorldPosition(new Vector3());
          if(!(previousMask & (1<<i))) goals.set(id,position.clone());
          expect(position.distanceTo(goals.get(id)!),context+"/"+id).toBeLessThanOrEqual(.001);
          expect(new Vector3(0,1,0).transformDirection(paw.matrixWorld).y).toBeCloseTo(1,10);
        }
        previousMask=mask;
        for(const [id,node] of rig.boxes) if(node.visible) for(const p of rig.corners(id)) expect(p.y,context+"/"+id+" floor").toBeGreaterThanOrEqual(-.291);
        for(const node of rig.joints.values()) expect(node.scale.toArray()).toEqual([1,1,1]);
        expect(measureRigJointContacts(rig).filter(link=>link.kind==="structural" && link.distance>.001),context+"/structural contacts").toEqual([]);
      }
    });
  }
});
