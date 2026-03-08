import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Scroll, ScrollControls, useScroll, shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { TourCamera } from './TourCamera';

/* ─── helpers ─── */
const clamp01 = v => Math.min(1, Math.max(0, v));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ─── dark neumorphic tokens ─── */
const BG = '#0c0c14';
const SURFACE = '#13131f';
const neu = {
  raised: '6px 6px 14px #070710, -6px -6px 14px #19192e',
  raisedLg: '10px 10px 22px #070710, -10px -10px 22px #19192e',
  inset: 'inset 3px 3px 8px #070710, inset -3px -3px 8px #19192e',
};
const gradText = {
  backgroundImage: 'linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #c4b5fd 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};

/* ═══════════════════════════════════════════════════
   CUSTOM SHADER — Vertex-displaced morphing sphere
   Produces the "living orb" effect
   ═══════════════════════════════════════════════════ */
const CoreMaterial = shaderMaterial(
  { uTime: 0, uIntensity: 0.3, uColor: new THREE.Color('#6366f1'), uGlow: new THREE.Color('#a78bfa') },
  /* vertex */
  `
    uniform float uTime;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;

    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0,0.5,1.0,2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main() {
      vNormal = normal;
      vPosition = position;
      float n1 = snoise(position * 1.5 + uTime * 0.4) * uIntensity;
      float n2 = snoise(position * 3.0 - uTime * 0.6) * uIntensity * 0.3;
      float displacement = n1 + n2;
      vDisplacement = displacement;
      vec3 newPos = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  /* fragment */
  `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGlow;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vDisplacement;

    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      vec3 color = mix(uColor, uGlow, fresnel + vDisplacement * 0.5);
      float alpha = 0.9 + fresnel * 0.1;
      gl_FragColor = vec4(color * (2.8 + vDisplacement * 1.0), alpha);
    }
  `,
);
extend({ CoreMaterial });


/* ═══════════════════════════════════════════════════
   3D ENVIRONMENTS — Immersive dark Active-Theory-style
   ═══════════════════════════════════════════════════ */

/* ── Infinite flowing particle field ── */
const ParticleField = () => {
  const ref = useRef();
  const COUNT = 6000;

  const { positions, velocities } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const v = [];
    for (let i = 0; i < COUNT; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 80;
      p[i * 3 + 1] = (Math.random() - 0.5) * 50;
      p[i * 3 + 2] = 40 - Math.random() * 120;
      v.push({
        x: (Math.random() - 0.5) * 0.002,
        y: (Math.random() - 0.5) * 0.002,
        z: -0.005 - Math.random() * 0.01,
      });
    }
    return { positions: p, velocities: v };
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const arr = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3]     += velocities[i].x;
      arr[i * 3 + 1] += velocities[i].y;
      arr[i * 3 + 2] += velocities[i].z;
      if (arr[i * 3 + 2] < -80) {
        arr[i * 3]     = (Math.random() - 0.5) * 80;
        arr[i * 3 + 1] = (Math.random() - 0.5) * 50;
        arr[i * 3 + 2] = 42;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#a5b4fc"
        size={0.15}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ── Hero Morph Sphere — custom shader displaced icosahedron ── */
const HeroSphere = () => {
  const matRef = useRef();
  const meshRef = useRef();
  const groupRef = useRef();
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();
  const scroll = useScroll();

  useFrame(({ clock }, d) => {
    const t = clock.elapsedTime;
    const s = clamp01(scroll.offset);
    const vis = 1 - ss(0.15, 0.28, s);

    if (matRef.current) {
      matRef.current.uTime = t;
      matRef.current.uIntensity = 0.25 + Math.sin(t * 0.5) * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += d * 0.12;
      meshRef.current.rotation.x += d * 0.04;
    }
    if (ring1.current) {
      ring1.current.rotation.x = t * 0.4;
      ring1.current.rotation.z = t * 0.25;
      ring1.current.material.opacity = vis * 0.55;
    }
    if (ring2.current) {
      ring2.current.rotation.y = t * 0.32;
      ring2.current.rotation.x = Math.PI / 3 + t * 0.18;
      ring2.current.material.opacity = vis * 0.4;
    }
    if (ring3.current) {
      ring3.current.rotation.z = -t * 0.22;
      ring3.current.rotation.y = Math.PI / 4 + t * 0.12;
      ring3.current.material.opacity = vis * 0.3;
    }
    if (groupRef.current) {
      groupRef.current.position.y = 1 + Math.sin(t * 0.3) * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1, 20]}>
      {/* Large ambient glow backdrop */}
      <mesh>
        <sphereGeometry args={[8, 32, 32]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[16, 32, 32]} />
        <meshBasicMaterial color="#4338ca" transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.5, 64]} />
        <coreMaterial ref={matRef} transparent depthWrite={false} />
      </mesh>
      <mesh ref={ring1}>
        <torusGeometry args={[4.2, 0.015, 16, 150]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2}>
        <torusGeometry args={[5.2, 0.02, 16, 150]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring3}>
        <torusGeometry args={[6.4, 0.015, 16, 150]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight intensity={25} color="#6366f1" distance={50} />
      <pointLight intensity={12} color="#a78bfa" distance={35} />
    </group>
  );
};

/* ── Network Constellation — connected nodes with pulsing data lines ── */
const NODE_COUNT = 24;
const nodeSeeds = Array.from({ length: NODE_COUNT }, (_, i) => {
  const phi = Math.acos(1 - 2 * (i + 0.5) / NODE_COUNT);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const r = 4 + Math.random() * 2;
  return {
    base: new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.sin(phi) * Math.sin(theta) * r * 0.6,
      Math.cos(phi) * r,
    ),
    speed: 0.08 + Math.random() * 0.12,
    phase: Math.random() * Math.PI * 2,
  };
});

const NetworkConstellation = () => {
  const nodes = useRef([]);
  const lines = useRef();
  const scroll = useScroll();
  const _p = useMemo(() => new THREE.Vector3(), []);
  const linePositions = useMemo(() => new Float32Array(NODE_COUNT * 2 * 3), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = clamp01(scroll.offset);
    const vis = ss(0.12, 0.24, s) * (1 - ss(0.42, 0.54, s));

    nodes.current.forEach((m, i) => {
      if (!m) return;
      const seed = nodeSeeds[i];
      const wobble = Math.sin(t * seed.speed * 3 + seed.phase);
      _p.copy(seed.base);
      _p.x += wobble * 0.3;
      _p.y += Math.sin(t * 0.4 + seed.phase) * 0.5;
      _p.z += Math.cos(t * seed.speed * 2 + seed.phase) * 0.2;
      m.position.copy(_p);
      const pulse = 0.5 + Math.sin(t * 3 + i * 0.8) * 0.5;
      m.material.emissiveIntensity = vis * pulse;
      m.material.opacity = vis * 0.9;
      m.scale.setScalar(vis * (0.12 + pulse * 0.06));

      linePositions[i * 6]     = 0;
      linePositions[i * 6 + 1] = 0;
      linePositions[i * 6 + 2] = 0;
      linePositions[i * 6 + 3] = _p.x;
      linePositions[i * 6 + 4] = _p.y;
      linePositions[i * 6 + 5] = _p.z;
    });

    if (lines.current) {
      lines.current.geometry.attributes.position.needsUpdate = true;
      lines.current.material.opacity = vis * 0.15;
    }
  });

  return (
    <group position={[-1, 0.5, 6]}>
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={NODE_COUNT * 2} array={linePositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#6366f1" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </lineSegments>
      {nodeSeeds.map((_, i) => (
        <mesh key={i} ref={el => (nodes.current[i] = el)}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color="#c4b5fd" emissive="#818cf8" emissiveIntensity={0} transparent opacity={0} />
        </mesh>
      ))}
      <pointLight intensity={15} color="#818cf8" distance={35} />
    </group>
  );
};

/* ── Training Gyroscope — concentric spinning rings with energy core ── */
const TrainingGyro = () => {
  const rings = useRef([]);
  const coreRef = useRef();
  const scroll = useScroll();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const s = clamp01(scroll.offset);
    const vis = ss(0.30, 0.42, s) * (1 - ss(0.55, 0.67, s));

    const axes = [
      [1, 0, 0], [0, 1, 0], [0, 0, 1],
      [1, 1, 0], [1, 0, 1], [0, 1, 1],
      [1, 1, 1],
    ];
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const speed = 0.3 + i * 0.15;
      const ax = axes[i % axes.length];
      ring.rotation.x += ax[0] * speed * 0.016;
      ring.rotation.y += ax[1] * speed * 0.016;
      ring.rotation.z += ax[2] * speed * 0.016;
      ring.scale.setScalar(vis * (1 + i * 0.08));
      ring.material.opacity = vis * (0.4 - i * 0.04);
    });

    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.2;
      coreRef.current.scale.setScalar(vis * 0.5 * pulse);
      coreRef.current.material.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.5;
      coreRef.current.material.opacity = vis;
    }
  });

  const radii = [2.2, 2.9, 3.6, 4.3, 5.0, 5.7, 6.4];
  const colors = ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#c084fc', '#818cf8'];

  return (
    <group position={[3, 0, -8]}>
      {radii.map((r, i) => (
        <mesh key={i} ref={el => (rings.current[i] = el)}>
          <torusGeometry args={[r, 0.025, 16, 100]} />
          <meshBasicMaterial color={colors[i]} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="#a78bfa" emissive="#6366f1" emissiveIntensity={1.5} transparent opacity={0} />
      </mesh>
      <pointLight intensity={18} color="#a78bfa" distance={35} />
    </group>
  );
};

/* ── Data Tunnel — spiral flowing streams ── */
const DataTunnel = () => {
  const STREAM_COUNT = 400;
  const ref = useRef();
  const ringRefs = useRef([]);
  const scroll = useScroll();
  const positions = useMemo(() => new Float32Array(STREAM_COUNT * 3), []);

  const particles = useMemo(() =>
    Array.from({ length: STREAM_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 2.5;
      return { angle, r, progress: Math.random(), speed: 0.15 + Math.random() * 0.35 };
    }),
    [],
  );

  useFrame(({ clock }, d) => {
    const t = clock.elapsedTime;
    const s = clamp01(scroll.offset);
    const vis = ss(0.46, 0.58, s) * (1 - ss(0.72, 0.84, s));

    for (let i = 0; i < STREAM_COUNT; i++) {
      const p = particles[i];
      p.progress = (p.progress + d * p.speed) % 1;
      const a = p.angle + p.progress * Math.PI * 2;
      positions[i * 3]     = Math.cos(a) * p.r * vis;
      positions[i * 3 + 1] = Math.sin(a) * p.r * vis;
      positions[i * 3 + 2] = (1 - p.progress) * 18 * vis;
    }
    if (ref.current) {
      ref.current.geometry.attributes.position.needsUpdate = true;
      ref.current.material.opacity = vis * 0.8;
    }

    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      ring.rotation.z = t * 0.2 + i * 0.5;
      ring.material.opacity = vis * (0.12 + Math.sin(t * 1.5 + i) * 0.06);
      ring.scale.setScalar(1 + Math.sin(t * 2 + i * 0.8) * 0.05);
    });
  });

  return (
    <group position={[-2, 2, -22]}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={STREAM_COUNT} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#06b6d4" size={0.1} sizeAttenuation transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[0, 0, -i * 1.5]} ref={el => (ringRefs.current[i] = el)}>
          <torusGeometry args={[3.2, 0.015, 16, 80]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      <pointLight intensity={14} color="#06b6d4" distance={35} />
    </group>
  );
};

/* ── Evolve Sphere — final morph sphere ── */
const EvolveSphere = () => {
  const matRef = useRef();
  const meshRef = useRef();
  const outerRef = useRef();
  const scroll = useScroll();

  useFrame(({ clock }, d) => {
    const t = clock.elapsedTime;
    const s = clamp01(scroll.offset);
    const vis = ss(0.64, 0.76, s) * (1 - ss(0.86, 0.95, s));

    if (matRef.current) {
      matRef.current.uTime = t;
      matRef.current.uIntensity = vis * (0.35 + Math.sin(t * 0.6) * 0.15);
      matRef.current.uColor.set('#8b5cf6');
      matRef.current.uGlow.set('#e879f9');
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += d * 0.08;
      meshRef.current.rotation.x += d * 0.03;
      meshRef.current.scale.setScalar(vis * 2.8);
    }
    if (outerRef.current) {
      outerRef.current.rotation.y -= d * 0.05;
      outerRef.current.scale.setScalar(vis * 4.5 + Math.sin(t * 0.8) * 0.2);
      outerRef.current.material.opacity = vis * 0.08;
    }
  });

  return (
    <group position={[0, 3, -32]}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[2.5, 64]} />
        <coreMaterial ref={matRef} transparent depthWrite={false} />
      </mesh>
      <mesh ref={outerRef}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight intensity={20} color="#8b5cf6" distance={40} />
    </group>
  );
};

/* ── Ambient floating wireframe shapes ── */
const FloatingGeometry = () => {
  const refs = useRef([]);

  const shapes = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      pos: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 25, 38 - Math.random() * 100],
      rotSpeed: 0.03 + Math.random() * 0.08,
      scale: 0.15 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      type: i % 4,
    })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const s = shapes[i];
      mesh.rotation.x = t * s.rotSpeed + s.phase;
      mesh.rotation.y = t * s.rotSpeed * 0.7 + s.phase * 0.5;
      mesh.position.y = s.pos[1] + Math.sin(t * 0.15 + s.phase) * 1.5;
      mesh.material.opacity = 0.18 + Math.sin(t * 0.5 + i * 0.5) * 0.08;
    });
  });

  return (
    <group>
      {shapes.map((s, i) => (
        <mesh key={i} ref={el => (refs.current[i] = el)} position={s.pos} scale={s.scale}>
          {s.type === 0 && <icosahedronGeometry args={[1, 1]} />}
          {s.type === 1 && <octahedronGeometry args={[1, 0]} />}
          {s.type === 2 && <torusGeometry args={[1, 0.3, 8, 16]} />}
          {s.type === 3 && <tetrahedronGeometry args={[1, 0]} />}
          <meshBasicMaterial
            color={['#4338ca', '#6366f1', '#818cf8', '#a78bfa'][i % 4]}
            wireframe
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

/* ── Subtle ground grid ── */
const GroundGrid = () => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.material.opacity = 0.12 + Math.sin(clock.elapsedTime * 0.3) * 0.03;
    }
  });
  return (
    <gridHelper ref={ref} args={[200, 80, '#312e81', '#312e81']} position={[0, -5, -20]} />
  );
};


/* ═══════════════════════════════════════════════════
   DOM OVERLAY — Floating immersive text
   ═══════════════════════════════════════════════════ */

/* Directional slide-in reveal — no blur, crisp text */
const RevealSection = ({ children, style = {}, from = 'left' }) => {
  const ref = useRef();

  useEffect(() => {
    let id;
    const tick = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const center = rect.top + rect.height / 2;
        const distFromCenter = Math.abs(center - vh / 2);
        const maxDist = vh * 0.55;
        const raw = clamp01(1 - distFromCenter / maxDist);
        const a = raw * raw * (3 - 2 * raw);
        const xOff = from === 'left' ? -60 : from === 'right' ? 60 : 0;
        ref.current.style.opacity = a.toFixed(3);
        ref.current.style.transform = `translate(${((1 - a) * xOff).toFixed(1)}px, ${((1 - a) * 30).toFixed(1)}px)`;
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [from]);

  return (
    <div ref={ref} style={{ opacity: 0, willChange: 'opacity, transform', ...style }}>
      {children}
    </div>
  );
};

const sectionFont = { fontFamily: "'Sora', sans-serif", color: '#c8cad0' };

const heroTitleStyle = {
  ...gradText,
  backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 30%, #c7d2fe 60%, #a5b4fc 100%)',
  fontSize: 'clamp(80px, 14vw, 180px)',
  fontWeight: 900,
  lineHeight: 0.88,
  margin: 0,
  letterSpacing: '-0.04em',
  textShadow: '0 0 120px rgba(99,102,241,0.7), 0 0 60px rgba(139,92,246,0.5), 0 0 200px rgba(99,102,241,0.25)',
};

const accentLine = (color = '#6366f1', w = 50) => ({
  width: w, height: 2, borderRadius: 2, marginBottom: 18,
  background: `linear-gradient(90deg, ${color}, transparent)`,
});

/* Grand hero entrance — fades in with scale + backdrop blur */
const HeroReveal = ({ children, style = {} }) => {
  const ref = useRef();
  const backdropRef = useRef();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let id;
    const tick = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const vh = window.innerHeight;
        const center = rect.top + rect.height / 2;
        const distFromCenter = Math.abs(center - vh / 2);
        const maxDist = vh * 0.55;
        const raw = clamp01(1 - distFromCenter / maxDist);
        const a = raw * raw * (3 - 2 * raw);
        ref.current.style.opacity = a.toFixed(3);
        ref.current.style.transform = `scale(${(0.85 + a * 0.15).toFixed(4)})`;
        if (backdropRef.current) {
          backdropRef.current.style.opacity = (a * 0.6).toFixed(3);
        }
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      {/* full-screen darkened blur backdrop behind hero */}
      <div ref={backdropRef} style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'radial-gradient(ellipse at center, rgba(12,12,20,0.75) 0%, rgba(12,12,20,0.4) 60%, transparent 100%)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        opacity: 0, pointerEvents: 'none', transition: 'opacity 0.3s',
      }} />
      <div ref={ref} style={{
        opacity: 0, willChange: 'opacity, transform',
        transition: entered ? 'none' : 'opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)',
        ...style,
      }}>
        {children}
      </div>
    </>
  );
};

const HtmlOverlay = () => {
  const pinkGrad = { ...gradText, backgroundImage: 'linear-gradient(135deg, #e879f9 0%, #f472b6 50%, #fb923c 100%)' };
  const cyanGrad = { ...gradText, backgroundImage: 'linear-gradient(135deg, #22d3ee 0%, #3b82f6 50%, #8b5cf6 100%)' };

  return (
    <div style={{ width: '100vw', position: 'relative' }}>

      {/* ── Hero — centered grand entrance ── */}
      <HeroReveal style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={sectionFont}>
          <p style={{ color: '#6366f1', fontSize: 12, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 500 }}>
            Federated Intelligence Platform
          </p>
          <h1 style={heroTitleStyle}>
            HiveMind
          </h1>
          <div style={{ ...accentLine('#6366f1', 100), marginTop: 24, marginLeft: 'auto', marginRight: 'auto' }} />
          <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.8, marginTop: 8, maxWidth: 480 }}>
            Train AI models together without ever sharing your data.<br />Your devices. One collective brain.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40, color: '#4b5563', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, #6366f1, transparent)' }} />
            Scroll to explore
          </div>
        </div>
      </HeroReveal>

      {/* ── 01 The Vision ── */}
      <RevealSection from="left" style={{ position: 'absolute', top: '110vh', left: '6vw', width: 520 }}>
        <div style={sectionFont}>
          <div style={accentLine('#818cf8', 40)} />
          <p style={{ color: '#818cf8', fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            01 — The Vision
          </p>
          <h2 style={{ color: '#e2e8f0', fontSize: 44, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            Collaborative AI,<br />
            <span style={gradText}>Without Boundaries</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginTop: 18 }}>
            HiveMind is a federated learning platform where hundreds of devices train models together in real‑time — while every byte of raw data stays private.
          </p>
          <div style={{ display: 'flex', gap: 36, marginTop: 28 }}>
            {[
              { val: '100%', label: 'Privacy', col: '#818cf8' },
              { val: '10×', label: 'Faster', col: '#a78bfa' },
              { val: '∞', label: 'Devices', col: '#e879f9' },
            ].map(({ val, label, col }) => (
              <div key={label}>
                <p style={{ color: col, fontSize: 30, fontWeight: 800, margin: 0, lineHeight: 1 }}>{val}</p>
                <p style={{ color: '#4b5563', fontSize: 10, marginTop: 6, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ── 02 Connect ── */}
      <RevealSection from="right" style={{ position: 'absolute', top: '210vh', right: '6vw', width: 500 }}>
        <div style={{ ...sectionFont, textAlign: 'right' }}>
          <div style={{ ...accentLine('#e879f9', 40), marginLeft: 'auto' }} />
          <p style={{ color: '#e879f9', fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            02 — Connect
          </p>
          <h2 style={{ color: '#e2e8f0', fontSize: 44, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            Every Device<br />
            <span style={pinkGrad}>Trains Locally</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginTop: 18 }}>
            When you join a HiveMind room, your device trains its own copy of the model using only your local data. No uploads — just your GPU doing the work.
          </p>
        </div>
      </RevealSection>

      {/* ── 03 Synchronize ── */}
      <RevealSection from="left" style={{ position: 'absolute', top: '300vh', left: '6vw', width: 500 }}>
        <div style={sectionFont}>
          <div style={accentLine('#22d3ee', 40)} />
          <p style={{ color: '#22d3ee', fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            03 — Synchronize
          </p>
          <h2 style={{ color: '#e2e8f0', fontSize: 44, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            Only Weights Travel.<br />
            <span style={cyanGrad}>Data Never Leaves.</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginTop: 18 }}>
            After each round, devices share only model weights — tiny numeric updates. The server aggregates them, producing a smarter global model without seeing a single data point.
          </p>
        </div>
      </RevealSection>

      {/* ── 04 Evolve ── */}
      <RevealSection from="right" style={{ position: 'absolute', top: '380vh', right: '8vw', width: 480 }}>
        <div style={{ ...sectionFont, textAlign: 'center' }}>
          <div style={{ ...accentLine('#a78bfa', 40), margin: '0 auto 18px' }} />
          <p style={{ color: '#a78bfa', fontSize: 11, letterSpacing: '0.4em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
            04 — Evolve
          </p>
          <h2 style={{ color: '#e2e8f0', fontSize: 44, fontWeight: 700, lineHeight: 1.1, margin: 0 }}>
            The Model Gets Smarter.<br />
            <span style={gradText}>Together.</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.8, marginTop: 18 }}>
            Each sync cycle strengthens the collective intelligence. More participants means better generalization and faster convergence — with zero data exposure.
          </p>
        </div>
      </RevealSection>

      {/* ── Auth / Join ── */}
      <RevealSection from="center" style={{ position: 'absolute', top: '450vh', left: '50%', width: 400, marginLeft: -200 }}>
        <div style={{ ...sectionFont, textAlign: 'center' }}>
          <h3 style={{ ...gradText, fontSize: 34, fontWeight: 800, margin: 0 }}>Join HiveMind</h3>
          <p style={{ color: '#4b5563', fontSize: 13, marginTop: 8, marginBottom: 28 }}>Start training with the collective</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              placeholder="Email address"
              style={{ background: 'rgba(19,19,31,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '15px 18px', fontSize: 14, color: '#e2e8f0', outline: 'none', fontFamily: "'Sora', sans-serif", backdropFilter: 'blur(12px)' }}
            />
            <input
              type="password"
              placeholder="Password"
              style={{ background: 'rgba(19,19,31,0.5)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '15px 18px', fontSize: 14, color: '#e2e8f0', outline: 'none', fontFamily: "'Sora', sans-serif", backdropFilter: 'blur(12px)' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
              <button style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 24px rgba(99,102,241,0.4)', fontFamily: "'Sora', sans-serif", letterSpacing: '0.03em' }}>
                Login
              </button>
              <button style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '15px 0', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'Sora', sans-serif", letterSpacing: '0.03em' }}>
                Register
              </button>
            </div>
          </div>
          <p style={{ color: '#374151', fontSize: 11, marginTop: 24, lineHeight: 1.5 }}>
            Your device becomes part of a privacy‑preserving distributed training network.
          </p>
        </div>
      </RevealSection>
    </div>
  );
};


/* ═══════════════════════════════════════════════════
   Scene export
   ═══════════════════════════════════════════════════ */
export const Scene = () => (
  <div className="w-full h-screen absolute inset-0 z-0" style={{ background: BG }}>
    <Canvas
      camera={{ position: [0, 1.5, 28], fov: 55 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 35, 80]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 15]} intensity={0.8} color="#818cf8" />
      <directionalLight position={[-8, 5, -10]} intensity={0.4} color="#a78bfa" />

      <ScrollControls pages={5.5} damping={0.2}>
        <TourCamera />

        <ParticleField />
        <HeroSphere />
        <NetworkConstellation />
        <TrainingGyro />
        <DataTunnel />
        <EvolveSphere />
        <FloatingGeometry />
        <GroundGrid />

        <Scroll html style={{ width: '100%' }}>
          <HtmlOverlay />
        </Scroll>
      </ScrollControls>
    </Canvas>

    {/* CSS Vignette overlay — replaces EffectComposer Vignette */}
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'radial-gradient(ellipse at center, transparent 50%, rgba(12,12,20,0.6) 100%)',
    }} />

    {/* Scroll indicator */}
    <div style={{
      position: 'absolute', bottom: 36, left: '50%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      pointerEvents: 'none', animation: 'scrollFloat 3s ease-in-out infinite',
    }}>
      <span style={{ color: '#94a3b8', fontSize: 11, letterSpacing: '0.25em', fontFamily: "'Sora', sans-serif", textTransform: 'uppercase' }}>Scroll</span>
      <div style={{ width: 1, height: 30, background: 'linear-gradient(to bottom, #818cf8, transparent)', opacity: 0.7 }} />
    </div>
  </div>
);
