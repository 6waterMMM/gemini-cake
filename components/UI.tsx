import React, { useRef } from 'react';
import { useStore } from '../store';
import { AppState, GestureType } from '../types';

export const UI: React.FC = () => {
  const { currentState, currentGesture, addPhoto, photos } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      addPhoto(url);
    }
  };

  const getStatusText = () => {
    switch (currentState) {
      case AppState.ASSEMBLED: return "Happy Birthday!";
      case AppState.SCATTERED: return "Make a wish...";
      case AppState.PHOTO_ZOOM: return "Memory Lane";
      default: return "";
    }
  };

  const getGestureHint = () => {
      switch(currentGesture) {
          case GestureType.FIST: return "✊ Fist detected: Assembling";
          case GestureType.OPEN_PALM: return "✋ Open Palm: Scattering";
          case GestureType.PINCH: return "👌 Pinch: Zooming";
          case GestureType.POINTING: return "☝️ Tracking Hand";
          default: return "Position hand in camera...";
      }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-4xl font-serif text-[#FFFFF0] tracking-widest drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            CELEBRATION
            </h1>
            <p className="text-gold opacity-80 mt-2 font-light tracking-wide text-sm">
                INTERACTIVE 3D EXPERIENCE
            </p>
        </div>

        {/* Status Badge - Modified: Removed border/bg, changed font */}
        <div className="px-6 py-2">
             <span className="text-[#D4AF37] font-medium animate-pulse text-4xl" style={{ fontFamily: "'Great Vibes', cursive" }}>
                {getStatusText()}
             </span>
        </div>
      </div>

      {/* Center Interactions */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto space-y-4">
        <div className="bg-black/50 backdrop-blur-sm p-4 rounded-lg border-l-2 border-matte-green text-xs text-ivory max-w-[200px]">
            <h3 className="text-gold font-bold mb-2 uppercase">Gestures</h3>
            <ul className="space-y-2">
                <li className="flex items-center"><span className="mr-2">✊</span> <b>Fist:</b> Assemble Cake</li>
                <li className="flex items-center"><span className="mr-2">✋</span> <b>Palm:</b> Scatter Particles</li>
                <li className="flex items-center"><span className="mr-2">👋</span> <b>Move:</b> Rotate View</li>
                <li className="flex items-center"><span className="mr-2">👌</span> <b>Pinch:</b> Zoom Photo</li>
            </ul>
        </div>

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#B22222] hover:bg-[#8B0000] text-white px-4 py-2 rounded shadow-[0_0_15px_rgba(178,34,34,0.6)] transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
        >
            <span>+ Add Photo</span>
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
        />
        
        {photos.length > 0 && (
            <div className="text-xs text-gray-400 mt-2 pl-1">
                {photos.length} memories loaded
            </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full text-center">
         <p className="text-xs text-[#556B2F] font-mono">
             {getGestureHint()}
         </p>
      </div>
    </div>
  );
};