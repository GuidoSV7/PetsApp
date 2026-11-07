"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerformanceMonitor, Stats } from "@react-three/drei";
import type { PerspectiveCamera, Raycaster, Scene } from "three";
import { Vector3 } from "three";
import { useReducedMotion } from "@/features/pet-home/use-reduced-motion";
import { dprForFactor, maxDprForDevice } from "@/features/pet-home/pet-render-quality";
import { defaultCatDesign, type CatDesignTunables } from "@/features/admin/cat-design-settings";
import { resolveModelScale } from "@/features/admin/resolve-cat-design";
import { Cat3DModel } from "@/features/pet-home/components/Cat3DModel";
import type { PetCoatInput } from "@/features/pet-home/coat-patterns";
import type { CatCareEvent } from "@/features/pet-home/cat-pose-types";
import type { CatPosePreview } from "@/features/pet-home/cat-pose-preview";
import { CatPoseMountContext } from "@/features/pet-home/cat-pose-mount-context";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";
import {
  describeNeedVisuals,
  needVisualCues,
} from "@/features/pet-home/need-visuals";
import {
  PREVIEW_PET_NEEDS,
  type PetNeeds,
} from "@/features/pet-home/pet-stats";
import { PET_NAME } from "@/features/pet-home/pet-status";
import { createRoom, ROOM_WALL_HEIGHT } from "@/features/pet-home/room-geometry";
import { ROOM_HALF } from "@/features/pet-home/room-grid";
import {
  CAT_MODEL_SCALE,
  ROOM_SHADOW_OFFSET,
  catGroundY,
  catPartWorldY,
} from "@/features/pet-home/pet-layout";
import styles from "./pet-home.module.css";

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

/** Bounded three-quarter diorama (plan §2). +Y up, cat forward +Z. */
export const ROOM_VIEW = {
  fovDeg: 35,
  yawDeg: 45,
  yawLimitDeg: 20,
  yawStepDeg: 10,
  elevationDeg: 35,
  elevationLimitDeg: 5,
  zoomRange: [0.8, 1.2] as readonly [number, number],
  zoomStep: 0.1,
  focusMs: 250,
  /** Paws land on the lower third; the far wall top keeps a 10% sky margin. */
  lowerNdcY: -0.45,
  upperNdcY: 0.9,
  /** Head close-up after a cat tap: symmetric band, so the visible face is
   * framed with the eyes just under the centre and the ear tips in frame. */
  focusLowerNdcY: -0.62,
  focusUpperNdcY: 0.62,
} as const;

const near = 0.05;

/** Unit vector from the orbit target back to the camera. */
export function dioramaDirection(yawDeg: number, elevationDeg: number): Vec3 {
  const yaw = (yawDeg * Math.PI) / 180;
  const elevation = (elevationDeg * Math.PI) / 180;
  return [
    Math.sin(yaw) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(yaw) * Math.cos(elevation),
  ];
}

