/** Local UI coin economy (no backend wallet yet). */

export const STARTING_COINS = 30;

export const COIN_COSTS = {
  feed: 5,
} as const;

export const COIN_REWARDS = {
  pet: 2,
  coat: 5,
} as const;

export function canAfford(balance: number, cost: number): boolean {
  return balance >= cost;
}

export function spendCoins(
  balance: number,
  cost: number,
): { ok: boolean; balance: number } {
  if (!canAfford(balance, cost)) {
    return { ok: false, balance };
  }
  return { ok: true, balance: balance - cost };
}

export function earnCoins(balance: number, amount: number): number {
  if (amount <= 0) return balance;
  return balance + amount;
}

export function coinsLabel(balance: number): string {
  return `Monedas: ${balance}`;
}
