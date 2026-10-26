/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PersonalizeStrip } from "@/features/pet-home/components/PersonalizeStrip";
import { COAT_PRESETS } from "@/features/pet-home/pet-customize";
import type { PetCoatInput } from "@/features/pet-home/coat-patterns";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

describe("PersonalizeStrip compact toggle", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    ["calico", false], ["solid", true], [undefined, true], [null, true], ["zebra", true],
  ])("selects by case-insensitive primary and normalized pattern %s (S10)", (pattern, selected) => {
    const activeCoat = { primary: DEFAULT_GREY_COAT.primary.toUpperCase(), secondary: "#111111", accent: "#222222", pattern };
    render(<PersonalizeStrip activeCoat={activeCoat as unknown as PetCoatInput} onSelectCoat={vi.fn()} onOpenCamera={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Personalizar$/i }));
    expect(screen.getByRole("button", { name: "Pelaje Gris" }).getAttribute("aria-pressed")).toBe(String(selected));
  });

  it.each(COAT_PRESETS)("submits $id colors and explicit pattern (S9/S10)", (preset) => {
    const onSelect = vi.fn();
    render(<PersonalizeStrip activeCoat={DEFAULT_GREY_COAT} onSelectCoat={onSelect} onOpenCamera={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Personalizar$/i }));
    fireEvent.click(screen.getByRole("button", { name: `Pelaje ${preset.label}` }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith({ ...preset.coat, pattern: preset.pattern });
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
