import { describe, expect, it } from 'vitest';
import * as rules from './pet-rules.js';
import {
  COIN_COSTS,
  DEFAULT_PET_NAME,
  RENAME_COST,
  STARTING_COINS,
  applyCare,
  applyCoat,
  applyRename,
  initialSnapshot,
  moodFromNeeds,
  normalizePetName,
} from './pet-rules.js';

describe('pet-rules', () => {
  it('keeps the exact append-only coat pattern identifiers and order', () => {
    expect(rules.COAT_PATTERNS).toEqual([
      'solid',
      'tabby',
      'tuxedo',
      'calico',
      'pointed',
    ]);
  });

  it('normalizes unknown stored patterns but retains every recognized pattern', () => {
    expect(rules.normalizeCoatPattern).toBeTypeOf('function');
    for (const pattern of ['solid', 'tabby', 'tuxedo', 'calico', 'pointed']) {
      expect(rules.normalizeCoatPattern(pattern)).toBe(pattern);
    }
    expect(rules.normalizeCoatPattern('zebra')).toBe('solid');
  });

  it('starts with a solid pattern and the unchanged default palette', () => {
    expect(initialSnapshot().coat).toEqual({
      primary: '#8a8a8e',
      secondary: '#b4b4b8',
      accent: '#c9a0a8',
      pattern: 'solid',
    });
  });

  it('preserves the stored pattern when applyCoat receives only colors', () => {
    const original = initialSnapshot();
    const saved = {
      ...original,
      coat: { ...original.coat, pattern: 'tabby' as const },
    };
    const colors = {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    };
    expect(applyCoat(saved, colors)).toEqual({
      ...saved,
      coat: { ...colors, pattern: 'tabby' },
      statusKey: 'coated',
    });
    expect(saved.coat.pattern).toBe('tabby');
    expect(saved.statusKey).toBe('idle');
  });

  it('changes an explicitly supplied pattern without spending coins or altering needs', () => {
    const saved = initialSnapshot();
    const coat = {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
      pattern: 'calico' as const,
    };
    expect(applyCoat(saved, coat)).toEqual({
      ...saved,
      coat,
      statusKey: 'coated',
    });
    expect(saved).toEqual(initialSnapshot());
  });

  it('starts with frontend defaults', () => {
    const snap = initialSnapshot();
    expect(STARTING_COINS).toBe(0);
    expect(snap.coins).toBe(0);
    expect(snap.needs.hunger).toBe(72);
    expect(snap.statusKey).toBe('idle');
    expect(snap.name).toBe(DEFAULT_PET_NAME);
    expect(snap.renameCount).toBe(0);
  });

  it('feed is free and raises hunger', () => {
    const result = applyCare(initialSnapshot(), 'feed');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.coins).toBe(0);
    expect(result.snapshot.needs.hunger).toBe(90);
    expect(result.snapshot.statusKey).toBe('fed');
  });

  it.each([0, 5, 37])(
    'repeats every action without changing balance %s',
    (coins) => {
      let snapshot = {
        ...initialSnapshot(),
        coins,
        needs: { hunger: 10, fun: 10, energy: 10, hygiene: 10 },
      };
      for (const hunger of [28, 46, 64]) {
        const result = applyCare(snapshot, 'feed');
        expect(result).toEqual({
          ok: true,
          snapshot: {
            ...snapshot,
            needs: { ...snapshot.needs, hunger },
            statusKey: 'fed',
          },
        });
        if (result.ok) snapshot = result.snapshot;
      }
      for (const action of ['play', 'sleep', 'bathe', 'pet'] as const) {
        for (let i = 0; i < 3; i++) {
          const result = applyCare(snapshot, action);
          expect(result).toEqual({
            ok: true,
            snapshot: {
              ...snapshot,
              needs: rules.applyNeeds(snapshot.needs, action),
              statusKey:
                action === 'sleep'
                  ? 'slept'
                  : action === 'bathe'
                    ? 'bathed'
                    : 'petted',
            },
          });
          if (result.ok) snapshot = result.snapshot;
        }
      }
      expect(snapshot.coins).toBe(coins);
    },
  );

  it.each([
    ['play', { hunger: 72, fun: 96, energy: 61, hygiene: 78 }, 'petted'],
    ['sleep', { hunger: 72, fun: 80, energy: 85, hygiene: 78 }, 'slept'],
    ['bathe', { hunger: 72, fun: 80, energy: 65, hygiene: 96 }, 'bathed'],
    ['pet', { hunger: 72, fun: 88, energy: 65, hygiene: 78 }, 'petted'],
  ] as const)('preserves %s effects and status', (action, needs, statusKey) => {
    const snapshot = initialSnapshot();
    expect(applyCare(snapshot, action)).toEqual({
      ok: true,
      snapshot: { ...snapshot, needs, statusKey },
    });
    expect(snapshot).toEqual(initialSnapshot());
  });

  it('play and pet do not mint coins', () => {
    const play = applyCare(initialSnapshot(), 'play');
    expect(play.ok && play.snapshot.coins).toBe(STARTING_COINS);
    const pet = applyCare(initialSnapshot(), 'pet');
    expect(pet.ok && pet.snapshot.coins).toBe(STARTING_COINS);
  });

  it('coat replaces palette without minting coins', () => {
    const next = applyCoat(initialSnapshot(), {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    });
    expect(next.coins).toBe(STARTING_COINS);
    expect(next.coat.primary).toBe('#112233');
    expect(next.statusKey).toBe('coated');
  });

  it('mood bands', () => {
    expect(
      moodFromNeeds({ hunger: 90, fun: 90, energy: 90, hygiene: 90 }),
    ).toBe('Feliz');
    expect(
      moodFromNeeds({ hunger: 50, fun: 50, energy: 50, hygiene: 50 }),
    ).toBe('Bien');
    expect(
      moodFromNeeds({ hunger: 10, fun: 10, energy: 10, hygiene: 10 }),
    ).toBe('Bajo');
  });

  it('first and later renames are free', () => {
    const first = applyRename(initialSnapshot(), 'Luna');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.snapshot.name).toBe('Luna');
    expect(first.snapshot.renameCount).toBe(1);
    expect(first.snapshot.coins).toBe(STARTING_COINS);
    expect(first.snapshot.statusKey).toBe('renamed');

    const second = applyRename(first.snapshot, 'Nube');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.snapshot.name).toBe('Nube');
    expect(second.snapshot.renameCount).toBe(2);
    expect(second.snapshot.coins).toBe(0);
  });

  it.each([0, 5, 37])(
    'renames repeatedly without changing balance %s',
    (coins) => {
      let snapshot = { ...initialSnapshot(), coins };
      for (const [index, name] of ['Luna', 'Nube', 'Sol'].entries()) {
        const result = applyRename(snapshot, name);
        expect(result).toEqual({
          ok: true,
          snapshot: {
            ...snapshot,
            name,
            renameCount: index + 1,
            statusKey: 'renamed',
          },
        });
        if (result.ok) snapshot = result.snapshot;
      }
      expect(RENAME_COST).toBe(0);
      expect(COIN_COSTS.feed).toBe(0);
      expect(rules.renameCostFor(snapshot.renameCount)).toBe(0);
    },
  );

  it('rejects blank or unchanged names', () => {
    expect(normalizePetName('   ')).toBeNull();
    expect(normalizePetName('a'.repeat(17))).toBeNull();
    const same = applyRename(initialSnapshot(), '  Michi  ');
    expect(same.ok).toBe(false);
    if (same.ok) return;
    expect(same.reason).toBe('invalid');
    expect(same.snapshot).toEqual(initialSnapshot());
    for (const name of [' ', 'a'.repeat(17)]) {
      const snapshot = { ...initialSnapshot(), renameCount: 2 };
      expect(applyRename(snapshot, name)).toEqual({
        ok: false,
        reason: 'invalid',
        snapshot,
      });
    }
    expect(normalizePetName('  Luna   Sol  ')).toBe('Luna Sol');
    expect(normalizePetName('a'.repeat(16))).toBe('a'.repeat(16));
  });
});
