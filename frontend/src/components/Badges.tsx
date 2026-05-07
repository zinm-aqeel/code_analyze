"use client";

import React from 'react';

export function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: "bg-red-500/15 text-red-400 border border-red-500/30",
    medium: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    low: "bg-green-500/15 text-green-400 border border-green-500/30",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase tracking-wider ${styles[priority.toLowerCase()] || styles.low}`}>
      {priority}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "#00ff9d", B: "#00d4ff", C: "#ffd700", D: "#ff6b35", F: "#ff3366",
  };
  const c = colors[grade] || "#8888aa";
  return (
    <div className="text-5xl font-display font-bold" style={{ color: c, textShadow: `0 0 20px ${c}` }}>
      {grade}
    </div>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    Junior: { bg: "rgba(255,107,53,0.15)", text: "#ff6b35" },
    "Mid-Level": { bg: "rgba(255,215,0,0.15)", text: "#ffd700" },
    Senior: { bg: "rgba(0,212,255,0.15)", text: "#00d4ff" },
    Expert: { bg: "rgba(0,255,157,0.15)", text: "#00ff9d" },
  };
  const s = map[level] || map["Mid-Level"];
  return (
    <span className="px-3 py-1 rounded text-sm font-mono font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}40` }}>
      {level}
    </span>
  );
}
