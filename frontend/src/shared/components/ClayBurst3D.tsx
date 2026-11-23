/**
 * ClayBurst3D — one-shot 3D clay confetti celebration (three.js).
 *
 * Perf guardrails (design 2026-09-05):
 * - three.js is LAZY-imported only when a celebration actually fires.
 * - Single canvas overlay, auto-unmounts after `durationMs`.
 * - DPR capped at 1.5; pauses on document.hidden; reduced-motion → skipped
 *   entirely (the 2D success UI carries the moment instead).
 */
import React, { useEffect, useRef } from 'react';

interface Props {
  /** Fire when true; component self-unmounts its canvas after the burst. */
  show: boolean;
  durationMs?: number;
}

export const ClayBurst3D: React.FC<Props> = ({ show, durationMs = 2600 }) => {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    if (!show || !holderRef.current) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const THREE = await import('three');
      const holder = holderRef.current;
      if (!holder || disposed) return;

      let renderer: import('three').WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return; // no WebGL — 2D success UI still celebrates
      }
      const W = holder.clientWidth || window.innerWidth;
      const H = holder.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.inset = '0';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      holder.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 60);
      camera.position.set(0, 0, 10);

      scene.add(new THREE.HemisphereLight(0xffffff, 0xffe0b3, 1.2));
      const sun = new THREE.DirectionalLight(0xfff3d6, 1.4);
      sun.position.set(3, 6, 6);
      scene.add(sun);

      const geo = new THREE.SphereGeometry(0.18, 10, 10);
      const COLORS = [0xffd93d, 0xff9f9f, 0x6eb9ff, 0xb4e197, 0xa78bfa, 0xff8c42];
      const bits = COLORS.flatMap((hex) =>
        Array.from({ length: 7 }, () => {
          const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 }));
          m.position.set((Math.random() - 0.5) * 2, -1.5 - Math.random() * 2, (Math.random() - 0.5) * 3);
          m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 3.2, Math.random() * 6.5 + 3.5, (Math.random() - 0.5) * 1.5);
          m.userData.spin = Math.random() * 0.35 + 0.1;
          m.visible = false;
          scene.add(m);
          return m;
        }),
      );

      // Fountain burst from bottom center
      bits.forEach((m) => { m.visible = true; });

      let running = true;
      const onVis = () => { running = !document.hidden; };
      document.addEventListener('visibilitychange', onVis);

      const clock = new THREE.Clock();
      let elapsed = 0;
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!running) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        bits.forEach((m) => {
          m.userData.v.y -= 9.8 * dt * 0.55;
          m.position.addScaledVector(m.userData.v as THREE.Vector3, dt);
          m.rotation.x += (m.userData.spin as number);
          m.rotation.y += (m.userData.spin as number) * 0.7;
        });
        renderer.render(scene, camera);
        if (elapsed * 1000 > durationMs) {
          cancelAnimationFrame(raf);
          disposeAll();
        }
      };

      const disposeAll = () => {
        cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVis);
        renderer.dispose();
        geo.dispose();
        bits.forEach((m) => (m.material as import('three').Material).dispose());
        renderer.domElement.remove();
      };

      tick();
      cleanup = disposeAll;
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [show, durationMs]);

  if (!show) return null;
  return (
    <div
      ref={holderRef}
      style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  );
};

export default ClayBurst3D;
