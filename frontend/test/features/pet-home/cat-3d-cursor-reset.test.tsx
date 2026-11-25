/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import * as React from "react";

vi.mock("@react-three/fiber", () => ({
  useFrame: () => undefined,
}));

vi.mock("@/features/pet-home/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));

vi.mock("@/features/pet-home/components/CatPoseDriver", () => ({
  CatPoseDriver: () => null,
}));

vi.mock("@/features/pet-home/components/CatSkeletonParts", () => ({
  CatSkeletonParts: () => null,
}));

import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

afterEach(() => {
  cleanup();
  document.body.style.cursor = "";
});

describe("Cat3DModel cursor cleanup (#36)", () => {
  it("resets document.body cursor on unmount", () => {
    document.body.style.cursor = "pointer";
    const { unmount } = render(
      <Cat3DModel colors={DEFAULT_GREY_COAT} />,
    );
    unmount();
    expect(document.body.style.cursor).toBe("auto");
  });
});
