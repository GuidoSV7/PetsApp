import { describe, expect, it } from 'vitest';
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
  it('starts with frontend defaults', () => {
    const snap = initialSnapshot();
    expect(STARTING_COINS).toBe(5);
    expect(snap.coins).toBe(5);
    expect(snap.needs.hunger).toBe(72);
    expect(snap.statusKey).toBe('idle');
    expect(snap.name).toBe(DEFAULT_PET_NAME);
    expect(snap.renameCount).toBe(0);
  });

  it('feed spends coins and raises hunger', () => {
    const result = applyCare(initialSnapshot(), 'feed');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.coins).toBe(STARTING_COINS - COIN_COSTS.feed);
    expect(result.snapshot.needs.hunger).toBe(90);
    expect(result.snapshot.statusKey).toBe('fed');
  });

  it('feed refuses when broke', () => {
    const broke = { ...initialSnapshot(), coins: 3 };
    const result = applyCare(broke, 'feed');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.snapshot.coins).toBe(3);
    expect(result.snapshot.statusKey).toBe('broke');
  });

  it('play and pet earn coins', () => {
    const play = applyCare(initialSnapshot(), 'play');
    expect(play.ok && play.snapshot.coins).toBe(STARTING_COINS + 2);
    const pet = applyCare(initialSnapshot(), 'pet');
    expect(pet.ok && pet.snapshot.coins).toBe(STARTING_COINS + 2);
  });

  it('coat earns coins and replaces palette', () => {
    const next = applyCoat(initialSnapshot(), {
      primary: '#112233',
      secondary: '#445566',
      accent: '#778899',
    });
    expect(next.coins).toBe(STARTING_COINS + 5);
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

  it('first rename is free and later renames cost coins', () => {
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
    expect(second.snapshot.coins).toBe(STARTING_COINS - RENAME_COST);
  });

  it('paid rename refuses when broke', () => {
    const named = {
      ...initialSnapshot(),
      name: 'Luna',
      renameCount: 1,
      coins: 3,
    };
    const result = applyRename(named, 'Nube');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('broke');
    expect(result.snapshot.name).toBe('Luna');
    expect(result.snapshot.coins).toBe(3);
    expect(result.snapshot.statusKey).toBe('broke');
  });

  it('rejects blank or unchanged names', () => {
    expect(normalizePetName('   ')).toBeNull();
    expect(normalizePetName('a'.repeat(17))).toBeNull();
    const same = applyRename(initialSnapshot(), '  Michi  ');
    expect(same.ok).toBe(false);
    if (same.ok) return;
    expect(same.reason).toBe('invalid');
  });
});