/** Camera up axis for a look-at with world up, independent of the target. */
function dioramaUp([dx, dy, dz]: Vec3): Vec3 {
  const x = -dx * dy;
  const y = 1 - dy * dy;
  const z = -dz * dy;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export type DioramaFraming = {
  radius: number;
  targetX: number;
  targetY: number;
  targetZ: number;
};

/** Solves the camera distance and target height that put `lower` at `lowerNdcY`
 * and `upper` at `upperNdcY` in the 4:5 frame. NDC y projects a point as
 * `(P - T)·up / (tan(fov/2) * (R - (P - T)·dir))`, which is linear in R and the
 * target height, so the two anchors give one exact 2×2 solution.
 */
export function solveDioramaFraming(input: {
  lower: Vec3;
  upper: Vec3;
  yawDeg: number;
  elevationDeg: number;
  lowerNdcY: number;
  upperNdcY: number;
  targetX?: number;
  targetZ?: number;
  fovDeg?: number;
}): DioramaFraming {
  const dir = dioramaDirection(input.yawDeg, input.elevationDeg);
  const up = dioramaUp(dir);
  const tan = Math.tan(((input.fovDeg ?? ROOM_VIEW.fovDeg) * Math.PI) / 360);
  const origin: Vec3 = [input.targetX ?? 0, 0, input.targetZ ?? 0];
  const row = (point: Vec3, ndcY: number) => {
    const offset = new Vector3(...point).sub(new Vector3(...origin));
    const k = ndcY * tan;
    return {
      s: offset.dot(new Vector3(...up)) + k * offset.dot(new Vector3(...dir)),
      c: up[1] + k * dir[1],
      k,
    };
  };
  const lower = row(input.lower, input.lowerNdcY);
  const upper = row(input.upper, input.upperNdcY);
  const radius = (lower.s * upper.c - upper.s * lower.c) /
    (lower.k * upper.c - upper.k * lower.c);
  return {
    radius,
    targetX: origin[0],
    targetY: (lower.s - lower.k * radius) / lower.c,
    targetZ: origin[2],
  };
}

const partById = (id: string) => {
  const part = CAT_ANATOMY.find((candidate) => candidate.id === id);
  if (!part) throw new RangeError(`Missing canonical cat part: ${id}`);
  return part;
};
const frontPaw = partById("pawFL");
const headPart = partById("head");
const earPart = partById("earL");
const eyePart = partById("eyeL");

/** Whole diorama: room corner, wall top and the rig paw plane. */
export function overviewFraming(modelScale: number = CAT_MODEL_SCALE): DioramaFraming {
  const floorY = catGroundY(modelScale);
  return solveDioramaFraming({
    lower: [0, floorY, frontPaw.position[2] * modelScale],
    upper: [-ROOM_HALF, floorY + ROOM_WALL_HEIGHT, -ROOM_HALF],
    yawDeg: ROOM_VIEW.yawDeg,
    elevationDeg: ROOM_VIEW.elevationDeg,
    lowerNdcY: ROOM_VIEW.lowerNdcY,
    upperNdcY: ROOM_VIEW.upperNdcY,
  });
}

/** Head close-up after a cat tap: anchor the visible face (the head's front
 * plane, not its mid plane) on the lower band and the ear tips on the upper
 * band, so the whole head stays inside the frame with the eyes readable just
 * under the centre. Anchors come from the rig root via `catPartWorldY`; taking
 * them from the paw plane was the defect that pushed the head out of frame.
 */
export function focusFraming(modelScale: number = CAT_MODEL_SCALE): DioramaFraming {
  const faceZ = (headPart.position[2] + headPart.args[2] / 2) * modelScale;
  return solveDioramaFraming({
    lower: [0, catPartWorldY(headPart.position[1] - headPart.args[1] / 2, modelScale), faceZ],
    upper: [
      0,
      catPartWorldY(earPart.position[1] + earPart.args[1] / 2, modelScale),
      earPart.position[2] * modelScale,
    ],
    yawDeg: ROOM_VIEW.yawDeg,
    elevationDeg: ROOM_VIEW.elevationDeg,
    lowerNdcY: ROOM_VIEW.focusLowerNdcY,
    upperNdcY: ROOM_VIEW.focusUpperNdcY,
    // Look straight at the eye plane, or the face slides to the frame edge.
    targetZ: eyePart.position[2] * modelScale,
  });
}

export function nextDioramaYaw(current: number, step: number): number {
  if (!Number.isFinite(step)) return current;
  const next = current + step;
  const minimum = ROOM_VIEW.yawDeg - ROOM_VIEW.yawLimitDeg;
  const maximum = ROOM_VIEW.yawDeg + ROOM_VIEW.yawLimitDeg;
  return Math.min(maximum, Math.max(minimum, next));
}

export function nextDioramaZoom(current: number, step: number): number {
  if (!Number.isFinite(step)) return current;
  const next = current + step;
  return Math.min(ROOM_VIEW.zoomRange[1], Math.max(ROOM_VIEW.zoomRange[0], next));
}

export function resolveDioramaRadius(baseRadius: number, zoom: number): number {
  const clamped = Math.min(ROOM_VIEW.zoomRange[1], Math.max(ROOM_VIEW.zoomRange[0], zoom));
  return baseRadius * clamped;
}

/** 0 → 1 over `focusMs`; reduced motion cuts straight to the final camera. */
export function tweenProgress(startedAt: number, now: number, reducedMotion: boolean): number {
  if (reducedMotion) return 1;
  const elapsed = now - startedAt;
  if (!Number.isFinite(elapsed) || elapsed >= ROOM_VIEW.focusMs) return 1;
  return Math.max(0, elapsed / ROOM_VIEW.focusMs);
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function dioramaCameraPose(
  framing: DioramaFraming & { yawDeg: number; elevationDeg: number },
): { position: Vec3; target: Vec3 } {
  const dir = dioramaDirection(framing.yawDeg, framing.elevationDeg);
  return {
    position: [
      framing.targetX + dir[0] * framing.radius,
      framing.targetY + dir[1] * framing.radius,
      framing.targetZ + dir[2] * framing.radius,
    ],
    target: [framing.targetX, framing.targetY, framing.targetZ],
  };
}

type CameraView = DioramaFraming & { yawDeg: number };

function applyCamera(camera: PerspectiveCamera, view: CameraView) {
  const pose = dioramaCameraPose({ ...view, elevationDeg: ROOM_VIEW.elevationDeg });
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
  const goal = useMemo<CameraView>(() => {
    const base = focus ? focusFraming(modelScale) : overviewFraming(modelScale);
    return { ...base, radius: resolveDioramaRadius(base.radius, zoom), yawDeg };
  }, [focus, modelScale, zoom, yawDeg]);
  const current = useRef<CameraView | null>(null);
  const tween = useRef<{ from: CameraView; to: CameraView; start: number } | null>(null);

  useLayoutEffect(() => {
    camera.near = near;
    if (camera.fov !== ROOM_VIEW.fovDeg) camera.fov = ROOM_VIEW.fovDeg;
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

/** Defers the ~0.4 s procedural room build past the first painted frame. */
function scheduleIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(task, { timeout: 400 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(task, 60);
  return () => window.clearTimeout(handle);
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

/** Mounts the merged room on layer 1 and scopes the layer masks to this view. */
function RoomScene({ floorY }: { floorY: number }) {
  const scene = useThree((state) => state.scene) as Scene;
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const raycaster = useThree((state) => state.raycaster) as Raycaster;

  useEffect(() => {
    const previous = { camera: camera.layers.mask, raycaster: raycaster.layers.mask };
    // Home sees the room; the contact-shadow depth pass stays on layer 0.
    camera.layers.enable(1);
    raycaster.layers.enable(1);
    let cancelled = false;
    let room: ReturnType<typeof createRoom> | null = null;
    const attach = () => {
      if (cancelled || room) return;
      room = createRoom();
      room.mesh.position.y = floorY;
      scene.add(room.mesh);
    };
    const cancel = scheduleIdle(attach);
    return () => {
      cancelled = true;
      cancel();
      if (room) {
        scene.remove(room.mesh);
        room.dispose();
      }
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
  const [ceiling] = useState(() => typeof window === "undefined" ? 1 : maxDprForDevice({
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    devicePixelRatio: window.devicePixelRatio,
  }));
  const [selectedDpr, setSelectedDpr] = useState(ceiling);
  const [statsEnabled] = useState(() => typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("pet3dStats") === "1");
  const [statsParent, setStatsParent] = useState<HTMLDivElement | null>(null);
  const statsParentRef = useMemo(() => statsParent ? { current: statsParent } : undefined, [statsParent]);
  const selectedDprRef = useRef(ceiling);
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

  const [yawDeg, setYawDeg] = useState<number>(ROOM_VIEW.yawDeg);
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
      <div
        ref={hostRef}
        className={styles.canvasHost}
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
          gl={{ antialias: true, alpha: true }}
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
              <RoomScene floorY={groundY} />
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
            onClick={() => rotate(-ROOM_VIEW.yawStepDeg)}>‹</button>
          <button type="button" className={styles.viewerControl} aria-label="Girar la cámara a la derecha"
            onClick={() => rotate(ROOM_VIEW.yawStepDeg)}>›</button>
          <button type="button" className={styles.viewerControl} aria-label="Acercar la cámara"
            onClick={() => zoomBy(-ROOM_VIEW.zoomStep)}>+</button>
          <button type="button" className={styles.viewerControl} aria-label="Alejar la cámara"
            onClick={() => zoomBy(ROOM_VIEW.zoomStep)}>−</button>
          <button type="button" className={styles.viewerControl} aria-label="Ver la habitación completa"
            onClick={overview}>⟲</button>
        </div>
      )}
    </div>
  );
}
