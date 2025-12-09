import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { InstancedMesh, Object3D, Vector3, Color, MathUtils, Group, Mesh } from 'three';
import { useStore } from '../store';
import { AppState, ParticleData } from '../types';
import { generateParticles } from '../utils/geometry';
import { Image } from '@react-three/drei';
import { FrostingParticles } from './FrostingParticles';

const PARTICLE_COUNT = 300;
const DUMMY = new Object3D();
const LERP_FACTOR = 0.05;

export const CakeParticles: React.FC = () => {
  const { currentState, rotationOffset, photos, activePhotoIndex, setActivePhoto } = useStore();
  const groupRef = useRef<Group>(null);
  const autoRotationRef = useRef(0);
  
  // Instance Refs
  const sphereMeshRef = useRef<InstancedMesh>(null);
  const cubeMeshRef = useRef<InstancedMesh>(null);

  // Data
  const particles = useMemo(() => generateParticles(PARTICLE_COUNT), []);
  
  // Split particles into spheres and cubes for two draw calls
  const sphereParticles = useMemo(() => particles.filter(p => p.type === 'sphere'), [particles]);
  const cubeParticles = useMemo(() => particles.filter(p => p.type === 'cube'), [particles]);

  // Current visual positions (interpolated per frame)
  const currentPositions = useRef(particles.map(p => ({ ...p.initialPos })));
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. Group Rotation
    if (currentState === AppState.ASSEMBLED) {
       // Reduced auto rotation speed
       autoRotationRef.current += delta * 0.05; 
    }

    // Apply rotation (treat rotationOffset as an absolute angle addition, not velocity)
    groupRef.current.rotation.y = autoRotationRef.current + rotationOffset;

    // 2. Particle Interpolation
    particles.forEach((p, i) => {
        const target = currentState === AppState.ASSEMBLED ? p.targetPos : p.initialPos;
        const current = currentPositions.current[i];
        
        current[0] = MathUtils.lerp(current[0], target[0], LERP_FACTOR);
        current[1] = MathUtils.lerp(current[1], target[1], LERP_FACTOR);
        current[2] = MathUtils.lerp(current[2], target[2], LERP_FACTOR);
        
        if (currentState === AppState.SCATTERED) {
            const t = state.clock.getElapsedTime();
            current[1] += Math.sin(t + p.id) * 0.005;
        }
    });

    // 3. Update Instanced Meshes
    updateMesh(sphereMeshRef.current, sphereParticles);
    updateMesh(cubeMeshRef.current, cubeParticles);
  });

  const updateMesh = (mesh: InstancedMesh | null, subset: ParticleData[]) => {
    if (!mesh) return;
    let idx = 0;
    particles.forEach((p, originalIndex) => {
        if (subset.find(s => s.id === p.id)) {
            const pos = currentPositions.current[originalIndex];
            DUMMY.position.set(pos[0], pos[1], pos[2]);
            DUMMY.scale.setScalar(p.scale);
            DUMMY.updateMatrix();
            mesh.setMatrixAt(idx, DUMMY.matrix);
            idx++;
        }
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    const initColor = (mesh: InstancedMesh | null, subset: ParticleData[]) => {
        if (!mesh) return;
        subset.forEach((p, i) => {
            mesh.setColorAt(i, new Color(p.color));
        });
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }
    };
    initColor(sphereMeshRef.current, sphereParticles);
    initColor(cubeMeshRef.current, cubeParticles);
  }, [sphereParticles, cubeParticles]);


  // Active photo selection logic: Pick the one closest to the "front" (camera)
  useEffect(() => {
    if (currentState === AppState.PHOTO_ZOOM && photos.length > 0) {
        if (activePhotoIndex === null && groupRef.current) {
            const currentRotY = groupRef.current.rotation.y;
            const cameraPos = new Vector3(0, 2, 8); // Approx camera position
            const radius = 4;
            
            let bestIndex = 0;
            let minDistanceSq = Infinity;
            
            const tempVec = new Vector3();
            const axisY = new Vector3(0, 1, 0);

            photos.forEach((_, index) => {
                // Reconstruct estimated world position
                const theta = (index / photos.length) * Math.PI * 2;
                // Use average height (1) for selection logic
                tempVec.set(Math.cos(theta) * radius, 1, Math.sin(theta) * radius);
                
                // Apply current group rotation
                tempVec.applyAxisAngle(axisY, currentRotY);
                
                const distSq = tempVec.distanceToSquared(cameraPos);
                
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    bestIndex = index;
                }
            });
            
            setActivePhoto(bestIndex);
        }
    } else if (currentState !== AppState.PHOTO_ZOOM) {
        if (activePhotoIndex !== null) {
            setActivePhoto(null);
        }
    }
  }, [currentState, photos.length, activePhotoIndex, setActivePhoto, photos]);


  return (
    <group ref={groupRef}>
      {/* New Frosting Layer */}
      <FrostingParticles />

      {/* Existing Structural Particles */}
      <instancedMesh ref={sphereMeshRef} args={[undefined, undefined, sphereParticles.length]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial roughness={0.4} metalness={0.6} />
      </instancedMesh>
      
      <instancedMesh ref={cubeMeshRef} args={[undefined, undefined, cubeParticles.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.4} metalness={0.6} />
      </instancedMesh>

      {photos.map((photo, index) => (
        <PhotoItem 
            key={photo.id} 
            url={photo.url} 
            index={index} 
            total={photos.length} 
            isZoomed={activePhotoIndex === index}
            state={currentState}
        />
      ))}
    </group>
  );
};

const PhotoItem: React.FC<{ 
    url: string; 
    index: number; 
    total: number;
    isZoomed: boolean;
    state: AppState;
}> = ({ url, index, total, isZoomed, state }) => {
    const meshRef = useRef<Mesh>(null);
    
    const initialPos = useMemo(() => {
        const theta = (index / total) * Math.PI * 2;
        const r = 4;
        return new Vector3(Math.cos(theta) * r, Math.random() * 2, Math.sin(theta) * r);
    }, [index, total]);

    useFrame((stateCtx) => {
        if (!meshRef.current) return;
        
        const t = stateCtx.clock.getElapsedTime();
        let targetPos = new Vector3();
        let targetScale = 1;
        let targetRot = new Vector3(0, 0, 0);

        if (isZoomed) {
            // Bring to front center relative to the group
            targetPos.set(0, 0, 4); 
            targetScale = 3;
        } else if (state === AppState.ASSEMBLED) {
             targetPos.copy(initialPos).multiplyScalar(0.6);
             targetPos.y = initialPos.y * 0.5;
             targetScale = 0.5;
             targetRot.set(0, -t * 0.05, 0); 
        } else {
            targetPos.copy(initialPos);
            targetPos.y += Math.sin(t + index) * 0.5;
            targetScale = 1;
            targetRot.set(Math.sin(t)*0.2, (index/total) * Math.PI * 2, 0);
        }

        meshRef.current.position.lerp(targetPos, 0.05);
        meshRef.current.scale.lerp(new Vector3(targetScale, targetScale, 1), 0.05);
        
        if (isZoomed) {
             meshRef.current.lookAt(0, 0, 10); 
        } else {
             meshRef.current.rotation.x = MathUtils.lerp(meshRef.current.rotation.x, targetRot.x, 0.05);
             meshRef.current.rotation.y = MathUtils.lerp(meshRef.current.rotation.y, targetRot.y, 0.05);
        }
    });

    return (
        <Image 
            ref={meshRef}
            url={url}
            transparent
            opacity={0.9}
            scale={[1.5, 1]} 
        />
    );
};