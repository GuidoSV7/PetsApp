# Componentes de referencia — hero 3D (R3F 9.8 · drei 10.7 · three 0.187 · React 19)

Todos tipados, listos para copiar a `src/islands/hero/`. Leer este archivo solo cuando se vaya a escribir o revisar uno de estos componentes; el criterio vive en `SKILL.md`.

## HeroIsland.tsx — detección + lazy + ErrorBoundary

```tsx
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';

const HeroCanvas = lazy(() => import('./HeroCanvas'));

type Tier = 0 | 1 | 2 | 3;

class HeroBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const poster = <img src="/hero-poster.webp" alt="" width={1600} height={1200} decoding="async" />;

export default function HeroIsland() {
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    const hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hasWebGL2 || reduced) { setTier(0); return; }

    let cancelled = false;
    const run = () =>
      import('@pmndrs/detect-gpu')
        .then(({ getGPUTier }) => getGPUTier({ benchmarksURL: '/detect-gpu' })) // benchmarks self-hosted
        .then((r) => { if (!cancelled) setTier(r.tier as Tier); })
        .catch(() => { if (!cancelled) setTier(1); });

    // nunca en el primer render: el poster debe ser el LCP
    'requestIdleCallback' in window ? requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 200);
    return () => { cancelled = true; };
  }, []);

  if (tier === null) return poster;
  if (tier === 0) return <video src="/hero.mp4" poster="/hero-poster.webp" autoPlay muted loop playsInline />;

  return (
    <HeroBoundary fallback={poster}>
      <Suspense fallback={poster}>
        <HeroCanvas tier={tier} />
      </Suspense>
    </HeroBoundary>
  );
}
```

`getGPUTier` devuelve `{ tier: 0–3, type, fps, gpu, isMobile }`; umbrales internos `[0, 15, 30, 60]` fps. `type` puede ser `BENCHMARK`, `FALLBACK`, `BENCHMARK_FETCH_FAILED`, `BLOCKLISTED`, `WEBGL_UNSUPPORTED`.

## HeroCanvas.tsx — Canvas, calidad adaptativa, pausa por visibilidad

```tsx
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, PerformanceMonitor, Preload } from '@react-three/drei';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Animal } from './Animal';
import { HeroLoader } from './HeroLoader';

export default function HeroCanvas({ tier }: { tier: 1 | 2 | 3 }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [dpr, setDpr] = useState(tier >= 2 ? 1.5 : 1);
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false); // para pasar wrap.current como eventSource

  useEffect(() => {
    setMounted(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(wrap.current!);
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return (
    <div
      ref={wrap}
      role="img"
      aria-label="Un perro y un gato animados que miran al visitante"
      style={{ aspectRatio: '4 / 3', width: '100%', touchAction: 'pan-y', position: 'relative' }}
    >
      <HeroLoader />
      {mounted && (
        <Canvas
          dpr={dpr}
          frameloop={visible ? 'always' : 'never'}
          gl={{ antialias: tier >= 2, powerPreference: 'high-performance', alpha: true, stencil: false }}
          camera={{ fov: 35, position: [0, 1.2, 4] }}
          eventSource={wrap.current!}
          eventPrefix="client"
          fallback={<img src="/hero-poster.webp" alt="Mascotas" />}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr(1)}
            onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio))}
            onFallback={() => setDpr(1)}
          />
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 2]} intensity={1.2} />
          <Suspense fallback={null}>
            <Animal url="/models/dog.glb" position={[-0.8, 0, 0]} />
            {tier >= 2 && <Animal url="/models/cat.glb" position={[0.8, 0, 0]} />}
            <ContactShadows frames={1} resolution={256} opacity={0.5} blur={2} far={2} />
            <Environment files="/env/studio_1k.hdr" />
            <Preload all />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
```

