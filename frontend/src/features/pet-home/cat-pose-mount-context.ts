"use client";

import { createContext } from "react";
import type { CatCareEvent } from "./cat-pose-types";
import type { CatPosePreview } from "./cat-pose-preview";

/** Viewer always mounts A2; direct model exports remain the frozen A1 oracle. */
export const CatPoseMountContext = createContext<{
  careEvent?: CatCareEvent;
  posePreview?: CatPosePreview;
} | null>(null);
