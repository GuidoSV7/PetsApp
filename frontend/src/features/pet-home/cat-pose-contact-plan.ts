import { CAT_POSE_EDGES } from "./cat-pose-graph";
import type { CatPoseFrame } from "./cat-pose-simulation";
import type { CatPoseId } from "./cat-pose-types";

export type BodySupport = "belly" | "side" | "back";
type Phase = { readonly at: number; readonly feet: number; readonly body: BodySupport | null; readonly landing: CatPoseId };
const phase = (at: number, feet: number, body: BodySupport | null, landing: CatPoseId): Phase => ({ at, feet, body, landing });
const feet: Record<CatPoseId, number> = { seated: 15, standing: 15, sphinx: 3, loaf: 0, side: 0, curled: 0, bellyUp: 0 };
const body: Record<CatPoseId, BodySupport | null> = { seated: null, standing: null, sphinx: "belly", loaf: "belly", side: "side", curled: "side", bellyUp: "back" };

/** Explicit releases/landings. No goal is sampled from a moving scene. */
const phases: Readonly<Record<string, readonly Phase[]>> = {
  "seated:standing": [phase(0, 15, null, "seated")],
  "standing:seated": [phase(0, 15, null, "seated")],
  "seated:sphinx": [phase(0, 12, null, "seated"), phase(34 / 54, 0, "belly", "sphinx"), phase(1, 3, "belly", "sphinx")],
  "standing:sphinx": [phase(0, 15, null, "standing"), phase(.1, 12, null, "standing"), phase(.55, 12, "belly", "standing"), phase(.75, 3, "belly", "sphinx")],
  "sphinx:seated": [phase(0, 0, "belly", "sphinx"), phase(20 / 54, 15, null, "seated")],
  "seated:loaf": [phase(0, 12, null, "seated"), phase(34 / 45, 0, "belly", "loaf")],
  "loaf:seated": [phase(0, 0, "belly", "loaf"), phase(20 / 48, 15, null, "seated")],
  "sphinx:side": [phase(0, 3, "belly", "sphinx"), phase(.2, 0, "side", "side")],
  "side:sphinx": [phase(0, 0, "side", "side"), phase(.8, 3, "belly", "sphinx")],
  "side:curled": [phase(0, 0, "side", "side")],
  "curled:side": [phase(0, 0, "side", "side")],
  "side:bellyUp": [phase(0, 0, "side", "side"), phase(.5, 0, "back", "bellyUp")],
  "bellyUp:side": [phase(0, 0, "back", "bellyUp"), phase(.5, 0, "side", "side")],
};

/** Setup validation shared by model-space Bind input and world-space plan data. */
export function validateSphinxGoals(goals: Float64Array): void {
  if (goals.length !== 12) throw new RangeError("Sphinx goals require 12 finite model coordinates.");
  for (let i = 0; i < 12; i++) if (!Number.isFinite(goals[i])) {
    throw new RangeError("Sphinx goals require 12 finite model coordinates.");
  }
}

/** Borrowed immutable goal tables and reused output; compile once per rest bind. */
export class CatPoseContactPlan {
  private readonly goals = {} as Record<CatPoseId, Float64Array>;
  private sphinxPrepared = false;
  private readonly routes = {} as Record<CatPoseId, Partial<Record<CatPoseId, { key: string; table: readonly Phase[] }>>>;
  readonly output: { feet: number; body: BodySupport | null; phase: number; route: string; goals: Float64Array } = {
    feet: 15, body: null, phase: 0, route: "", goals: new Float64Array(12),
  };

  constructor(neutralGoals: Float64Array) {
    for (const id of Object.keys(feet) as CatPoseId[]) this.routes[id] = {};
    for (const edge of CAT_POSE_EDGES) {
      const key = `${edge.from}:${edge.to}`;
      this.routes[edge.from][edge.to] = { key, table: phases[key] };
    }
    for (const id of Object.keys(feet) as CatPoseId[]) {
      this.goals[id] = new Float64Array(neutralGoals);
      // Forefeet extend forward only AFTER release, and land at this authored
      // root/model-space destination, never at a fresh moving FK endpoint.
      if (id === "sphinx") { this.goals[id][2] += .1; this.goals[id][5] += .1; }
    }
  }

  /** Static setup only; later active contacts still use applyPlan's release rule. */
  configureSphinxGoals(goals: Float64Array): void {
    validateSphinxGoals(goals);
    if (this.sphinxPrepared) {
      for (let i = 0; i < 12; i++) if (goals[i] !== this.goals.sphinx[i]) {
        throw new RangeError("Sphinx rest goals are immutable after preparation.");
      }
      return;
    }
    this.goals.sphinx = new Float64Array(goals);
    this.sphinxPrepared = true;
  }

  resolve(frame: CatPoseFrame): typeof this.output {
    const output = this.output, from = frame.transitionFrom, to = frame.transitionTo;
    if (from === null || to === null) {
      if (frame.supportMask < 0) throw new RangeError("Unresolved support phase: missing directed edge.");
      output.feet = feet[frame.pose]; output.body = body[frame.pose]; output.phase = 0;
      output.route = frame.pose; output.goals = this.goals[frame.pose];
      return output;
    }
    if (!Number.isFinite(frame.transitionProgress) || frame.transitionProgress < 0 || frame.transitionProgress > 1) {
      throw new RangeError("Contact phase progress must be finite and within 0..1.");
    }
    const route = this.routes[from][to];
    if (!route) throw new RangeError("Contact planning requires an authored directed edge.");
    const table = route.table;
    let index = 0;
    while (index + 1 < table.length && frame.transitionProgress >= table[index + 1].at) index++;
    const selected = table[index];
    output.feet = selected.feet; output.body = selected.body; output.phase = index; output.route = route.key;
    output.goals = this.goals[selected.landing];
    return output;
  }
}
