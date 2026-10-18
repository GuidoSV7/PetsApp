import { describe, it, expect } from "vitest";
import {
  COIN_COSTS,
  COIN_REWARDS,
  STARTING_COINS,
  canAfford,
  earnCoins,
  spendCoins,
} from "@/features/pet-home/pet-coins";

describe("pet-coins", () => {
  it("exposes starting balance and rates", () => {
    expect(STARTING_COINS).toBe(30);
    expect(COIN_COSTS.feed).toBe(5);
    expect(COIN_REWARDS.pet).toBe(2);
    expect(COIN_REWARDS.coat).toBe(5);
  });

  it("canAfford is true only when balance covers cost", () => {
    expect(canAfford(5, 5)).toBe(true);
    expect(canAfford(4, 5)).toBe(false);
  });

  it("spendCoins deducts when affordable", () => {
    expect(spendCoins(30, 5)).toEqual({ ok: true, balance: 25 });
  });

  it("spendCoins refuses and keeps balance when broke", () => {
    expect(spendCoins(3, 5)).toEqual({ ok: false, balance: 3 });
  });

  it("earnCoins adds rewards", () => {
    expect(earnCoins(10, 2)).toBe(12);
  });

  it("earnCoins ignores negative amounts", () => {
    expect(earnCoins(10, -4)).toBe(10);
  });
});
