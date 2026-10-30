import { moodFromNeeds, type PetSnapshot } from './pet-rules.js';

export type PetStateDto = PetSnapshot & { mood: string };

/** Deliberately whitelist gameplay fields: no ownership, guest key or timestamps. */
export function petSnapshot(row: PetSnapshot): PetSnapshot {
  return {
    coins: row.coins,
    needs: { ...row.needs },
    coat: { ...row.coat },
    statusKey: row.statusKey,
    name: row.name,
    renameCount: row.renameCount,
  };
}

export function petStateDto(row: PetSnapshot): PetStateDto {
  const snapshot = petSnapshot(row);
  return {
    ...snapshot,
    statusKey: snapshot.statusKey === 'broke' ? 'idle' : snapshot.statusKey,
    mood: moodFromNeeds(snapshot.needs),
  };
}
