import { describe, expect, it } from 'vitest';
import { initialSnapshot } from './pet-rules.js';
import { petSnapshot, petStateDto } from './pet-state.mapper.js';

describe('shared gameplay-only mapper (preservation extraction)', () => {
  it('copies nested gameplay fields, maps broke only in DTO, and never exposes metadata', () => {
    const row = { ...initialSnapshot(), statusKey: 'broke', id: 'private-id', guestKey: 'internal-key', userId: 'owner', createdAt: new Date(), updatedAt: new Date() };
    const snapshot = petSnapshot(row);
    expect(snapshot).toEqual({ ...initialSnapshot(), statusKey: 'broke' });
    expect(snapshot.needs).not.toBe(row.needs);
    expect(snapshot.coat).not.toBe(row.coat);
    expect(petStateDto(row)).toEqual({ ...initialSnapshot(), mood: 'Feliz' });
    expect(row.statusKey).toBe('broke');
  });
});
