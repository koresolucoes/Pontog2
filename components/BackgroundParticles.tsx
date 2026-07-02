
import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  opacity: number;
}

export const BackgroundParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth / 10, 50); // Responsive count

      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };

    const createParticle = (resetY = false): Particle => {
        const isPink = Math.random() > 0.5;
        return {
            x: Math.random() * canvas.width,
            y: resetY ? canvas.height + 10 : Math.random() * canvas.height,
            size: Math.random() * 3 + 1, // 1px to 4px
            speedX: (Math.random() - 0.5) * 0.5, // Slow drift left/right
            speedY: Math.random() * 0.5 + 0.2, // Slow drift up
            // Brand colors: Pink-600 or Purple-600
            color: isPink ? '219, 39, 119' : '147, 51, 234', 
            opacity: Math.random() * 0.3 + 0.1, // 0.1 to 0.4 opacity
        };
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();

        // Update position
        p.x += p.speedX;
        p.y -= p.speedY;

        // Fade pulsing effect
        p.opacity += (Math.random() - 0.5) * 0.01;
        if (p.opacity < 0.1) p.opacity = 0.1;
        if (p.opacity > 0.4) p.opacity = 0.4;

        // Reset if out of bounds
        if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
          particles[index] = createParticle(true);
        }
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    drawParticles();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-60"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
