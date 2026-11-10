"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerformanceMonitor, Stats } from "@react-three/drei";
import type { PerspectiveCamera, Raycaster, Scene } from "three";
import { useReducedMotion } from "@/features/pet-home/use-reduced-motion";
import {
  antialiasForDevice,
  dprForFactor,
  initialDprForDevice,
  maxDprForDevice,
} from "@/features/pet-home/pet-render-quality";
import { defaultCatDesign, type CatDesignTunables } from "@/features/admin/cat-design-settings";
import { resolveModelScale } from "@/features/admin/resolve-cat-design";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import type { PetCoatInput } from "@/features/pet-home/coat-patterns";
import type { CatCareEvent } from "@/features/pet-home/cat-pose-types";
import type { CatPosePreview } from "@/features/pet-home/cat-pose-preview";
import { CatPoseMountContext } from "@/features/pet-home/cat-pose-mount-context";
import {
  describeNeedVisuals,
  needVisualCues,
} from "@/features/pet-home/need-visuals";
import {
  PREVIEW_PET_NEEDS,
  type PetNeeds,
} from "@/features/pet-home/pet-stats";
import { PET_NAME } from "@/features/pet-home/pet-status";
import { createField } from "@/features/pet-home/field-geometry";
import {
  dioramaCameraPose,
  FIELD_VIEW,
  homeCameraView,
  nextDioramaYaw,
  nextDioramaZoom,
  tweenProgress,
  type HomeCameraView,
} from "@/features/pet-home/field-view";
import {
  CAT_MODEL_SCALE,
  ROOM_SHADOW_OFFSET,
  catGroundY,
} from "@/features/pet-home/pet-layout";
import { FieldBackdrop } from "./FieldBackdrop";
import styles from "./pet-home.module.css";

/** The home-camera contract now lives in the three-free `field-view` module so the
 * loading placeholder can project the field with the very same pose (S6). It stays
 * re-exported here for the viewer's existing consumers. */
export {
  dioramaCameraPose,
  dioramaDirection,
  FIELD_VIEW,
  focusFraming,
  nextDioramaYaw,
  nextDioramaZoom,
  overviewFraming,
  resolveDioramaRadius,
  solveDioramaFraming,
  tweenProgress,
} from "@/features/pet-home/field-view";
export type { DioramaFraming, FramePoint, Vec3 } from "@/features/pet-home/field-view";

const performanceBounds = (): [number, number] => [45, 58];

type Vec3 = readonly [number, number, number];

/** Warm key plus a warm-sky / cool-ground hemisphere fill (landing dog reference).
 * NoToneMapping keeps the midtones even; the fill never outruns the key, so the
 * belly stays shaded and the pupil keeps its contrast.
 */
export const CAT_VIEW_LIGHTS = {
  hemisphere: { args: ["#fff6ea", "#f4c7a8", 0.95] as [string, string, number] },
  key: { position: [2.8, 4.2, 2.2] as Vec3, intensity: 1.35, color: "#fff6e8" },
  fill: { position: [-2.4, 1.8, -1.6] as Vec3, intensity: 0.4, color: "#d7e8ff" },
  rim: { position: [0, 1.2, 3] as Vec3, intensity: 0.3, color: "#ffffff" },
} as const;

/** Soft contact shadow for the cat alone (the room never enters the depth pass). */
export const CAT_VIEW_SHADOW = {
  resolution: 256,
  // Owner art direction: the shadow has to read on the warm floor without
  // becoming a blob, so it is a touch darker and tighter than the sage set.
  opacity: 0.45,
  scale: 2.9,
  blur: 2.0,
  /** Deeper than the 1.08-tall cat so tall poses still register. */
  far: 1.6,
  color: "#223024",
  offset: ROOM_SHADOW_OFFSET,
} as const;

/** Nearest authoring plane for the home camera. */
const near = 0.05;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

type CameraView = HomeCameraView;

function applyCamera(camera: PerspectiveCamera, view: CameraView) {
  const pose = dioramaCameraPose({ ...view, elevationDeg: FIELD_VIEW.elevationDeg });
  camera.position.fromArray([...pose.position]);
  camera.lookAt(...pose.target);
  camera.updateProjectionMatrix();
}

const sameView = (a: CameraView, b: CameraView) =>
  a.yawDeg === b.yawDeg && a.radius === b.radius &&
  a.targetX === b.targetX && a.targetY === b.targetY && a.targetZ === b.targetZ;

