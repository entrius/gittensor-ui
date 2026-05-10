import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  isHot: boolean;
}

interface AuroraBlob {
  /** Normalised position (0–1) */
  x: number;
  y: number;
  /** Drift velocity (normalised per frame) */
  vx: number;
  vy: number;
  /** Normalised radius */
  radius: number;
  color: string;
  opacity: number;
}

interface NetworkCanvasProps {
  particleCount?: number;
  connectionDistance?: number;
  /** Base color for lines (CSS rgba) */
  color?: string;
  /** Hot-node accent color */
  accentColor?: string;
  /** Aurora blob configs — rendered as large soft gradient lights on the canvas */
  auroraBlobs?: Array<{
    color: string;
    startX: number;
    startY: number;
    radius: number;
    opacity: number;
  }>;
  style?: React.CSSProperties;
}

/**
 * Full-bleed animated particle mesh with integrated aurora gradient lights.
 * Everything is rendered on a single canvas for cohesion.
 */
const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  particleCount = 60,
  connectionDistance = 140,
  color = 'rgba(255,255,255,0.35)',
  accentColor = 'rgba(63,185,80,0.8)',
  auroraBlobs: blobConfigs,
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const aurorasRef = useRef<AuroraBlob[]>([]);
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

    const initAuroras = () => {
      if (!blobConfigs || blobConfigs.length === 0) {
        // Default aurora blobs if none provided
        aurorasRef.current = [
          {
            x: 0.2,
            y: 0.25,
            vx: 0.00012,
            vy: -0.00008,
            radius: 0.4,
            color: 'rgba(63,185,80,1)',
            opacity: 0.25,
          },
          {
            x: 0.75,
            y: 0.7,
            vx: -0.0001,
            vy: 0.00006,
            radius: 0.35,
            color: 'rgba(88,166,255,1)',
            opacity: 0.18,
          },
        ];
      } else {
        aurorasRef.current = blobConfigs.map((cfg) => ({
          x: cfg.startX,
          y: cfg.startY,
          vx: (Math.random() - 0.5) * 0.0002,
          vy: (Math.random() - 0.5) * 0.0002,
          radius: cfg.radius,
          color: cfg.color,
          opacity: cfg.opacity,
        }));
      }
    };

    const draw = () => {
      const { w, h } = sizeRef.current;
      ctx.clearRect(0, 0, w, h);

      // ── Aurora gradient lights ──
      for (const blob of aurorasRef.current) {
        // Drift
        blob.x += blob.vx;
        blob.y += blob.vy;
        // Bounce off edges (normalised)
        if (blob.x < -0.1 || blob.x > 1.1) blob.vx *= -1;
        if (blob.y < -0.1 || blob.y > 1.1) blob.vy *= -1;

        const cx = blob.x * w;
        const cy = blob.y * h;
        const r = blob.radius * Math.max(w, h);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(
          0,
          blob.color.replace(/[\d.]+\)$/, `${blob.opacity})`),
        );
        grad.addColorStop(
          0.4,
          blob.color.replace(/[\d.]+\)$/, `${blob.opacity * 0.35})`),
        );
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }

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
              ? accentColor.replace(/[\d.]+\)$/, `${lineOpacity * 1.6})`)
              : color.replace(/[\d.]+\)$/, `${lineOpacity})`);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    initAuroras();
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
  }, [particleCount, connectionDistance, color, accentColor, blobConfigs]);

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
