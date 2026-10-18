/** Care + coin rules for the virtual pet (mirrors frontend). */

export const STARTING_COINS = 30;

export const COIN_COSTS = { feed: 5 } as const;

export const COIN_REWARDS = { pet: 2, coat: 5 } as const;

export const INITIAL_NEEDS = {
  hunger: 72,
  fun: 80,
  energy: 65,
  hygiene: 78,
} as const;

export const DEFAULT_COAT = {
  primary: '#8a8a8e',
  secondary: '#b4b4b8',
  accent: '#c9a0a8',
} as const;

export type PetNeeds = {
  hunger: number;
  fun: number;
  energy: number;
  hygiene: number;
};

export type PetCoat = {
  primary: string;
  secondary: string;
  accent: string;
};

export type CareAction = 'feed' | 'play' | 'sleep' | 'bathe' | 'pet';

export type MoodLabel = 'Feliz' | 'Bien' | 'Bajo';

export type PetSnapshot = {
  coins: number;
  needs: PetNeeds;
  coat: PetCoat;
  statusKey: string;
};

const NEED_DELTAS: Record<CareAction, Partial<PetNeeds>> = {
  feed: { hunger: 18 },
  play: { fun: 16, energy: -4 },
  sleep: { energy: 20 },
  bathe: { hygiene: 18 },
  pet: { fun: 8 },
};

const STATUS_FOR_ACTION: Record<CareAction, string> = {
  feed: 'fed',
  play: 'petted',
  sleep: 'slept',
  bathe: 'bathed',
  pet: 'petted',
};

function clampNeed(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function applyNeeds(needs: PetNeeds, action: CareAction): PetNeeds {
  const delta = NEED_DELTAS[action];
  return {
    hunger: clampNeed(needs.hunger + (delta.hunger ?? 0)),
    fun: clampNeed(needs.fun + (delta.fun ?? 0)),
    energy: clampNeed(needs.energy + (delta.energy ?? 0)),
    hygiene: clampNeed(needs.hygiene + (delta.hygiene ?? 0)),
  };
}

export function needsAverage(needs: PetNeeds): number {
  return Math.round(
    (needs.hunger + needs.fun + needs.energy + needs.hygiene) / 4,
  );
}

export function moodFromNeeds(needs: PetNeeds): MoodLabel {
  const avg = needsAverage(needs);
  if (avg < 40) return 'Bajo';
  if (avg < 70) return 'Bien';
  return 'Feliz';
}

export function initialSnapshot(): PetSnapshot {
  return {
    coins: STARTING_COINS,
    needs: { ...INITIAL_NEEDS },
    coat: { ...DEFAULT_COAT },
    statusKey: 'idle',
  };
}

export type CareResult =
  | { ok: true; snapshot: PetSnapshot }
  | { ok: false; reason: 'broke'; snapshot: PetSnapshot };

/** Pure transition for a care action. */
export function applyCare(
  snapshot: PetSnapshot,
  action: CareAction,
): CareResult {
  if (action === 'feed') {
    if (snapshot.coins < COIN_COSTS.feed) {
      return {
        ok: false,
        reason: 'broke',
        snapshot: { ...snapshot, statusKey: 'broke' },
      };
    }
    return {
      ok: true,
      snapshot: {
        coins: snapshot.coins - COIN_COSTS.feed,
        needs: applyNeeds(snapshot.needs, 'feed'),
        coat: snapshot.coat,
        statusKey: STATUS_FOR_ACTION.feed,
      },
    };
  }

  let coins = snapshot.coins;
  if (action === 'play' || action === 'pet') {
    coins += COIN_REWARDS.pet;
  }

  return {
    ok: true,
    snapshot: {
      coins,
      needs: applyNeeds(snapshot.needs, action),
      coat: snapshot.coat,
      statusKey: STATUS_FOR_ACTION[action],
    },
  };
}

export function applyCoat(
  snapshot: PetSnapshot,
  coat: PetCoat,
): PetSnapshot {
  return {
    ...snapshot,
    coat: { ...coat },
    coins: snapshot.coins + COIN_REWARDS.coat,
    statusKey: 'coated',
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export const CARE_ACTIONS: readonly CareAction[] = [
  'feed',
  'play',
  'sleep',
  'bathe',
  'pet',
] as const;

export function isCareAction(value: string): value is CareAction {
  return (CARE_ACTIONS as readonly string[]).includes(value);
}
