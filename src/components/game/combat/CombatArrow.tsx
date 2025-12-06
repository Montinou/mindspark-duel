'use client';

import { motion } from 'framer-motion';
import { memo, useMemo } from 'react';

interface Position {
  x: number;
  y: number;
}

interface CombatArrowProps {
  /** Starting position (blocker/defender) */
  from: Position;
  /** Ending position (attacker) */
  to: Position;
  /** Unique ID for gradient/filter references */
  id: string;
  /** Whether this is an attack arrow (red) or block arrow (blue→red) */
  variant?: 'attack' | 'block';
  /** Animation delay in seconds */
  delay?: number;
  /** Whether to show the energy pulse effect */
  showPulse?: boolean;
  /** Click handler to remove the arrow */
  onClick?: () => void;
}

/**
 * CombatArrow - Stylized curved arrow for combat connections
 *
 * Features:
 * - Quadratic Bézier curve (not straight)
 * - Gradient from blue (defender) to red (attacker)
 * - Glow filter with subtle pulse
 * - Diamond/chevron arrowhead
 * - Animated draw effect
 */
export const CombatArrow = memo(function CombatArrow({
  from,
  to,
  id,
  variant = 'block',
  delay = 0,
  showPulse = true,
  onClick,
}: CombatArrowProps) {
  // Calculate control point for the curve
  // Curve arcs upward for better visibility over the battlefield
  const controlPoint = useMemo(() => {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    // Calculate distance for curve intensity
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Arc intensity based on distance (more arc for longer arrows)
    const arcIntensity = Math.min(distance * 0.3, 80);

    // Perpendicular offset for the control point
    // Arrow curves upward (negative Y in screen coordinates)
    const perpX = -dy / distance;
    const perpY = dx / distance;

    return {
      x: midX + perpX * arcIntensity,
      y: midY - Math.abs(perpY * arcIntensity) - arcIntensity * 0.5,
    };
  }, [from, to]);

  // Calculate arrowhead rotation based on curve tangent at endpoint
  const arrowheadRotation = useMemo(() => {
    // Tangent at end of quadratic Bézier: 2 * (P2 - P1) where P1 is control, P2 is end
    const tangentX = to.x - controlPoint.x;
    const tangentY = to.y - controlPoint.y;
    return Math.atan2(tangentY, tangentX) * (180 / Math.PI);
  }, [to, controlPoint]);

  // Path for the curve
  const pathD = `M ${from.x} ${from.y} Q ${controlPoint.x} ${controlPoint.y} ${to.x} ${to.y}`;

  // Arrowhead points (diamond shape)
  const arrowSize = 12;
  const arrowPoints = [
    { x: 0, y: 0 },           // Tip
    { x: -arrowSize, y: -arrowSize / 2 },  // Top back
    { x: -arrowSize * 0.6, y: 0 },         // Center indent
    { x: -arrowSize, y: arrowSize / 2 },   // Bottom back
  ];

  const arrowPointsString = arrowPoints
    .map(p => `${p.x},${p.y}`)
    .join(' ');

  // Gradient colors
  const startColor = variant === 'attack' ? '#ef4444' : '#3b82f6';
  const endColor = '#ef4444';

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Gradient from defender (blue) to attacker (red) */}
        <linearGradient
          id={`arrow-gradient-${id}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={startColor} stopOpacity="0.9" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
          <stop offset="100%" stopColor={endColor} stopOpacity="1" />
        </linearGradient>

        {/* Glow filter */}
        <filter id={`arrow-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 0.5 0 0 0  0 0 1 0 0  0 0 0 1 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Pulse glow for energy effect */}
        <filter id={`arrow-pulse-${id}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0.2  0 0.3 0 0 0.1  0 0 1 0 0.3  0 0 0 0.8 0"
          />
        </filter>
      </defs>

      {/* Background glow layer (thicker, blurred) */}
      <motion.path
        d={pathD}
        stroke={`url(#arrow-gradient-${id})`}
        strokeWidth="10"
        fill="none"
        filter={`url(#arrow-pulse-${id})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: showPulse ? [0.3, 0.6, 0.3] : 0.4,
        }}
        transition={{
          pathLength: { duration: 0.5, delay, ease: 'easeOut' },
          opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* Main arrow path */}
      <motion.path
        d={pathD}
        stroke={`url(#arrow-gradient-${id})`}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter={`url(#arrow-glow-${id})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay, ease: 'easeOut' }}
        className={onClick ? 'cursor-pointer pointer-events-auto' : ''}
        onClick={onClick}
      />

      {/* Energy particles along the path */}
      {showPulse && (
        <>
          <motion.circle
            r="3"
            fill="#fff"
            filter={`url(#arrow-glow-${id})`}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 0],
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 1.5,
              delay: delay + 0.3,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ offsetPath: `path('${pathD}')` }}
          />
          <motion.circle
            r="2"
            fill="#8b5cf6"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.8, 0],
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 1.5,
              delay: delay + 0.8,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{ offsetPath: `path('${pathD}')` }}
          />
        </>
      )}

      {/* Arrowhead (diamond/chevron shape) */}
      <motion.g
        transform={`translate(${to.x}, ${to.y}) rotate(${arrowheadRotation})`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.4 }}
      >
        <polygon
          points={arrowPointsString}
          fill={endColor}
          filter={`url(#arrow-glow-${id})`}
        />
        {/* Inner highlight for 3D effect */}
        <polygon
          points="-4,0 -8,-2 -6,0 -8,2"
          fill="#fff"
          opacity="0.4"
        />
      </motion.g>

      {/* Starting point indicator (small circle) */}
      <motion.circle
        cx={from.x}
        cy={from.y}
        r="5"
        fill={startColor}
        filter={`url(#arrow-glow-${id})`}
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{
          scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
    </svg>
  );
});

export default CombatArrow;
