import React, { useEffect, useRef } from 'react';
import { alpha } from '@mui/material/styles';
import { UI_COLORS, STATUS_COLORS } from '../../theme';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  isHot: boolean;
}

interface NetworkCanvasProps {
  particleCount?: number;
  connectionDistance?: number;
  /** Base color for lines (CSS rgba) */
  color?: string;
  /** Hot-node accent color */
  accentColor?: string;
  style?: React.CSSProperties;
}

/**
 * Full-bleed animated particle mesh.
 * Everything is rendered on a single canvas for cohesion.
 */
const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  particleCount = 60,
  connectionDistance = 140,
  color = alpha(UI_COLORS.white, 0.35),
  accentColor = alpha(STATUS_COLORS.merged, 0.8),
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const initParticles = () => {
      const { w, h } = sizeRef.current;
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.4 + 0.6,
        opacity: Math.random() * 0.5 + 0.2,
        isHot: Math.random() < 0.12,
      }));
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // ── Mesh lines ──
      const particles = particlesRef.current;

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
      }

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            const lineOpacity = (1 - dist / connectionDistance) * 0.18;
            const isAccent = particles[i].isHot || particles[j].isHot;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = isAccent
              ? alpha(STATUS_COLORS.merged, lineOpacity * 1.6)
              : alpha(UI_COLORS.white, lineOpacity);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    animFrameRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [particleCount, connectionDistance, color, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
};

export default NetworkCanvas;
