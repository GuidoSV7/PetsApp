"use client";

import { useMemo } from "react";
import {
  fieldBackdropGeometry,
  latticePathData,
  platePointsAttribute,
} from "@/features/pet-home/field-backdrop";
import {
  dioramaCameraPose,
  FIELD_VIEW,
  homeCameraView,
} from "@/features/pet-home/field-view";
import { CAT_MODEL_SCALE, catGroundY } from "@/features/pet-home/pet-layout";
import { DEFAULT_PET_NAME } from "@/features/pet-home/pet-status";
import styles from "./pet-home.module.css";

/** Sky plus the 16 × 16 field drawn as SVG in the authored 4:5 frame.
 *
 * This is the only thing on screen while the 3D chunk loads and the first WebGL
 * frame is built, and it stays behind the transparent canvas afterwards, so the
 * green and the framing never jump (S6). It imports no 3D code: the placeholder
 * bundle stays tiny.
 */
export function FieldBackdrop({
  modelScale = CAT_MODEL_SCALE,
  yawDeg = FIELD_VIEW.yawDeg,
  zoom = 1,
}: {
  modelScale?: number;
  yawDeg?: number;
  zoom?: number;
}) {
  const { plate, lattice } = useMemo(() => {
    // Overview framing only: the head close-up zooms in, so the opaque field grows
    // over the backdrop instead of exposing it. Yaw and zoom persist, so they are
    // projected here to keep the two pictures identical.
    const pose = dioramaCameraPose({
      ...homeCameraView({ yawDeg, zoom, focus: false, modelScale }),
      elevationDeg: FIELD_VIEW.elevationDeg,
    });
    return fieldBackdropGeometry(pose, catGroundY(modelScale));
  }, [modelScale, yawDeg, zoom]);

  return (
    <div className={styles.fieldBackdrop} aria-hidden="true" data-testid="field-backdrop">
      <svg
        className={styles.fieldCanvas}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <polygon className={styles.fieldPlate} points={platePointsAttribute(plate)} />
        <path className={styles.fieldLine} d={latticePathData(lattice)} />
      </svg>
    </div>
  );
}

/** The `dynamic(..., { ssr: false })` fallback: an actual field, not a bare text
 * node. The status stays available to assistive tech but never covers the field.
 */
export function FieldPlaceholder() {
  return (
    <div className={`${styles.canvasHost} ${styles.canvasHostField}`}>
      <FieldBackdrop />
      <p className={styles.srOnly} role="status">
        Cargando a {DEFAULT_PET_NAME}…
      </p>
    </div>
  );
}
