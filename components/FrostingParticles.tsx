import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { AppState } from '../types';

const COUNT = 3500;

// Shaders
const vertexShader = `
  uniform float uTime;
  uniform float uMix; // 0 = Scattered, 1 = Assembled
  uniform float uPixelRatio;

  attribute vec3 aTargetPos;
  attribute float aSize;
  attribute float aGoldLevel; // 0.0 for Cream, 1.0 for Gold
  
  varying vec3 vPos;
  varying float vAlpha;
  varying float vGoldLevel;

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    // Interpolate position
    vec3 pos = mix(position, aTargetPos, uMix);

    // Breathing/Jitter effect
    float breathingStrength = mix(0.1, 0.02, uMix);
    float offset = random(position.xy) * 10.0; // Random phase
    pos.x += sin(uTime * 2.0 + offset) * breathingStrength;
    pos.y += cos(uTime * 1.5 + offset) * breathingStrength;
    pos.z += sin(uTime * 2.2 + offset) * breathingStrength;

    vPos = pos;
    vGoldLevel = aGoldLevel;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = aSize * uPixelRatio * (30.0 / -mvPosition.z);
    
    // Inverse Opacity Logic:
    // Small particles (aSize ~1.0) -> High Opacity (0.9)
    // Large particles (aSize ~8.0) -> Low Opacity (0.15)
    float nSize = clamp((aSize - 1.0) / 7.0, 0.0, 1.0); // Normalized 0..1
    float sizeAlpha = mix(0.9, 0.15, nSize);
    
    // State fade
    float stateAlpha = mix(0.5, 1.0, uMix);

    vAlpha = sizeAlpha * stateAlpha;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying vec3 vPos;
  varying float vGoldLevel;
  uniform float uTime;

  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) discard;

    float radial = dist * 2.0; 
    
    // Palettes - Warmer/Yellower as requested
    // 1. Warm Cream 
    vec3 creamCore = vec3(1.0, 0.96, 0.85); 
    vec3 creamEdge = vec3(0.96, 0.85, 0.60); 
    
    // 2. Gold
    vec3 goldCore = vec3(1.0, 0.85, 0.4);
    vec3 goldEdge = vec3(0.8, 0.6, 0.1);

    // Mix based on particle type (aGoldLevel)
    vec3 colorCore = mix(creamCore, goldCore, vGoldLevel);
    vec3 colorEdge = mix(creamEdge, goldEdge, vGoldLevel);
    
    // Soft core calculation
    float strength = 1.0 - radial;
    strength = pow(strength, 2.0); // Softer falloff
    
    // Sparkle / Blink Logic
    float noise = fract(sin(dot(vPos.xy, vec2(12.9898, 78.233))) * 43758.5453);
    float blink = 0.8 + 0.3 * sin(uTime * 2.5 + noise * 6.28);
    
    vec3 finalColor = mix(colorEdge, colorCore, strength);
    finalColor *= blink;

    // Apply alpha. In AdditiveBlending: Result = SrcColor * SrcAlpha + DstColor.
    // So we control intensity via alpha.
    gl_FragColor = vec4(finalColor, vAlpha * strength);
  }
`;

export const FrostingParticles: React.FC = () => {
  const { currentState } = useStore();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Generate Geometry
  const { positions, targetPositions, sizes, goldLevels } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const target = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    const gold = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;

      // 1. Initial / Scattered Position (Cloud)
      const rScatter = 12 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      pos[i3] = rScatter * Math.sin(phi) * Math.cos(theta);
      pos[i3 + 1] = rScatter * Math.sin(phi) * Math.sin(theta);
      pos[i3 + 2] = rScatter * Math.cos(phi);

      // 2. Target / Assembled Position (Cake Shape)
      const isTop = Math.random() > 0.65;
      
      let rCake, yCake;
      const angle = Math.random() * Math.PI * 2;

      if (isTop) {
        rCake = Math.sqrt(Math.random()) * 1.8; 
        yCake = 1 + Math.random() * 1.5;
      } else {
        rCake = Math.sqrt(Math.random()) * 2.8;
        yCake = -1 + Math.random() * 2.0;
      }

      target[i3] = Math.cos(angle) * rCake;
      target[i3 + 1] = yCake;
      target[i3 + 2] = Math.sin(angle) * rCake;

      // 3. Size using Power Curve for variation
      // Creates many small particles and few large ones
      // Range: 1.0 to 8.0
      const sizeRandom = Math.pow(Math.random(), 5.0); 
      sz[i] = 1.0 + sizeRandom * 7.0;

      // 4. Gold Level (approx 20% particles are gold)
      gold[i] = Math.random() < 0.2 ? 1.0 : 0.0;
    }

    return {
      positions: pos,
      targetPositions: target,
      sizes: sz,
      goldLevels: gold
    };
  }, []);

  // Stable Uniforms - removed currentState from deps to prevent re-creation
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    // Initialize based on current state (captured once on mount)
    uMix: { value: currentState === AppState.ASSEMBLED ? 1.0 : 0.0 },
    uPixelRatio: { value: 1 }
  }), []); 

  useFrame(({ clock, gl }) => {
    if (!materialRef.current) return;

    // Uniform Updates
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio();

    // Smooth Mix Transition
    // useFrame runs on every frame and closes over the latest currentState from the component render
    const targetMix = currentState === AppState.ASSEMBLED ? 1.0 : 0.0;
    const currentMix = materialRef.current.uniforms.uMix.value;
    materialRef.current.uniforms.uMix.value = THREE.MathUtils.lerp(currentMix, targetMix, 0.05);
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={COUNT}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={COUNT}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aGoldLevel"
          count={COUNT}
          array={goldLevels}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
      />
    </points>
  );
};