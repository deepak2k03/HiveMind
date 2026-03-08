import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/useRoomStore';
import * as THREE from 'three';

const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();

export const InstancedPeers = () => {
  const meshRef = useRef();
  const peersCount = useRoomStore(state => state.peers);
  
  // Safe max limit for instancing, only renders up to 'peersCount'
  const MAX_PEERS = 200; 

  const peerData = useMemo(() => {
    return new Array(MAX_PEERS).fill().map(() => ({
      radius: 4 + Math.random() * 4, // Orbit distance
      speed: 0.2 + Math.random() * 0.5,
      angle: Math.random() * Math.PI * 2,
      yOffset: (Math.random() - 0.5) * 3,
    }));
  }, []);

  useFrame((state) => {
    if (!meshRef.current || peersCount === 0) return;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < peersCount; i++) {
      const p = peerData[i];
      const currentAngle = p.angle + time * p.speed;
      
      tempPosition.set(
        Math.cos(currentAngle) * p.radius,
        p.yOffset + Math.sin(time * 2 + i) * 0.3, // Gentle hover
        Math.sin(currentAngle) * p.radius
      );

      // Orient peer to face the core
      tempMatrix.lookAt(tempPosition, new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0));
      tempMatrix.setPosition(tempPosition);
      
      meshRef.current.setMatrixAt(i, tempMatrix);
    }
    
    // Tell Three.js the matrix array has been updated
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // If no peers, don't render the mesh
  if (peersCount === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[null, null, MAX_PEERS]} count={peersCount}>
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial color="#ff007b" emissive="#ff007b" emissiveIntensity={2} />
    </instancedMesh>
  );
};