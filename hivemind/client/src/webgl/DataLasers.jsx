import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/useRoomStore';
import * as THREE from 'three';

export const DataLasers = () => {
  const beamRef = useRef();
  const auraRef = useRef();
  const visualState = useRoomStore(state => state.visualState);

  useFrame((_, delta) => {
    if (!beamRef.current || !auraRef.current) return;

    // 1. Read mutable state directly (Zero React overhead)
    let intensity = visualState.laserPulseIntensity;

    // 2. Smooth exponential decay for the laser
    if (intensity > 0) {
      visualState.laserPulseIntensity -= delta * 3.5; // Controls how fast the laser fades
      if (visualState.laserPulseIntensity < 0) visualState.laserPulseIntensity = 0;
    }

    // 3. Mutate the mesh properties directly
    // The beam scales up and gets brighter
    beamRef.current.scale.set(1 + intensity * 2, 1, 1 + intensity * 2);
    beamRef.current.material.opacity = intensity * 0.8;
    
    // The aura expands outward like a shockwave
    auraRef.current.scale.setScalar(1 + intensity * 1.5);
    auraRef.current.material.opacity = intensity * 0.3;
  });

  return (
    <group>
      {/* Central Data Beam */}
      <mesh ref={beamRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 20, 16]} />
        <meshBasicMaterial 
          color="#ff00ff" 
          transparent 
          opacity={0} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Energy Shockwave Aura */}
      <mesh ref={auraRef}>
        <sphereGeometry args={[1.8, 32, 32]} />
        <meshBasicMaterial 
          color="#00f2ff" 
          transparent 
          opacity={0} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};