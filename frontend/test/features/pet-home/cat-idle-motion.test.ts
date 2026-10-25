import { afterEach, describe, expect, it, vi } from "vitest";
import { sampleCatIdleMotion } from "@/features/pet-home/cat-idle-motion";
import { needVisualCues } from "@/features/pet-home/need-visuals";

const normal = needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 100 });
const tired = { ...normal, ...needVisualCues({ hunger: 100, fun: 100, energy: 0, hygiene: 100 }) };
const bored = { ...normal, funLow: true };
const sample = (t: number, cues = normal, reducedMotion = false, seed = 0) =>
  sampleCatIdleMotion(t, cues, { seed, reducedMotion });
const blink = (t: number, cues = normal) => {
  const result = sample(t, cues);
  return [result.eyeL?.scaleY ?? 1, result.eyeR?.scaleY ?? 1];
};
// Independent Python integer arithmetic fixtures; no production schedule helper.
const blinks = [
  { cues: normal, windows: [[3.7082039185333997, 3.8282039185334], [7.663904644204304, 7.783904644204304], [13.242505924087018, 13.362505924087017]], range: [3, 6], duration: .12 },
  { cues: tired, windows: [[2.472135945688933, 2.8221359456889332], [5.379269762802869, 5.729269762802868], [9.368337282724678, 9.718337282724677]], range: [2, 4], duration: .35 },
];
afterEach(() => vi.restoreAllMocks());

describe("seeded per-part idle", () => {
  it.each(blinks)("pins exact normal/tired blink boundaries ($duration seconds)", ({ cues, windows, range, duration }) => {
    let previousEnd = 0;
    for (const [start, end] of windows) {
      expect(start - previousEnd).toBeGreaterThanOrEqual(range[0]);
      expect(start - previousEnd).toBeLessThanOrEqual(range[1]);
      expect(end - start).toBeCloseTo(duration, 12);
      expect(blink(start - 1e-6, cues)).toEqual([1, 1]);
      for (const t of [start, start + duration / 2, end - 1e-6]) expect(blink(t, cues)).toEqual([.1, .1]);
      expect(blink(end, cues)).toEqual([1, 1]);
      previousEnd = end;
    }
  });
  it("is seed-specific, order-independent, immutable and clock/random free", () => {
    const frozen = Object.freeze({ ...normal });
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw Error("random"); });
    const clock = vi.spyOn(Date, "now").mockImplementation(() => { throw Error("clock"); });
    const first = sample(3.75, frozen);
    expect(first.eyeL?.scaleY).toBe(.1);
    expect(sample(3.75, frozen, false, 123).eyeL).toBeUndefined();
    sample(80, tired, true, 99); sample(0, bored); sample(28800, normal);
    expect(sample(3.75, frozen)).toEqual(first);
    expect(random).not.toHaveBeenCalled(); expect(clock).not.toHaveBeenCalled();
    expect(frozen).toEqual(normal);
  });
  it.each([
    { cues: normal, events: [[6.0439967550337315, 6.223996755033731, "earR"], [14.686941168271005, 14.866941168271005, "earL"], [20.680656832642853, 20.860656832642853, "earR"]], range: [5, 9] },
    { cues: bored, events: [[11.565995132550597, 11.745995132550597, "earR"], [27.030411752406508, 27.210411752406507, "earL"], [38.52098524896428, 38.70098524896428, "earR"]], range: [10, 16] },
  ])("pins single-ear onset intervals and duration ($range)", ({ cues, events, range }) => {
    let previousStart = 0;
    for (const [a, b, side] of events) {
      const start = a as number, end = b as number, id = side as "earL" | "earR";
      const other = id === "earL" ? "earR" : "earL";
      expect(start - previousStart).toBeGreaterThanOrEqual(range[0]);
      expect(start - previousStart).toBeLessThanOrEqual(range[1]);
      expect(end - start).toBeCloseTo(.18, 12);
      expect(sample(start - 1e-6, cues)[id]).toBeUndefined();
      for (const t of [start, start + .09, end - 1e-6]) {
        expect(sample(t, cues)[id]?.rotation).toEqual([.25, 0, 0]);
        expect(sample(t, cues)[other]).toBeUndefined();
      }
      expect(sample(end, cues)[id]).toBeUndefined();
      previousStart = start;
    }
    // Energy speed/amplitude must not stretch tic timing.
    expect(sample(events[0][0] as number, { ...cues, idleSpeed: .45, idleAmp: .25 }).earR?.rotation?.[0]).toBe(.25);
  });
  it("uses absolute tail targets with phase, current cues and absolute caps", () => {
    for (const cues of [normal, tired, { ...normal, idleAmp: 10 }]) for (const t of [0, .2, .9, 1.8, 3, 5, 14]) {
      const result = sample(t, cues);
      const mid = Math.max(-.35, Math.min(.35, Math.sin(t * 2 * cues.idleSpeed) * .25 * cues.idleAmp));
      const tip = Math.max(-.46, Math.min(.46, Math.sin(t * 2 * cues.idleSpeed - .6) * .25 * cues.idleAmp * 1.3));
      expect(result.tailMid?.rotation?.[2]).toBeCloseTo(mid, 12);
      expect(result.tailTip?.rotation?.[2]).toBeCloseTo(tip - mid, 12);
      expect(Math.abs(mid)).toBeLessThanOrEqual(.35);
      expect(Math.abs(mid + result.tailTip!.rotation![2])).toBeLessThanOrEqual(.46 + 1e-12);
    }
  });
  it("targets only six carriers, reduced output is blink only with no pupil/inner-ear writes", () => {
    const allowed = ["eyeL", "eyeR", "tailMid", "tailTip", "earL", "earR"];
    for (const cues of [normal, tired, bored]) for (const t of [0, 2.5, 3.75, 6.1, 11.6, 27.1]) {
      expect(Object.keys(sample(t, cues)).every((id) => allowed.includes(id))).toBe(true);
      const reduced = sample(t, cues, true);
      expect(Object.keys(reduced).every((id) => id === "eyeL" || id === "eyeR")).toBe(true);
      expect(reduced.eyeL).toEqual(sample(t, cues).eyeL);
    }
    expect(sample(3.75, normal, true)).toEqual({ eyeL: { scaleY: .1 }, eyeR: { scaleY: .1 } });
    expect(sample(0, normal, true)).toEqual({});
  });
});
