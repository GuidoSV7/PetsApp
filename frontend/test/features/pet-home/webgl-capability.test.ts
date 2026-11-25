/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { detectWebGLSupport } from "@/features/pet-home/webgl-capability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("detectWebGLSupport", () => {
  it("returns true when webgl2 context is available", () => {
    const getContext = vi.fn((type: string) =>
      type === "webgl2" ? ({} as RenderingContext) : null,
    );
    const createElement = vi.fn(() => ({ getContext })) as unknown as Document["createElement"];
    expect(detectWebGLSupport(createElement)).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");
  });

  it("falls back to webgl when webgl2 is missing", () => {
    const getContext = vi.fn((type: string) =>
      type === "webgl" ? ({} as RenderingContext) : null,
    );
    const createElement = vi.fn(() => ({ getContext })) as unknown as Document["createElement"];
    expect(detectWebGLSupport(createElement)).toBe(true);
  });

  it("returns false when no context can be created", () => {
    const getContext = vi.fn(() => null);
    const createElement = vi.fn(() => ({ getContext })) as unknown as Document["createElement"];
    expect(detectWebGLSupport(createElement)).toBe(false);
  });

  it("returns false when getContext throws", () => {
    const createElement = vi.fn(() => ({
      getContext: () => {
        throw new Error("webgl blocked");
      },
    })) as unknown as Document["createElement"];
    expect(detectWebGLSupport(createElement)).toBe(false);
  });
});
