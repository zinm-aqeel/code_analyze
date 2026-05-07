"use client";

import React from 'react';

interface DimBarProps {
  score: number;
  color: string;
}

export function DimBar({ score, color }: DimBarProps) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e35" }}>
      <div
        className="h-full rounded-full bar-fill"
        style={{
          width: `${score}%`,
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animationDelay: "0.3s",
          animationFillMode: "backwards",
        }}
      />
    </div>
  );
}
