import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/useRoomStore';

export const CyberCore = () => {
  const meshRef = useRef();
  const visualState = useRoomStore(state => state.visualState);
  const isTraining = useRoomStore(state => state.isTraining);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Decay the rotation speed back to normal smoothly
    if (visualState.coreRotationSpeed > 0.2) {
      visualState.coreRotationSpeed -= delta * 1.5;
    }

    // Apply rotation
    meshRef.current.rotation.y += delta * visualState.coreRotationSpeed;
    meshRef.current.rotation.z += delta * (visualState.coreRotationSpeed * 0.5);

    // Pulse the core's emissive intensity if active training is happening
    const baseGlow = isTraining ? 3 : 1;
    const pulse = isTraining ? Math.sin(state.clock.elapsedTime * 8) * 1.5 : 0;
    meshRef.current.material.emissiveIntensity = baseGlow + pulse;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 2]} />
      {/* Wireframe makes it look highly technical and uncluttered */}
      <meshStandardMaterial 
        color="#00f2ff" 
        emissive="#00f2ff" 
        wireframe={true} 
      />
    </mesh>
  );
};