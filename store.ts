import { create } from 'zustand';
import { AppState, GestureType, PhotoData } from './types';

interface StoreState {
  currentState: AppState;
  currentGesture: GestureType;
  handPosition: { x: number; y: number }; // Normalized -1 to 1
  rotationOffset: number; // For manual rotation
  photos: PhotoData[];
  activePhotoIndex: number | null;
  
  // Actions
  setGesture: (gesture: GestureType) => void;
  setHandPosition: (x: number, y: number) => void;
  setRotationOffset: (delta: number) => void;
  addPhoto: (url: string) => void;
  setActivePhoto: (index: number | null) => void;
  setAppState: (state: AppState) => void;
}

export const useStore = create<StoreState>((set) => ({
  currentState: AppState.ASSEMBLED,
  currentGesture: GestureType.NONE,
  handPosition: { x: 0, y: 0 },
  rotationOffset: 0,
  photos: [],
  activePhotoIndex: null,

  setGesture: (gesture) => set((state) => {
    // State machine transitions based on gestures
    let newState = state.currentState;
    
    if (gesture === GestureType.FIST) {
      newState = AppState.ASSEMBLED;
    } else if (gesture === GestureType.OPEN_PALM) {
        // Only exit zoom if open palm
      newState = AppState.SCATTERED;
    } else if (gesture === GestureType.PINCH && state.currentState === AppState.SCATTERED) {
      // Logic to pick a photo would happen in the component, but state switches here
      newState = AppState.PHOTO_ZOOM;
    }

    return { currentGesture: gesture, currentState: newState };
  }),

  setHandPosition: (x, y) => set({ handPosition: { x, y } }),
  
  setRotationOffset: (delta) => set((state) => ({ 
    rotationOffset: state.rotationOffset + delta 
  })),

  addPhoto: (url) => set((state) => ({ 
    photos: [...state.photos, { id: crypto.randomUUID(), url, aspectRatio: 1 }] 
  })),

  setActivePhoto: (index) => set({ activePhotoIndex: index }),
  
  setAppState: (state) => set({ currentState: state })
}));