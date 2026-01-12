"use client";

import * as React from "react";
import { useReactFlow } from "reactflow";
import { CollectionNode } from "@/types/collections";
import { cn } from "@/lib/utils";

interface CollectionSwimLanesProps {
  collections: CollectionNode[];
}

export function CollectionSwimLanes({ collections }: CollectionSwimLanesProps) {
  const reactFlowInstance = useReactFlow();
  const [swimLanes, setSwimLanes] = React.useState<Array<{
    collectionId: string;
    collectionName: string;
    collectionIcon?: string;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    color: string;
  }>>([]);

  // Calculate swim lane bounds based on variable positions
  React.useEffect(() => {
    const lanes: typeof swimLanes = [];
    
    collections.forEach((collection, index) => {
      const variablesWithPos = collection.variables.filter(v => v.position);
      
      if (variablesWithPos.length === 0) return;
      
      const positions = variablesWithPos.map(v => v.position!);
      const minX = Math.min(...positions.map(p => p.x)) - 20;
      const maxX = Math.max(...positions.map(p => p.x)) + 300;
      const minY = Math.min(...positions.map(p => p.y)) - 20;
      const maxY = Math.max(...positions.map(p => p.y)) + 180;
      
      // Generate a color for each collection
      const colors = [
        'rgba(59, 130, 246, 0.05)', // blue
        'rgba(139, 92, 246, 0.05)', // purple
        'rgba(16, 185, 129, 0.05)', // green
        'rgba(245, 158, 11, 0.05)', // amber
        'rgba(239, 68, 68, 0.05)', // red
        'rgba(236, 72, 153, 0.05)', // pink
      ];
      
      lanes.push({
        collectionId: collection.id,
        collectionName: collection.name,
        collectionIcon: collection.icon,
        minX,
        maxX,
        minY,
        maxY,
        color: colors[index % colors.length],
      });
    });
    
    setSwimLanes(lanes);
  }, [collections]);

  if (swimLanes.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', zIndex: 0 }}
    >
      {swimLanes.map((lane) => (
        <g key={lane.collectionId}>
          {/* Background rectangle */}
          <rect
            x={lane.minX}
            y={lane.minY}
            width={lane.maxX - lane.minX}
            height={lane.maxY - lane.minY}
            fill={lane.color}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="text-border"
            rx="8"
          />
          
          {/* Collection label */}
          <foreignObject
            x={lane.minX}
            y={lane.minY - 25}
            width={lane.maxX - lane.minX}
            height="25"
          >
            <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {lane.collectionIcon && <span>{lane.collectionIcon}</span>}
              <span>{lane.collectionName}</span>
            </div>
          </foreignObject>
        </g>
      ))}
    </svg>
  );
}
