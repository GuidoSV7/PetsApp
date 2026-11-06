"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AxesHelper, BufferGeometry, Float32BufferAttribute, Vector3, type Group, type Mesh, type Points } from "three";
import { CatPoseRenderer, type CatPoseRenderInputs } from "../cat-pose-renderer";
import { buildCarePlateGeometry } from "../cat-care-plate";
import type { CatSkeleton } from "../cat-skeleton";

/** Mounted only by Viewer context; direct A1 calibration exports stay intact. */
export function CatPoseDriver({ skeleton, joints, boxes, root, input, seed, modelScale, yawBias, orbiting, interact }: {
  skeleton: CatSkeleton; joints: Map<string, Group>; boxes: Map<string, Mesh>;
  root: RefObject<Group | null>; input: CatPoseRenderInputs; seed: number;
  modelScale: number; yawBias: number; orbiting: boolean; interact: RefObject<(() => void) | null>;
}) {
  const canvas = useThree(state => state.gl.domElement);
  const runtime = useRef<CatPoseRenderer | null>(null);
  const ledger = useRef({ careSequence: -1, reactPulse: 0 });
  const plate = useRef<Mesh>(null), points = useRef<Points>(null);
  const goals = useMemo(() => new Float64Array(12), []);
  const scratch = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(0, .18, .05), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const cameraYaw = useRef(0);
  const plateGeometry = useMemo(buildCarePlateGeometry, []);
  const contactsGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(12), 3));
    return geometry;
  }, []);
  const axes = useMemo(() => new AxesHelper(.14), []);

  useEffect(() => {
    const group = root.current!;
    group.position.set(0, -.22, 0); group.rotation.set(0, 0, 0); group.scale.setScalar(modelScale);
    runtime.current = new CatPoseRenderer(skeleton, joints, boxes, input, seed, ledger.current);
    interact.current = () => runtime.current?.touch();
    return () => { runtime.current = null; interact.current = null; };
    // Input synchronization is separate; changing an event never rebuilds a rig.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, root, interact]);
  useEffect(() => {
    const group = root.current!;
    group.position.set(0, -.22, 0); group.rotation.set(0, 0, 0); group.scale.setScalar(modelScale);
    runtime.current?.rebind(skeleton, joints, boxes);
  }, [skeleton, modelScale, joints, boxes, root]);
  useEffect(() => { runtime.current?.synchronize(input); }, [input]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height && !orbiting) runtime.current?.look((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    };
    const leave = () => runtime.current?.look(0, 0);
    if (orbiting) leave();
    canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerleave", leave);
    return () => { canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); };
  }, [canvas, orbiting]);
  useEffect(() => {
    const selected = input.posePreview?.selectedJoint;
    if (selected) { joints.get(selected)?.add(axes); axes.visible = true; }
    else { axes.removeFromParent(); axes.visible = false; }
    return () => { axes.removeFromParent(); };
  }, [axes, joints, input.posePreview?.selectedJoint, skeleton]);
  useEffect(() => () => {
    plateGeometry.dispose(); contactsGeometry.dispose(); axes.dispose();
  }, [plateGeometry, contactsGeometry, axes]);

  useFrame((state, delta) => {
    if (!runtime.current) return;
    const started = performance.now();
    if (cameraYaw.current !== yawBias) {
      state.camera.position.sub(target).applyAxisAngle(up, -(yawBias - cameraYaw.current)).add(target);
      state.camera.lookAt(target); cameraYaw.current = yawBias;
    }
    const frame = runtime.current.render(delta);
    if (plate.current) plate.current.visible = frame.plateVisible;
    if (points.current) {
      points.current.visible = input.posePreview?.contacts ?? false;
      if (points.current.visible) {
        runtime.current.bind.contacts.copyGoalsInto(goals);
        const position = contactsGeometry.getAttribute("position");
        for (let i = 0; i < 4; i++) {
          scratch.fromArray(goals, i * 3); root.current!.worldToLocal(scratch);
          position.setXYZ(i, scratch.x, scratch.y, scratch.z);
        }
        position.needsUpdate = true;
      }
    }
    runtime.current.diagnostics.cpuMs = performance.now() - started;
  });
  return <>
    <mesh ref={plate} name="care-plate" visible={false} position={[0, -.29, .64]} geometry={plateGeometry}>
      <meshStandardMaterial vertexColors roughness={.9} />
    </mesh>
    <points ref={points} name="pose-contact-markers" visible={false} geometry={contactsGeometry} frustumCulled={false}>
      <pointsMaterial color="#00e8ff" size={.035} depthTest={false} />
    </points>
  </>;
}
