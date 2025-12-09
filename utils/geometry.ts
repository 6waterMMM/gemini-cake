import * as THREE from 'three';
import { ParticleData } from '../types';

const COLORS = [
  '#FFFFF0', // Ivory
  '#556B2F', // Matte Green
  '#D4AF37', // Gold
  '#B22222', // Christmas Red
];

// Helper to get random point in sphere
const randomPointInSphere = (radius: number): [number, number, number] => {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random()) * radius;
  const sinPhi = Math.sin(phi);
  return [
    r * sinPhi * Math.cos(theta),
    r * sinPhi * Math.sin(theta),
    r * Math.cos(phi)
  ];
};

export const generateParticles = (count: number): ParticleData[] => {
  const particles: ParticleData[] = [];
  
  for (let i = 0; i < count; i++) {
    // 1. Generate Target Position (The Cake Shape)
    // Two tiers: Bottom (radius 3, height 2), Top (radius 2, height 1.5)
    
    let tx, ty, tz;
    const isTopTier = Math.random() > 0.6;
    
    const angle = Math.random() * Math.PI * 2;
    
    if (isTopTier) {
       // Top tier: y from 1 to 2.5
       const r = Math.sqrt(Math.random()) * 1.8; // Distribution closer to outside
       tx = Math.cos(angle) * r;
       tz = Math.sin(angle) * r;
       ty = 1 + Math.random() * 1.5;
    } else {
       // Bottom tier: y from -1 to 1
       const r = Math.sqrt(Math.random()) * 2.8;
       tx = Math.cos(angle) * r;
       tz = Math.sin(angle) * r;
       ty = -1 + Math.random() * 2;
    }

    // 2. Generate Initial Position (Scattered Cloud)
    // A large sphere around the scene
    const [ix, iy, iz] = randomPointInSphere(12);

    // 3. Style
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const type = Math.random() > 0.5 ? 'sphere' : 'cube';
    const scale = 0.1 + Math.random() * 0.15;

    particles.push({
      id: i,
      initialPos: [ix, iy, iz],
      targetPos: [tx, ty, tz],
      color,
      type,
      scale
    });
  }
  return particles;
};