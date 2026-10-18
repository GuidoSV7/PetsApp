import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPurrPlayer } from "@/features/pet-home/pet-purr";

type FakeNode = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  frequency?: { value: number; setValueAtTime: ReturnType<typeof vi.fn> };
  gain?: { value: number; setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
  type?: string;
};

function fakeOsc(): FakeNode {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: {
      value: 0,
      setValueAtTime: vi.fn(),
    },
    type: "sine",
  };
}

function fakeGain(): FakeNode {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
  };
}

function fakeContext() {
  const destination = { connect: vi.fn() };
  return {
    currentTime: 0,
    destination,
    state: "running" as AudioContextState,
    resume: vi.fn(async () => undefined),
    createOscillator: vi.fn(() => fakeOsc()),
    createGain: vi.fn(() => fakeGain()),
    createBiquadFilter: vi.fn(() => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      type: "lowpass",
      frequency: { value: 0, setValueAtTime: vi.fn() },
    })),
  };
}

describe("createPurrPlayer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("play starts oscillators against the given context", () => {
    const ctx = fakeContext();
    const player = createPurrPlayer({
      context: ctx as unknown as AudioContext,
    });
    player.play();
    expect(ctx.createOscillator).toHaveBeenCalled();
    expect(ctx.createGain).toHaveBeenCalled();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeNode;
    expect(osc.start).toHaveBeenCalled();
  });

  it("stop ends active nodes without throwing", () => {
    const ctx = fakeContext();
    const player = createPurrPlayer({
      context: ctx as unknown as AudioContext,
    });
    player.play();
    expect(() => player.stop()).not.toThrow();
    const osc = ctx.createOscillator.mock.results[0]?.value as FakeNode;
    expect(osc.stop).toHaveBeenCalled();
  });

  it("does not throw when context is null", () => {
    const player = createPurrPlayer({ context: null });
    expect(() => player.play()).not.toThrow();
    expect(() => player.stop()).not.toThrow();
  });
});
