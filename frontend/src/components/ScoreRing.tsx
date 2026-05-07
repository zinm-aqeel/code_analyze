"use client";

import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 120 }: ScoreRingProps) {
  const r = 45;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#00ff9d" : score >= 60 ? "#00d4ff" : score >= 40 ? "#ffd700" : "#ff3366";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="score-ring-svg">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e35" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ 
          transition: "stroke-dashoffset 1.5s cubic-bezier(0.34,1.56,0.64,1)", 
          filter: `drop-shadow(0 0 6px ${color})` 
        }}
      />
      <text x="50" y="46" textAnchor="middle" fill={color} fontSize="20" fontWeight="700" fontFamily="JetBrains Mono">
        {score}
      </text>
      <text x="50" y="60" textAnchor="middle" fill="#8888aa" fontSize="8" fontFamily="Syne">
        /100
      </text>
    </svg>
  );
}
