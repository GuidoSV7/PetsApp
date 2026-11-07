/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Cat3DViewer } from "@/features/pet-home/components/Cat3DViewer";
import { CatPoseMountContext } from "@/features/pet-home/cat-pose-mount-context";
import { CAT_POSES } from "@/features/pet-home/cat-pose-data";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import type { CatPosePreview } from "@/features/pet-home/cat-pose-preview";

const seen = vi.hoisted(() => vi.fn());
vi.mock("@react-three/fiber", () => ({ Canvas: ({ children }: { children: React.ReactNode }) => <>{React.Children.toArray(children).filter(c => React.isValidElement(c) && typeof c.type !== "string")}</> }));
vi.mock("@react-three/drei", () => ({ ContactShadows: () => null, OrbitControls: () => null, PerformanceMonitor: () => null, Stats: () => null }));
vi.mock("@/features/pet-home/components/Cat3DModel", () => ({ Cat3DModel: () => { seen(React.useContext(CatPoseMountContext)); return null; } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("unconditionally mounts A2, including a Viewer without care or admin controls", () => {
  render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
  expect(seen.mock.lastCall![0]).not.toBeNull();
});

it("delivers exact successful-care and admin-preview references to the mounted model", () => {
  const careEvent = { action: "feed" as const, sequence: 7 };
  const posePreview: CatPosePreview = { pose: "side", definition: CAT_POSES.side, breathing: true, reducedMotion: false, showHidden: false, contacts: true, selectedJoint: null };
  const { rerender } = render(<Cat3DViewer colors={DEFAULT_GREY_COAT} careEvent={careEvent} posePreview={posePreview} />);
  expect(seen.mock.lastCall![0]?.careEvent).toBe(careEvent);
  expect(seen.mock.lastCall![0]?.posePreview).toBe(posePreview);
  rerender(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
  expect(seen.mock.lastCall![0]).not.toBeNull();
  expect(seen.mock.lastCall![0]?.careEvent).toBeUndefined();
  expect(seen.mock.lastCall![0]?.posePreview).toBeUndefined();
});
