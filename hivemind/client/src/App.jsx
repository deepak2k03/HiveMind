import React from 'react';
import { Scene } from './webgl/Scene';

export default function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0c0c14] font-sans text-slate-200">
      {/* Scroll-driven cinematic landing */}
      <Scene />
    </div>
  );
}