/** Owns the home camera: one bounded tween, cut under reduced motion. */
function HomeCamera({
  yawDeg,
  zoom,
  focus,
  reducedMotion,
  modelScale,
}: {
  yawDeg: number;
  zoom: number;
  focus: boolean;
  reducedMotion: boolean;
  modelScale: number;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const goal = useMemo<CameraView>(
    () => homeCameraView({ yawDeg, zoom, focus, modelScale }),
    [focus, modelScale, zoom, yawDeg],
  );
  const current = useRef<CameraView | null>(null);
  const tween = useRef<{ from: CameraView; to: CameraView; start: number } | null>(null);

  useLayoutEffect(() => {
    camera.near = near;
    if (camera.fov !== FIELD_VIEW.fovDeg) camera.fov = FIELD_VIEW.fovDeg;
    if (!current.current) {
      current.current = goal;
      applyCamera(camera, goal);
    }
    camera.updateProjectionMatrix();
  }, [camera, goal]);

  useEffect(() => {
    const from = current.current ?? goal;
    if (sameView(from, goal)) {
      tween.current = null;
      return;
    }
    if (reducedMotion) {
      current.current = goal;
      tween.current = null;
      applyCamera(camera, goal);
      return;
    }
    tween.current = { from, to: goal, start: performance.now() };
  }, [camera, goal, reducedMotion]);

  useFrame(() => {
    const active = tween.current;
    if (!active) return;
    const progress = tweenProgress(active.start, performance.now(), false);
    const eased = smoothstep(progress);
    const next: CameraView = {
      yawDeg: active.from.yawDeg + (active.to.yawDeg - active.from.yawDeg) * eased,
      radius: active.from.radius + (active.to.radius - active.from.radius) * eased,
      targetX: active.from.targetX + (active.to.targetX - active.from.targetX) * eased,
      targetY: active.from.targetY + (active.to.targetY - active.from.targetY) * eased,
      targetZ: active.from.targetZ + (active.to.targetZ - active.from.targetZ) * eased,
    };
    current.current = next;
    applyCamera(camera, next);
    if (progress >= 1) {
      current.current = active.to;
      applyCamera(camera, active.to);
      tween.current = null;
    }
  });

  return null;
}

/** Reads the clock once on resume so the first frame after a pause is normal. */
function ClockGuard({ paused }: { paused: boolean }) {
  const clock = useThree((state) => state.clock);
  const wasPaused = useRef(paused);
  useEffect(() => {
    if (wasPaused.current && !paused) clock.getDelta();
    wasPaused.current = paused;
  }, [clock, paused]);
  return null;
}

/** Mounts the open field on layer 1 and scopes the layer masks to this view.
 *
 * The field is one cheap merged geometry (a plate plus its lattice), so it is
 * built in this effect instead of being deferred to an idle callback: the first
 * painted frame already shows the field, never an empty stage (S6). The voxel
 * room shell is no longer mounted; `createRoom` stays available for the walls
 * that become placeable items later (S3/S4).
 */
function FieldScene({ floorY }: { floorY: number }) {
  const scene = useThree((state) => state.scene) as Scene;
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const raycaster = useThree((state) => state.raycaster) as Raycaster;

  useEffect(() => {
    const previous = { camera: camera.layers.mask, raycaster: raycaster.layers.mask };
    // Home sees the field; the contact-shadow depth pass stays on layer 0.
    camera.layers.enable(1);
    raycaster.layers.enable(1);
    const field = createField();
    field.mesh.position.y = floorY;
    scene.add(field.mesh);
    return () => {
      scene.remove(field.mesh);
      field.dispose();
      camera.layers.mask = previous.camera;
      raycaster.layers.mask = previous.raycaster;
    };
  }, [camera, floorY, raycaster, scene]);

  return null;
}

type Props = {
  colors: PetCoatInput;
  yawBias?: number;
  /** Bump from parent to replay the happy bounce. */
  reactPulse?: number;
  onPetInteract?: () => void;
  /** Admin preview override; home supplies explicit defaults. */
  design?: CatDesignTunables;
  needs?: PetNeeds;
  /** Discrete successful-care event; never inferred from need deltas. */
  careEvent?: CatCareEvent;
  /** Admin-local pose controls; no gameplay or persistence effects. */
  posePreview?: CatPosePreview;
  /** Opt-in room diorama. Admin preview keeps the legacy framing. */
  variant?: "preview" | "home";
};

/** WebGL stage for the procedural Michi. */
export function Cat3DViewer({
  colors,
  yawBias = 0,
  reactPulse = 0,
  onPetInteract,
  design,
  needs = PREVIEW_PET_NEEDS,
  careEvent,
  posePreview,
  variant = "preview",
}: Props) {
  const isHome = variant === "home";
  const [orbiting, setOrbiting] = useState(false);
  const poseMount = useMemo(() => ({ careEvent, posePreview }), [careEvent, posePreview]);
  const [hints] = useState(() => typeof window === "undefined" ? null : {
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
  });
  const [ceiling] = useState(() => hints ? maxDprForDevice(hints) : 1);
  /** S6: the low tier opens at DPR 1 with no MSAA and adapts from there. */
  const [initialDpr] = useState(() => hints ? initialDprForDevice(hints) : 1);
  const [antialias] = useState(() => hints ? antialiasForDevice(hints) : false);
  const [selectedDpr, setSelectedDpr] = useState(initialDpr);
  const [statsEnabled] = useState(() => typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("pet3dStats") === "1");
  const [statsParent, setStatsParent] = useState<HTMLDivElement | null>(null);
  const statsParentRef = useMemo(() => statsParent ? { current: statsParent } : undefined, [statsParent]);
  const selectedDprRef = useRef(initialDpr);
  const frozen = useRef(false);
  const applyFactor = useCallback((factor: number) => {
    if (frozen.current) return;
    const next = dprForFactor(factor, ceiling);
    if (next !== selectedDprRef.current) {
      selectedDprRef.current = next;
      setSelectedDpr(next);
    }
  }, [ceiling]);
  const onChange = useCallback(({ factor }: { factor: number }) => applyFactor(factor), [applyFactor]);
  const onFallback = useCallback(({ factor }: { factor: number }) => {
    if (frozen.current) return;
    applyFactor(factor);
    frozen.current = true;
  }, [applyFactor]);

  const [yawDeg, setYawDeg] = useState<number>(FIELD_VIEW.yawDeg);
  const [zoom, setZoom] = useState<number>(1);
  const [focus, setFocus] = useState(false);
  const [paused, setPaused] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useReducedMotion();
  const modelScale = resolveModelScale(design ?? defaultCatDesign());
  const groundY = catGroundY(modelScale);
  const swallowTap = useRef(false);
  const pointers = useRef(new Set<number>());

  // Pause the owned loop when the viewer leaves the screen or the tab hides.
  useEffect(() => {
    if (!isHome) return;
    const host = hostRef.current;
    const update = () => {
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      setPaused(hidden || (host?.dataset.offscreen === "true"));
    };
    let observer: IntersectionObserver | null = null;
    if (host && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver((entries) => {
        const entry = entries.at(-1);
        if (!entry || !host) return;
        host.dataset.offscreen = entry.isIntersecting ? "false" : "true";
        update();
      });
      observer.observe(host);
    }
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [isHome]);

  const petOnce = useCallback(() => {
    if (swallowTap.current) {
      swallowTap.current = false;
      return;
    }
    onPetInteract?.();
    if (isHome) {
      setFocus(true);
      setZoom(1);
    }
  }, [isHome, onPetInteract]);

  const rotate = useCallback((step: number) => {
    setYawDeg((current) => nextDioramaYaw(current, step));
  }, []);
  const zoomBy = useCallback((step: number) => {
    setZoom((current) => nextDioramaZoom(current, step));
  }, []);
  const overview = useCallback(() => {
    setFocus(false);
    setZoom(1);
  }, []);

  const needHint = describeNeedVisuals(needVisualCues(needs));
  const ariaLabel = [
    isHome
      ? `${PET_NAME}. Tocá al gato para acariciarlo, dos dedos para girar la habitación.`
      : `${PET_NAME}. Arrastrá para girar, tocá para ronronear.`,
    needHint,
  ]
    .filter(Boolean)
    .join(" ");

  const startPointer = (event: React.PointerEvent) => {
    if (!isHome) return;
    if (pointers.current.size === 0) swallowTap.current = false;
    pointers.current.add(event.pointerId);
    if (pointers.current.size > 1) swallowTap.current = true;
  };
  const movePointer = (event: React.PointerEvent) => {
    if (!isHome || pointers.current.size < 2) return;
    if (!pointers.current.has(event.pointerId)) return;
    rotate(event.movementX * 0.4);
  };
  const endPointer = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
  };

  return (
    <div className={styles.viewerShell}>
      {/* S6: the field the 3D canvas is about to paint, always underneath it, so
          the loading state and the loaded state are the same picture. */}
      {isHome && <FieldBackdrop modelScale={modelScale} yawDeg={yawDeg} zoom={zoom} />}
      <div
        ref={hostRef}
        className={isHome ? `${styles.canvasHost} ${styles.canvasHostField}` : styles.canvasHost}
        role="img"
        aria-label={ariaLabel}
        {...(isHome
          ? {
              "data-camera-focus": focus ? "head" : "overview",
              "data-camera-yaw": yawDeg,
              "data-camera-zoom": zoom,
              onPointerDown: startPointer,
              onPointerMove: movePointer,
              onPointerUp: endPointer,
              onPointerCancel: endPointer,
            }
          : {})}
      >
        {statsEnabled && <div ref={setStatsParent} aria-hidden="true" />}
        <Canvas
          camera={{ position: [0, 0.42, 3.05], fov: 28 }}
          dpr={selectedDpr}
          frameloop={isHome && paused ? "never" : "always"}
          flat
          gl={{ antialias, alpha: true }}
        >
          <PerformanceMonitor
            factor={1}
            step={0.15}
            bounds={performanceBounds}
            flipflops={8}
            onChange={onChange}
            onFallback={onFallback}
          />
          {statsEnabled && statsParentRef && <Stats showPanel={0} parent={statsParentRef} className={styles.fpsOverlay} />}
          <hemisphereLight args={[...CAT_VIEW_LIGHTS.hemisphere.args]} />
          <directionalLight
            position={[...CAT_VIEW_LIGHTS.key.position]}
            intensity={CAT_VIEW_LIGHTS.key.intensity}
            color={CAT_VIEW_LIGHTS.key.color}
          />
          <directionalLight
            position={[...CAT_VIEW_LIGHTS.fill.position]}
            intensity={CAT_VIEW_LIGHTS.fill.intensity}
            color={CAT_VIEW_LIGHTS.fill.color}
          />
          <directionalLight
            position={[...CAT_VIEW_LIGHTS.rim.position]}
            intensity={CAT_VIEW_LIGHTS.rim.intensity}
            color={CAT_VIEW_LIGHTS.rim.color}
          />
          <Suspense fallback={null}>
            <CatPoseMountContext.Provider value={poseMount}>
            <Cat3DModel
              colors={colors}
              orbiting={orbiting}
              yawBias={isHome ? 0 : yawBias}
              reactPulse={reactPulse}
              onPetInteract={isHome ? petOnce : onPetInteract}
              design={design}
              needs={needs}
            />
            </CatPoseMountContext.Provider>
          </Suspense>
          <ContactShadows
            resolution={CAT_VIEW_SHADOW.resolution}
            position={[0, groundY + CAT_VIEW_SHADOW.offset, 0]}
            opacity={CAT_VIEW_SHADOW.opacity}
            scale={CAT_VIEW_SHADOW.scale}
            blur={CAT_VIEW_SHADOW.blur}
            far={CAT_VIEW_SHADOW.far}
            color={CAT_VIEW_SHADOW.color}
          />
          {isHome ? (
            <>
              <ClockGuard paused={paused} />
              <FieldScene floorY={groundY} />
              <HomeCamera
                yawDeg={yawDeg}
                zoom={zoom}
                focus={focus}
                reducedMotion={reducedMotion}
                modelScale={modelScale}
              />
            </>
          ) : (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              target={[0, 0.18, 0.05]}
              minPolarAngle={Math.PI / 3.5}
              maxPolarAngle={Math.PI / 1.85}
              rotateSpeed={0.85}
              dampingFactor={0.08}
              enableDamping
              onStart={() => setOrbiting(true)}
              onEnd={() => setOrbiting(false)}
            />
          )}
        </Canvas>
      </div>
      {isHome && (
        <div className={styles.viewerControls} role="group" aria-label="Cámara de la habitación">
          <button type="button" className={styles.viewerControl} aria-label="Girar la cámara a la izquierda"
            onClick={() => rotate(-FIELD_VIEW.yawStepDeg)}>‹</button>
          <button type="button" className={styles.viewerControl} aria-label="Girar la cámara a la derecha"
            onClick={() => rotate(FIELD_VIEW.yawStepDeg)}>›</button>
          <button type="button" className={styles.viewerControl} aria-label="Acercar la cámara"
            onClick={() => zoomBy(-FIELD_VIEW.zoomStep)}>+</button>
          <button type="button" className={styles.viewerControl} aria-label="Alejar la cámara"
            onClick={() => zoomBy(FIELD_VIEW.zoomStep)}>−</button>
          <button type="button" className={styles.viewerControl} aria-label="Ver la habitación completa"
            onClick={overview}>⟲</button>
        </div>
      )}
    </div>
  );
}
