/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Cat3DViewerErrorBoundary } from "@/features/pet-home/components/Cat3DViewerErrorBoundary";

afterEach(() => {
  cleanup();
});

function Boom({ fail }: { fail: boolean }) {
  if (fail) throw new Error("webgl boom");
  return <div>viewer ok</div>;
}

describe("Cat3DViewer ErrorBoundary (#16)", () => {
  it("shows recoverable retry UI instead of relying only on route error.tsx", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <Cat3DViewerErrorBoundary petName="Michi">
        <Boom fail />
      </Cat3DViewerErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/3D/i);
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    spy.mockRestore();
  });

  it("remounts children after retry", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let fail = true;
    function Gate() {
      return <Boom fail={fail} />;
    }
    render(
      <Cat3DViewerErrorBoundary petName="Michi">
        <Gate />
      </Cat3DViewerErrorBoundary>,
    );
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(screen.getByText("viewer ok")).toBeTruthy();
    spy.mockRestore();
  });
});
