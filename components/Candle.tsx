import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { AppState } from '../types';

export const Candle: React.FC = () => {
  const { currentState } = useStore();
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Target positions
  // Assembled: Lowered y to 2.3 to be closer to the cake top (particles)
  const assembledPos = useMemo(() => new THREE.Vector3(0, 2.3, 0), []);
  
  // Scattered: Random position above/around
  const scatteredPos = useMemo(() => new THREE.Vector3(
    (Math.random() - 0.5) * 8, 
    4 + Math.random() * 4, 
    (Math.random() - 0.5) * 8
  ), []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !flameRef.current || !lightRef.current) return;
    
    // 1. Position Interpolation
    // In SCATTERED or PHOTO_ZOOM, the candle floats away
    const targetPos = currentState === AppState.ASSEMBLED ? assembledPos : scatteredPos;
    
    // Smooth transition
    groupRef.current.position.lerp(targetPos, 0.04);
    
    // 2. Flame Dynamics (Flicker & Sway)
    const t = clock.getElapsedTime();
    
    // Flicker calculation
    const flicker = Math.sin(t * 12) * 0.1 + Math.cos(t * 25) * 0.1;
    
    // Teardrop shape: Narrow X/Z, Tall Y. 
    // Base radius 0.08. 
    // Scaling x/z by 0.7 -> 0.056 radius
    // Scaling y by 2.2 -> 0.176 height
    flameRef.current.scale.set(
        0.7 + flicker * 0.1,
        2.2 + flicker * 0.3, 
        0.7 + flicker * 0.1
    );
    
    // Swaying motion (like subtle wind)
    flameRef.current.rotation.z = Math.sin(t * 3) * 0.08; 
    flameRef.current.rotation.x = Math.cos(t * 2.5) * 0.08;

    // Light flicker
    lightRef.current.intensity = 2 + flicker * 1.5;
    lightRef.current.distance = 6 + flicker;
    lightRef.current.position.x = Math.sin(t * 15) * 0.02;
  });

  return (
    <group ref={groupRef} position={[0, 10, 0]}> {/* Start high or handle via lerp */}
      {/* Candle Body - Christmas Red */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 16]} />
        <meshStandardMaterial color="#B22222" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* Wick */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.15]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Flame - Teardrop (Stretched Sphere) */}
      <mesh ref={flameRef} position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#FFD700" toneMapped={false} />
      </mesh>
      
      {/* Light */}
      <pointLight 
        ref={lightRef}
        position={[0, 1.1, 0]} 
        color="#FFA500" 
        distance={5} 
        decay={2}
        castShadow
      />
    </group>
  );
};