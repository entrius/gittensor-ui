import React from 'react';
import { Box, alpha } from '@mui/material';
import { UI_COLORS } from '../../theme';
import {
  GLOW_WAVE_DELAYS,
  HERO_GEOMETRY,
  HERO_SPARKS,
  HERO_TIMINGS,
  HERO_VIEWBOX,
  PRIMARY_RGB,
  RIPPLE_RADII,
  WHITE_RGB,
} from './heroConstants';

const {
  centerX,
  centerY,
  sphereRadius,
  diskWidth,
  haloOuter,
  haloInner,
  arcLine,
  topArch,
} = HERO_GEOMETRY;

const topArchPath = `M ${centerX - topArch.rx} ${centerY} A ${topArch.rx} ${topArch.ry} 0 0 1 ${centerX + topArch.rx} ${centerY}`;

const HeroPortal: React.FC = () => {
  const haloOrigin = `${centerX}px ${centerY}px`;

  return (
    <Box
      role="img"
      aria-label="Gittensor portal"
      sx={(theme) => ({
        position: 'relative',
        width: '100%',
        aspectRatio: `${HERO_VIEWBOX.width} / ${HERO_VIEWBOX.height}`,
        cursor: 'default',
        userSelect: 'none',
        '&:hover .hero-halo-group': {
          animationDuration: `${HERO_TIMINGS.haloBreathe.hover}s`,
        },
        '&:hover .hero-disk-group': {
          animationDuration: `${HERO_TIMINGS.diskPulse.hover}s`,
        },
        '&:hover .hero-ripple': {
          animationDuration: `${HERO_TIMINGS.rippleShimmerBase.hover}s`,
        },
        '&:hover .hero-spark': {
          animationDuration: `${HERO_TIMINGS.sparkTwinkle.hover}s`,
        },
        '&:hover .hero-glow-wave': {
          animationDuration: `${HERO_TIMINGS.glowWave.hover}s`,
        },
        '&:hover .hero-arch-thick': {
          animationDuration: `${HERO_TIMINGS.archGlow.hover}s`,
        },
        '&:hover .hero-arch-travel': {
          animationDuration: `${HERO_TIMINGS.archTravel.hover}s`,
        },
        '&:hover .hero-mark': {
          transform: 'scale(1.08)',
          filter: [
            'brightness(0) invert(1)',
            `drop-shadow(0 1px 1px ${alpha(theme.palette.common.black, 0.4)})`,
            `drop-shadow(0 0 18px ${alpha(theme.palette.common.white, 0.85)})`,
            `drop-shadow(0 0 36px ${alpha(theme.palette.primary.main, 0.55)})`,
          ].join(' '),
        },
      })}
    >
      <Box
        component="svg"
        viewBox={`0 0 ${HERO_VIEWBOX.width} ${HERO_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid meet"
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          '& .hero-ripple': {
            animation: `rippleShimmer ${HERO_TIMINGS.rippleShimmerBase.idle}s ease-in-out infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-spark': {
            animation: `sparkTwinkle ${HERO_TIMINGS.sparkTwinkle.idle}s ease-in-out infinite`,
            transformOrigin: 'center',
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-halo-group': {
            transformOrigin: haloOrigin,
            animation: `haloBreathe ${HERO_TIMINGS.haloBreathe.idle}s ease-in-out infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-disk-group': {
            animation: `diskPulse ${HERO_TIMINGS.diskPulse.idle}s ease-in-out infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-glow-wave': {
            transformOrigin: haloOrigin,
            animation: `glowWave ${HERO_TIMINGS.glowWave.idle}s ease-out infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-arch-thick': {
            animation: `archGlow ${HERO_TIMINGS.archGlow.idle}s ease-in-out infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& .hero-arch-travel': {
            animation: `archTravel ${HERO_TIMINGS.archTravel.idle}s linear infinite`,
            transition: 'animation-duration 400ms ease',
          },
          '& [data-stop="white"]': { stopColor: theme.palette.common.white },
          '& [data-stop="primary"]': { stopColor: theme.palette.primary.main },
          '& [data-stop="black"]': { stopColor: theme.palette.common.black },
        })}
      >
        <defs>
          <radialGradient
            id="hero-halo-core"
            cx="50%"
            cy="100%"
            r="58%"
            fx="50%"
            fy="100%"
          >
            <stop offset="0%" data-stop="white" stopOpacity="1" />
            <stop offset="6%" data-stop="white" stopOpacity="0.92" />
            <stop offset="14%" data-stop="white" stopOpacity="0.55" />
            <stop offset="26%" data-stop="primary" stopOpacity="0.85" />
            <stop offset="48%" data-stop="primary" stopOpacity="0.42" />
            <stop offset="72%" data-stop="primary" stopOpacity="0.14" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </radialGradient>

          <radialGradient
            id="hero-halo-spread"
            cx="50%"
            cy="100%"
            r="70%"
            fx="50%"
            fy="100%"
          >
            <stop offset="0%" data-stop="primary" stopOpacity="0.4" />
            <stop offset="40%" data-stop="primary" stopOpacity="0.18" />
            <stop offset="80%" data-stop="primary" stopOpacity="0.04" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="hero-disk" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" data-stop="primary" stopOpacity="0" />
            <stop offset="10%" data-stop="primary" stopOpacity="0.45" />
            <stop offset="34%" data-stop="primary" stopOpacity="0.95" />
            <stop offset="50%" data-stop="white" stopOpacity="1" />
            <stop offset="66%" data-stop="primary" stopOpacity="0.95" />
            <stop offset="90%" data-stop="primary" stopOpacity="0.45" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="hero-sphere" cx="50%" cy="46%" r="55%">
            <stop offset="0%" data-stop="black" stopOpacity="1" />
            <stop offset="80%" data-stop="black" stopOpacity="0.96" />
            <stop offset="100%" data-stop="primary" stopOpacity="0.4" />
          </radialGradient>

          <linearGradient id="hero-rim" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" data-stop="white" stopOpacity="1" />
            <stop offset="35%" data-stop="primary" stopOpacity="0.7" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="hero-arc-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" data-stop="primary" stopOpacity="0" />
            <stop offset="35%" data-stop="primary" stopOpacity="0.6" />
            <stop offset="50%" data-stop="white" stopOpacity="0.95" />
            <stop offset="65%" data-stop="primary" stopOpacity="0.6" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </linearGradient>

          <linearGradient
            id="hero-arch-thick"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" data-stop="primary" stopOpacity="0" />
            <stop offset="20%" data-stop="primary" stopOpacity="0.85" />
            <stop offset="50%" data-stop="white" stopOpacity="1" />
            <stop offset="80%" data-stop="primary" stopOpacity="0.85" />
            <stop offset="100%" data-stop="primary" stopOpacity="0" />
          </linearGradient>

          <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter
            id="hero-glow-soft"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter
            id="hero-glow-strong"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="28" />
          </filter>

          <clipPath id="hero-top-clip">
            <rect x="0" y="0" width={HERO_VIEWBOX.width} height={centerY} />
          </clipPath>
        </defs>

        <g>
          {RIPPLE_RADII.map((radius, i) => (
            <circle
              key={radius}
              className="hero-ripple"
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke={UI_COLORS.primary}
              strokeWidth={1}
              strokeOpacity={0.18 - i * 0.012}
              style={{
                animationDelay: `${i * 0.35}s`,
                animationDuration: `${HERO_TIMINGS.rippleShimmerBase.idle + i * 0.4}s`,
                opacity: 0.5 - i * 0.035,
              }}
            />
          ))}
        </g>

        <g clipPath="url(#hero-top-clip)">
          {GLOW_WAVE_DELAYS.map((delay, i) => (
            <ellipse
              key={i}
              className="hero-glow-wave"
              cx={centerX}
              cy={centerY}
              rx={sphereRadius + 30}
              ry={sphereRadius - 8}
              fill="none"
              stroke={UI_COLORS.primary}
              strokeWidth={1.4}
              strokeOpacity={0.7}
              style={{
                animationDelay: `${delay}s`,
                filter: `drop-shadow(0 0 8px rgba(${PRIMARY_RGB}, 0.85))`,
              }}
            />
          ))}
        </g>

        <g>
          {HERO_SPARKS.map((spark, i) => (
            <circle
              key={i}
              className="hero-spark"
              cx={spark.x}
              cy={spark.y}
              r={spark.r}
              fill={UI_COLORS.white}
              style={{
                animationDelay: `${spark.delaySec}s`,
                animationDuration: `${spark.durationSec}s`,
                filter: [
                  `drop-shadow(0 0 ${spark.r * 3}px rgba(${WHITE_RGB}, 0.9))`,
                  `drop-shadow(0 0 ${spark.r * 6}px rgba(${PRIMARY_RGB}, 0.45))`,
                ].join(' '),
              }}
            />
          ))}
        </g>

        <g
          className="hero-halo-group"
          clipPath="url(#hero-top-clip)"
          filter="url(#hero-glow-strong)"
        >
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={haloOuter.rx}
            ry={haloOuter.ry}
            fill="url(#hero-halo-spread)"
          />
        </g>

        <g
          className="hero-halo-group"
          clipPath="url(#hero-top-clip)"
          filter="url(#hero-glow)"
        >
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={haloInner.rx}
            ry={haloInner.ry}
            fill="url(#hero-halo-core)"
          />
        </g>

        <g className="hero-disk-group" filter="url(#hero-glow-soft)">
          <rect
            x={centerX - diskWidth / 2}
            y={centerY - 5}
            width={diskWidth}
            height={10}
            rx={5}
            fill="url(#hero-disk)"
          />
          <rect
            x={centerX - diskWidth / 2 + 80}
            y={centerY - 1.5}
            width={diskWidth - 160}
            height={3}
            rx={1.5}
            fill="url(#hero-disk)"
            opacity={0.95}
          />
        </g>

        <circle
          cx={centerX}
          cy={centerY}
          r={sphereRadius}
          fill="url(#hero-sphere)"
          stroke={alpha(UI_COLORS.white, 0.18)}
          strokeWidth={1}
        />

        <g clipPath="url(#hero-top-clip)" opacity={0.95}>
          <circle
            cx={centerX}
            cy={centerY}
            r={sphereRadius}
            fill="none"
            stroke="url(#hero-rim)"
            strokeWidth={2.6}
          />
        </g>

        <g clipPath="url(#hero-top-clip)" opacity={0.55}>
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={arcLine.rx}
            ry={arcLine.ry}
            fill="none"
            stroke="url(#hero-arc-line)"
            strokeWidth={1.2}
          />
        </g>

        <g clipPath="url(#hero-top-clip)">
          <path
            className="hero-arch-thick"
            d={topArchPath}
            fill="none"
            stroke="url(#hero-arch-thick)"
            strokeWidth={14}
            strokeLinecap="round"
            opacity={0.55}
            style={{ filter: 'blur(8px)' }}
          />
          <path
            className="hero-arch-thick"
            d={topArchPath}
            fill="none"
            stroke="url(#hero-arch-thick)"
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            className="hero-arch-travel"
            d={topArchPath}
            fill="none"
            stroke={UI_COLORS.white}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="60 1140"
            opacity={0.95}
            style={{
              filter: `drop-shadow(0 0 6px rgba(${WHITE_RGB}, 0.95))`,
            }}
          />
        </g>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          top: `${(centerY / HERO_VIEWBOX.height) * 100}%`,
          width: { xs: 90, sm: 120, md: 140 },
          height: { xs: 90, sm: 120, md: 140 },
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Box
          className="hero-mark"
          component="img"
          src="/gt-logo.svg"
          alt=""
          sx={(theme) => ({
            width: '88%',
            height: '88%',
            objectFit: 'contain',
            filter: [
              'brightness(0) invert(1)',
              `drop-shadow(0 1px 1px ${alpha(theme.palette.common.black, 0.4)})`,
              `drop-shadow(0 0 14px ${alpha(theme.palette.common.white, 0.55)})`,
            ].join(' '),
            transition:
              'transform 600ms cubic-bezier(0.22, 1, 0.36, 1), filter 600ms ease',
            transformOrigin: 'center',
          })}
        />
      </Box>
    </Box>
  );
};

export default HeroPortal;
