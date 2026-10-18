/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonalizeStrip } from "@/features/pet-home/components/PersonalizeStrip";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

describe("PersonalizeStrip compact toggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("hides presets until Personalizar is expanded", () => {
    const onSelect = vi.fn();
    const onCamera = vi.fn();
    render(
      <PersonalizeStrip
        activeCoat={DEFAULT_GREY_COAT}
        onSelectCoat={onSelect}
        onOpenCamera={onCamera}
      />,
    );

    const toggle = screen.getByRole("button", { name: /^Personalizar$/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("button", { name: /Pelaje Naranja/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Colores de mi gato/i })).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("region", { name: /Personalizar/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Pelaje Naranja/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Colores de mi gato/i }));
    expect(onCamera).toHaveBeenCalled();
  });
});
