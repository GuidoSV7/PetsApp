import type { NeedVisualCues } from "./need-visuals";

const next = (state: number) => (Math.imul(1664525, state) + 1013904223) >>> 0;
const unit = 4294967296;

/** Incremental equivalent of the original call-local seeded blink/ear schedule.
 * No tail delta: the three spring targets own that channel exclusively.
 */
export class CatIdleCursor {
  eyeScale = 1;
  earSide: "L" | "R" | null = null;
  private blinkSeed = 0;
  private ticSeed = 0;
  private sideSeed = 0;
  private blinkStart = 0;
  private blinkEnd = 0;
  private earOnset = 0;
  private nextEar: "L" | "R" = "L";
  constructor(private readonly seed: number, cues: NeedVisualCues) { this.reset(cues, 0); }

  reset(cues: NeedVisualCues, elapsed: number) {
    this.blinkSeed = this.seed >>> 0;
    this.ticSeed = (this.seed ^ 0x9e3779b9) >>> 0;
    this.sideSeed = (this.seed ^ 0x85ebca6b) >>> 0;
    this.blinkStart = this.blinkEnd = this.earOnset = 0;
    this.advanceBlink(cues);
    this.advanceEar(cues);
    this.sample(elapsed, cues);
  }
  private advanceBlink(cues: NeedVisualCues) {
    this.blinkSeed = next(this.blinkSeed);
    this.blinkStart = this.blinkEnd + (cues.energyLow ? 2 : 3) + (cues.energyLow ? 2 : 3) * this.blinkSeed / unit;
    this.blinkEnd = this.blinkStart + (cues.energyLow ? .35 : .12);
  }
  private advanceEar(cues: NeedVisualCues) {
    this.ticSeed = next(this.ticSeed);
    this.sideSeed = next(this.sideSeed);
    this.earOnset += (cues.funLow ? 10 : 5) + (cues.funLow ? 6 : 4) * this.ticSeed / unit;
    this.nextEar = this.sideSeed / unit < .5 ? "L" : "R";
  }
  sample(elapsed: number, cues: NeedVisualCues) {
    while (elapsed >= this.blinkEnd) this.advanceBlink(cues);
    while (elapsed >= this.earOnset + .18) this.advanceEar(cues);
    this.eyeScale = elapsed >= this.blinkStart ? .1 : 1;
    this.earSide = elapsed >= this.earOnset ? this.nextEar : null;
  }
}
