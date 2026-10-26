/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CameraCoatCapture } from "@/features/pet-home/components/CameraCoatCapture";

const onColors = vi.fn();
const onClose = vi.fn();

vi.mock("@/features/pet-home/coat-from-image", () => ({
  coatColorsFromFile: vi.fn(async () => ({
    primary: "#8b5a2b",
    secondary: "#c4a574",
    accent: "#c9a0a8",
  })),
}));

import { coatColorsFromFile } from "@/features/pet-home/coat-from-image";

beforeEach(() => {
  onColors.mockClear();
  onClose.mockClear();
  vi.mocked(coatColorsFromFile).mockClear();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: undefined,
  });
});

afterEach(() => {
  cleanup();
});

describe("CameraCoatCapture gallery", () => {
  it("hints to center the pet for better color detection", () => {
    render(
      <CameraCoatCapture open onClose={onClose} onColors={onColors} />,
    );
    expect(screen.getByText(/centr/i)).toBeTruthy();
  });

  it("exposes a gallery upload control", () => {
    render(
      <CameraCoatCapture open onClose={onClose} onColors={onColors} />,
    );
    expect(
      screen.getByRole("button", { name: /Subir de galería/i }),
    ).toBeTruthy();
  });

  it("keeps gallery usable when the camera is unavailable", () => {
    render(
      <CameraCoatCapture open onClose={onClose} onColors={onColors} />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    const gallery = screen.getByRole("button", { name: /Subir de galería/i });
    expect((gallery as HTMLButtonElement).disabled).toBe(false);
  });

  it("applies coat colors from a chosen file and closes", async () => {
    render(
      <CameraCoatCapture open onClose={onClose} onColors={onColors} />,
    );
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.accept).toMatch(/image/);

    const file = new File([new Uint8Array([1])], "michi.png", {
      type: "image/png",
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(coatColorsFromFile).toHaveBeenCalledWith(file);
      expect(onColors).toHaveBeenCalledWith({
        primary: "#8b5a2b",
        secondary: "#c4a574",
        accent: "#c9a0a8",
      });
      // Preservation control: camera extraction has always emitted colors only.
      expect(Object.keys(onColors.mock.lastCall![0]).sort()).toEqual(["accent", "primary", "secondary"]);
      expect(Object.hasOwn(onColors.mock.lastCall![0], "pattern")).toBe(false);
      expect(onClose).toHaveBeenCalled();
    });
  });
});
