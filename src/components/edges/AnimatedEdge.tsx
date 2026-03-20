"use client";

import React from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export default function AnimatedEdge({
  id: _id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "#8b5cf6",
          strokeWidth: 3,
          filter: "blur(4px)",
          opacity: 0.4,
        }}
      />
      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: "#8b5cf6",
          strokeWidth: 2,
        }}
      />
      {/* Animated particle along the path */}
      <circle r="3" fill="#a78bfa" filter="url(#glow)">
        <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </>
  );
}
