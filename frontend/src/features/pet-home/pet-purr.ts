export type PurrPlayer = {
  play: () => void;
  stop: () => void;
};

type PurrOptions = {
  /** Injected for tests; `null` disables audio safely. */
  context?: AudioContext | null;
  /** How long the purr rumbles (seconds). */
  durationSec?: number;
};

type ActiveGraph = {
  nodes: Array<{ stop?: (when?: number) => void; disconnect: () => void }>;
  stopAt: number;
};

function resolveContext(
  injected?: AudioContext | null,
): AudioContext | null {
  if (injected === null) return null;
  if (injected) return injected;
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  try {
    return new Ctx();
  } catch {
    return null;
  }
}

/**
 * Procedural cat purr via Web Audio (no binary asset).
 * Safe no-op when AudioContext is unavailable.
 */
export function createPurrPlayer(options: PurrOptions = {}): PurrPlayer {
  let ctx = resolveContext(options.context);
  let active: ActiveGraph | null = null;
  const durationSec = options.durationSec ?? 1.6;

  const stop = () => {
    if (!active) return;
    for (const node of active.nodes) {
      try {
        node.stop?.(0);
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    }
    active = null;
  };

  const play = () => {
    if (options.context === null) return;
    if (!ctx) {
      ctx = resolveContext(undefined);
    }
    if (!ctx) return;

    void ctx.resume().catch(() => undefined);
    stop();

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    carrier.type = "triangle";
    carrier.frequency.setValueAtTime(28, now);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(8, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(10, now);
    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.linearRampToValueAtTime(0.16, now + durationSec * 0.55);
    gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

    carrier.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + durationSec + 0.05);
    lfo.stop(now + durationSec + 0.05);

    active = {
      nodes: [carrier, lfo, lfoGain, filter, gain],
      stopAt: now + durationSec,
    };

    globalThis.setTimeout(() => {
      if (active && ctx && ctx.currentTime >= active.stopAt - 0.02) {
        stop();
      }
    }, (durationSec + 0.1) * 1000);
  };

  return { play, stop };
}
