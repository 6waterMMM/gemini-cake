export enum AppState {
  ASSEMBLED = 'ASSEMBLED', // Cake shape
  SCATTERED = 'SCATTERED', // Floating particles
  PHOTO_ZOOM = 'PHOTO_ZOOM', // Single photo focus
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',       // Trigger Assembled
  OPEN_PALM = 'OPEN_PALM', // Trigger Scattered
  PINCH = 'PINCH',     // Trigger Photo Zoom
  POINTING = 'POINTING' // Tracking for rotation
}

export interface ParticleData {
  id: number;
  initialPos: [number, number, number]; // Scattered position
  targetPos: [number, number, number];  // Cake position
  color: string;
  type: 'sphere' | 'cube';
  scale: number;
}

export interface PhotoData {
  id: string;
  url: string;
  aspectRatio: number;
}
