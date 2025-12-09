import React from 'react';
import { Scene } from './components/Scene';
import VisionController from './components/VisionController';
import { UI } from './components/UI';

const App: React.FC = () => {
  return (
    <div className="relative w-full h-full bg-[#050505]">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>

      {/* Logic Layer (Invisible/Minimized) */}
      <VisionController />

      {/* UI Overlay Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <UI />
      </div>
    </div>
  );
};

export default App;