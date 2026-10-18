/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { PET_NAME, PET_STATUS } from "@/features/pet-home/pet-status";

afterEach(() => {
  cleanup();
});

describe("PetHomeStage", () => {
  it("shows the cat, idle status, and both action buttons", () => {
    render(<PetHomeStage />);

    expect(screen.getByRole("img", { name: PET_NAME })).toBeTruthy();
    expect(screen.getByText(PET_STATUS.idle)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Alimentar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acariciar" })).toBeTruthy();
  });

  it("updates status when feeding", () => {
    render(<PetHomeStage />);
    fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
    expect(screen.getByText(PET_STATUS.fed)).toBeTruthy();
  });

  it("updates status when petting", () => {
    render(<PetHomeStage />);
    fireEvent.click(screen.getByRole("button", { name: "Acariciar" }));
    expect(screen.getByText(PET_STATUS.petted)).toBeTruthy();
  });
});