Notas:
- `eventSource={wrap.current}` hace que R3F ponga `pointer-events: none` en el div interno del canvas (fuente: `web/Canvas.tsx`). El scroll táctil pasa; `onPointerMove` sigue llegando desde el wrapper. Sin `eventPrefix="client"` las coordenadas se desplazan.
- `frameloop` reactivo: `always` ↔ `never`. No usar `demand` con `useAnimations`.
- `ContactShadows frames={1}` se renderiza una vez. Si el animal camina sobre el plano, `frames={Infinity}` con `resolution={256}`.
- `Environment files=` self-hosted: `preset` descarga de CDN y la doc lo marca como no apto para producción.

## Animal.tsx — carga, mezcla de clips, lookAt

```tsx
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { dampLookAt } from 'maath/easing';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

type ClipName = 'Idle' | 'Walk' | 'Sit';
const _target = new THREE.Vector3(); // módulo: cero allocs por frame

export function Animal({ url, walking = false, position }: { url: string; walking?: boolean; position?: [number, number, number] }) {
  const { scene, animations } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]); // la scene está cacheada por URL
  const group = useRef<THREE.Group>(null);
  const { actions, mixer } = useAnimations(animations, group);
  const head = useMemo(() => clone.getObjectByName('Head') as THREE.Bone | undefined, [clone]);
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    actions.Idle?.reset().play();
    if (reduced) mixer.timeScale = 0;
  }, [actions, mixer, reduced]);

  useEffect(() => {
    const from = actions[walking ? 'Idle' : 'Walk'], to = actions[walking ? 'Walk' : 'Idle'];
    if (!from || !to) return;
    to.reset().setEffectiveWeight(1).play();
    from.crossFadeTo(to, 0.35, true); // warp=true: sincroniza duraciones durante la mezcla
  }, [walking, actions]);

  useFrame(({ pointer, camera }, delta) => {
    if (!head || reduced) return;
    _target.set(pointer.x * 2, 1 + pointer.y, 3).add(camera.position).multiplyScalar(0.5);
    dampLookAt(head, _target, 0.25, delta);
  });

  return <primitive ref={group} object={clone} position={position} />;
}

useGLTF.preload('/models/dog.glb');
useGLTF.preload('/models/cat.glb');

export function playOnce(actions: Record<string, THREE.AnimationAction | null>, mixer: THREE.AnimationMixer, name: ClipName) {
  const a = actions[name]; const idle = actions.Idle;
  if (!a || !idle) return;
  a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
  idle.crossFadeTo(a.reset().play(), 0.25, true);
  const back = () => { mixer.removeEventListener('finished', back); a.crossFadeTo(idle.reset().play(), 0.3, true); };
  mixer.addEventListener('finished', back);
}
```

Hechos verificados en fuente (drei `useAnimations.tsx`, three `AnimationAction.js` r187):
- `useAnimations` registra `useFrame((_, d) => mixer.update(d))` y en cleanup `stopAllAction()` + `uncacheAction`.
- `crossFadeTo(fadeIn, duration, warp)` = `fadeOut(duration)` en la saliente + `fadeIn(duration)` en la entrante; con `warp` ajusta `timeScale` de ambas por la razón de duraciones.
- `clampWhenFinished = true` pausa en el último frame; `false` deja `enabled = false` al terminar un `LoopOnce`.
- `dampLookAt` sobre un bone compite con la pista de animación del mismo bone: quitar la pista `Head.quaternion` en el pipeline (gltf-transform) si el clip la anima.

## HeroLoader.tsx — progreso fuera del Canvas

```tsx
import { useProgress } from '@react-three/drei';

export function HeroLoader() {
  const progress = useProgress((s) => s.progress); // selector: no re-render por cada item
  if (progress >= 100) return null;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 'auto 0 0 0', height: 3 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: 'currentColor', transition: 'width .2s' }} />
    </div>
  );
}
```

`useProgress` envuelve `THREE.DefaultLoadingManager` y expone `active, progress, errors, item, loaded, total`; se puede usar en cualquier parte del DOM.

## Tipos generados con gltfjsx

Generar `Dog.tsx` con `npx gltfjsx public/models/dog.glb --types --keepnames` (ver skill `assets-3d-pipeline`) y usar su `GLTFResult`/`ActionName` para tipar `actions` en vez de `Record<string, …>`.
