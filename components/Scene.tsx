import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { Environment, OrbitControls, Stars } from '@react-three/drei';
import { CakeParticles } from './CakeParticles';
import { Candle } from './Candle';
import { useStore } from '../store';
import { AppState } from '../types';

export const Scene: React.FC = () => {
  const { currentState } = useStore();

  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 45 }}
      gl={{ antialias: false, alpha: false }} // Postproc needs false AA often, or setup specifically
      dpr={[1, 2]}
    >
      <color attach="background" args={['#050505']} />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
      <pointLight position={[-10, -5, -10]} intensity={0.5} color="#556B2F" />
      <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={1} castShadow />

      {/* Environment */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="city" />

      {/* Content */}
      <group position={[0, -1, 0]}>
        <Suspense fallback={null}>
            <CakeParticles />
            <Candle />
        </Suspense>
      </group>

      {/* Post Processing for Cinematic Feel */}
      <EffectComposer disableNormalPass>
        <Bloom 
            luminanceThreshold={0.5} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.6}
        />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>

      {/* OrbitControls mainly for debug, disabled interaction if hand is primary */}
      {/* <OrbitControls enableZoom={false} /> */}
    </Canvas>
  );
};