import React, { useEffect, useRef } from 'react';

interface Particle3D {
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  speedZ: number;
  angle: number;
}

interface StrobeLight {
  angle: number;
  speed: number;
  color: string;
  width: number;
}

export const PartyAtmosphere3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle3D[] = [];
    const focalLength = 300; // 3D projection focal length
    let beatTimer = 0;
    let isBeat = false;
    let rotationAngle = 0;

    // Laser lines/strobe setups
    const strobes: StrobeLight[] = [
      { angle: 0, speed: 0.005, color: 'rgba(236, 72, 153, 0.25)', width: 0.25 },  // Pink
      { angle: Math.PI / 3, speed: -0.007, color: 'rgba(168, 85, 247, 0.25)', width: 0.3 }, // Purple
      { angle: Math.PI * (2/3), speed: 0.004, color: 'rgba(59, 130, 246, 0.25)', width: 0.2 }, // Blue
      { angle: Math.PI, speed: -0.006, color: 'rgba(6, 182, 212, 0.25)', width: 0.15 } // Cyan
    ];

    // Equalizer bars representation
    const equalizerBarsCount = 45;
    const equalizerHeights = new Array(equalizerBarsCount).fill(10);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(window.innerWidth / 8, 80);
      const colors = [
        '236, 72, 153',  // Pink-500
        '168, 85, 247',  // Purple-500
        '99, 102, 241',  // Indigo-500
        '6, 182, 212',   // Cyan-500
        '234, 179, 8'    // Gold-500
      ];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: (Math.random() - 0.5) * canvas.width * 1.5,
          y: (Math.random() - 0.5) * canvas.height * 1.5,
          z: Math.random() * 800 + 100, // Z depth
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 1.5,
          speedZ: Math.random() * 1.5 + 0.5,
          angle: Math.random() * Math.PI * 2
        });
      }
    };

    const drawAtmosphere = () => {
      // Clear with dark purple gradient wash for party vibe
      ctx.fillStyle = 'rgba(8, 10, 18, 0.15)'; // Trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // 1. Beats & Pulsing Core Glow
      beatTimer += 0.08;
      isBeat = Math.sin(beatTimer) > 0.85; // Periodic virtual music beat

      const coreGlowSize = isBeat ? 150 : 80;
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, coreGlowSize);
      coreGradient.addColorStop(0, 'rgba(236, 72, 153, 0.12)');
      coreGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.05)');
      coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreGlowSize, 0, Math.PI * 2);
      ctx.fill();

      // 2. Neon Laser/Strobe Light Sweeps
      strobes.forEach(strobe => {
        strobe.angle += strobe.speed;
        
        // Add cursor interaction to strobe deflection
        const cursorAngleOffset = mouseRef.current.active 
          ? Math.atan2(mouseRef.current.y - centerY, mouseRef.current.x - centerX) * 0.15 
          : 0;

        const sweepAngle = strobe.angle + cursorAngleOffset;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        const endX1 = centerX + Math.cos(sweepAngle - strobe.width) * canvas.width * 1.2;
        const endY1 = centerY + Math.sin(sweepAngle - strobe.width) * canvas.height * 1.2;
        const endX2 = centerX + Math.cos(sweepAngle + strobe.width) * canvas.width * 1.2;
        const endY2 = centerY + Math.sin(sweepAngle + strobe.width) * canvas.height * 1.2;

        ctx.lineTo(endX1, endY1);
        ctx.lineTo(endX2, endY2);
        ctx.closePath();

        // Laser gradient
        const laserGrad = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, canvas.width * 0.8);
        laserGrad.addColorStop(0, strobe.color);
        laserGrad.addColorStop(0.6, strobe.color.replace('0.25', '0.06'));
        laserGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = laserGrad;
        ctx.fill();
      });

      // 3. Strobe Flash Effect on Beat
      if (isBeat && Math.random() > 0.8) {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 4. 3D Projecting Particle Cloud (Orbiting space field)
      rotationAngle += 0.002;
      const cosRot = Math.cos(rotationAngle * 0.5);
      const sinRot = Math.sin(rotationAngle * 0.5);

      particles.forEach((p, index) => {
        // Orbit math in 3D
        p.angle += 0.003;
        let x3d = p.x * Math.cos(0.002) - p.z * Math.sin(0.002);
        let z3d = p.x * Math.sin(0.002) + p.z * Math.cos(0.002);
        let y3d = p.y;

        // Apply slow drift
        z3d -= p.speedZ;
        if (z3d < 10) {
          z3d = 800; // Reset depth
          x3d = (Math.random() - 0.5) * canvas.width * 1.5;
          y3d = (Math.random() - 0.5) * canvas.height * 1.5;
        }
        p.x = x3d;
        p.z = z3d;
        p.y = y3d;

        // 3D Perspective Projection
        const scale = focalLength / (focalLength + z3d);
        const projX = centerX + x3d * scale;
        const projY = centerY + y3d * scale;
        const radius = p.size * scale * (isBeat ? 1.4 : 1.0);

        // Draw particle if inside viewport boundaries
        if (projX >= 0 && projX <= canvas.width && projY >= 0 && projY <= canvas.height) {
          ctx.beginPath();
          ctx.arc(projX, projY, radius, 0, Math.PI * 2);
          
          // Glow effect based on proximity/Z
          const opacity = Math.min((1 - z3d / 900) * 0.7, 1);
          ctx.fillStyle = `rgba(${p.color}, ${opacity})`;
          ctx.fill();

          // Add subtle outer halos to high depth particles
          if (scale > 0.6) {
            ctx.beginPath();
            ctx.arc(projX, projY, radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, ${opacity * 0.2})`;
            ctx.fill();
          }
        }
      });

      // 5. Sound Wave / Equalizer Visualization (at the bottom)
      const barWidth = canvas.width / equalizerBarsCount;
      for (let i = 0; i < equalizerBarsCount; i++) {
        // Target dynamic height
        const targetHeight = (isBeat ? Math.random() * 110 + 30 : Math.random() * 40 + 10) 
          * (1 - Math.abs(i - equalizerBarsCount / 2) / (equalizerBarsCount / 1.5)); // Dome shape

        // Interpolate height for fluid animations
        equalizerHeights[i] += (targetHeight - equalizerHeights[i]) * 0.2;

        const h = equalizerHeights[i];
        const x = i * barWidth;
        const y = canvas.height - h;

        const grad = ctx.createLinearGradient(x, canvas.height, x, y);
        grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)'); // Purple-500
        grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.6)'); // Pink-500
        grad.addColorStop(1, 'rgba(59, 130, 246, 0.8)'); // Blue-500

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth - 2, h);

        // Mirror small top visualizer dots
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, y - 5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
      }

      // 6. Interactive Cursor Spotlight Highlight
      if (mouseRef.current.active) {
        // Linear interpolation for mouse movement inertia
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

        const spotGradient = ctx.createRadialGradient(
          mouseRef.current.x, mouseRef.current.y, 10,
          mouseRef.current.x, mouseRef.current.y, 180
        );
        spotGradient.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
        spotGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
        spotGradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = spotGradient;
        ctx.beginPath();
        ctx.arc(mouseRef.current.x, mouseRef.current.y, 180, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(drawAtmosphere);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
      mouseRef.current.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouseRef.current.targetX = e.touches[0].clientX;
        mouseRef.current.targetY = e.touches[0].clientY;
        mouseRef.current.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    resizeCanvas();
    drawAtmosphere();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-80"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
