import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import * as THREE from 'three';

const W = [
  { p: [0,   1.5,  28],   t: [0,  1,  18],   f: 55 },
  { p: [-3,  2.5,  14],   t: [-1, 1,   4],   f: 50 },
  { p: [3,   1.5,   0],   t: [1,  0,  -8],   f: 48 },
  { p: [-2,  3.5, -14],   t: [0,  2, -22],   f: 46 },
  { p: [1,   5,  -26],    t: [0,  3, -32],   f: 44 },
  { p: [0,   2,  -36],    t: [0,  1, -44],   f: 50 },
].map(w => ({
  pos: new THREE.Vector3(...w.p),
  target: new THREE.Vector3(...w.t),
  fov: w.f,
}));

const _pos = new THREE.Vector3();
const _target = new THREE.Vector3();
const _savedQuat = new THREE.Quaternion();
const _goalQuat = new THREE.Quaternion();

export const TourCamera = () => {
  const scroll = useScroll();
  const ready = useRef(false);

  useFrame(({ camera }, delta) => {
    // 1. Guard against massive deltas when tabbing away
    const safeDelta = Math.min(delta, 0.1);

    const t = Math.max(0, Math.min(1, scroll.offset));
    const segs = W.length - 1;
    const raw = t * segs;
    const i = Math.min(Math.floor(raw), segs - 1);
    
    // Smoothstep for natural easing between waypoints
    const localProgress = raw - i;
    const local = localProgress * localProgress * (3 - 2 * localProgress); 

    const a = W[i];
    const b = W[i + 1];

    _pos.lerpVectors(a.pos, b.pos, local);
    _target.lerpVectors(a.target, b.target, local);
    const targetFov = THREE.MathUtils.lerp(a.fov, b.fov, local);

    /* First frame snap */
    if (!ready.current) {
      camera.position.copy(_pos);
      camera.lookAt(_target);
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
      ready.current = true;
      return;
    }

    /* 2. Position Damping (Frame-independent lerp — slower for cinematic feel) */
    const dampFactor = 1 - Math.exp(-2.5 * safeDelta);
    camera.position.lerp(_pos, dampFactor);

    /* 3. Quaternion LookAt Damping */
    _savedQuat.copy(camera.quaternion);
    camera.lookAt(_target);
    _goalQuat.copy(camera.quaternion);
    camera.quaternion.copy(_savedQuat);
    camera.quaternion.slerp(_goalQuat, dampFactor);

    /* 4. FOV Damping (Optimized to save GPU) */
    const newFov = THREE.MathUtils.lerp(camera.fov, targetFov, dampFactor);
    if (Math.abs(camera.fov - newFov) > 0.1) {
      camera.fov = newFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};