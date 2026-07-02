
import React from 'react';
import { BackgroundParticles } from './BackgroundParticles';

interface AnimatedBackgroundProps {
    className?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className = '' }) => (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none select-none ${className}`}>
        {/* Base Escura */}
        <div className="absolute inset-0 bg-dark-900"></div>
        
        {/* Formas Animadas (Blobs) */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-secondary-900/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-900/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-fuchsia-900/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-blob" style={{ animationDelay: '4s' }}></div>
        
        {/* Textura Sutil */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        
        {/* Partículas */}
        <BackgroundParticles />
    </div>
);
