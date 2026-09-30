"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from './ForceGraph3D';
import NodePopover from './NodePopover';
import RoadmapView from './RoadmapView';
import * as THREE from 'three';

// Map node statuses to our exact Studio Light Hex Colors
const statusColors: Record<string, string> = {
  locked: '#D1D5DB',       // Gray
  unlocked: '#1E3A8A',     // Navy Blue
  'in-progress': '#EA580C',// Energetic Orange
  completed: '#16A34A',    // Success Green
  'test-out': '#CA8A04'    // Premium Gold
};

export default function SkillGraph({ learnerId, ambient = false, domain, onNodeSelect }: { learnerId?: string, ambient?: boolean, domain?: string, onNodeSelect?: (id: string | null) => void }) {
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] });
  const [isRoadmapMode, setIsRoadmapMode] = useState(false);
  const fgRef = useRef<any>(null);
  const [graphKey, setGraphKey] = useState(0);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge').strength(ambient ? -300 : -150);
      fgRef.current.d3Force('link').distance(ambient ? 80 : 40);

      // AutoCAD-style panning configuration
      if (!ambient) {
        const checkControls = setInterval(() => {
          if (fgRef.current && fgRef.current.controls) {
            const controls = fgRef.current.controls();
            if (controls) {
              // Swap left click to PAN, right click to ROTATE
              controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
              controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
              controls.screenSpacePanning = true;
              clearInterval(checkControls);
            }
          }
        }, 100);
        return () => clearInterval(checkControls);
      }
    }
  }, [ambient, graphData]);

  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleModeToggle = (roadmap: boolean) => {
    if (isRoadmapMode && !roadmap) {
      // Going from Roadmap -> Graph: force a remount to prevent d3-dag crash
      setGraphKey(prev => prev + 1);
    }
    setIsRoadmapMode(roadmap);
  };

  useEffect(() => {
    async function loadGraph() {
      const url = domain ? `/api/dashboard/graph?domain=${encodeURIComponent(domain)}` : '/api/dashboard/graph';
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.graphData) {
          setGraphData(data.graphData);
        }
      } catch (e) {
        console.error("Failed to fetch graph data", e);
      }
    }
    loadGraph();
  }, [learnerId, domain]);

  // Deep clone graphData ONLY when the graph completely remounts (graphKey changes)
  // This allows the Graph -> Roadmap transition to animate smoothly using the same object references!
  const activeGraphData = useMemo(() => {
    return {
      nodes: graphData.nodes.map(n => ({ ...n })),
      links: graphData.links.map(l => ({ ...l }))
    };
  }, [graphData, graphKey]);

  // Ambient mode: slowly rotate camera
  useEffect(() => {
    if (!ambient || !fgRef.current || graphData.nodes.length === 0) return;
    
    let angle = 0;
    const distance = 120; // Zoomed in much closer
    
    const rotateCamera = setInterval(() => {
      if (fgRef.current) {
        angle += 0.0015;
        fgRef.current.cameraPosition({
          x: distance * Math.sin(angle),
          z: distance * Math.cos(angle)
        });
      }
    }, 20);
    
    return () => clearInterval(rotateCamera);
  }, [ambient, graphData]);

  const renderNode = useCallback((node: any) => {
    const color = statusColors[node.status] || statusColors.locked;
    
    const material = new THREE.MeshStandardMaterial({ 
      color,
      transparent: true,
      opacity: ambient ? 0.7 : 1.0,
      roughness: 0.1,
      metalness: 0.8,
      emissive: color,
      emissiveIntensity: (node.status === 'test-out' || node.status === 'completed') ? 0.5 : 0.2
    });
    
    const geometry = new THREE.SphereGeometry(ambient ? 16 : 8, 32, 32); // Tripled ambient size
    const mesh = new THREE.Mesh(geometry, material);

    if (!ambient && (node.status === 'test-out' || node.status === 'completed')) {
      const glowGeo = new THREE.SphereGeometry(12, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.3 });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glowMesh);
    }

    return mesh;
  }, [ambient]);

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    if (ambient) return;
    // Toggle off if same node clicked again
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
      if (onNodeSelect) onNodeSelect(null);
      return;
    }
    setPopoverPos({ x: event.clientX, y: event.clientY });
    setSelectedNode(node);
    if (onNodeSelect) onNodeSelect(node.id);
  }, [ambient, selectedNode, onNodeSelect]);

  return (
    <>
      {!ambient && (
        <div style={{ position: 'absolute', top: 'var(--space-6)', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div className="glass-card" style={{ padding: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', borderRadius: 'var(--radius-pill)' }}>
            <button 
              onClick={() => handleModeToggle(false)}
              className={`pill ${!isRoadmapMode ? 'pill-primary' : 'pill-ghost'}`}
              style={{ padding: 'var(--space-2) var(--space-6)' }}
            >
              Graph View
            </button>
            <button 
              onClick={() => handleModeToggle(true)}
              className={`pill ${isRoadmapMode ? 'pill-primary' : 'pill-ghost'}`}
              style={{ padding: 'var(--space-2) var(--space-6)' }}
            >
              Roadmap View
            </button>
          </div>
        </div>
      )}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        {isRoadmapMode ? (
          <RoadmapView 
            graphData={activeGraphData} 
            onNodeClick={handleNodeClick} 
          />
        ) : (
          <ForceGraph3D
            key={`graph-${graphKey}`}
            ref={fgRef}
            graphData={activeGraphData}
            nodeThreeObject={renderNode}
            d3AlphaDecay={0.005}
            d3VelocityDecay={0.8}
            linkWidth={ambient ? 3 : 1.5}
            linkColor={() => ambient ? 'rgba(156, 163, 175, 0.6)' : 'rgba(209, 213, 219, 0.6)'}
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            enableNodeDrag={false}
            enableNavigationControls={!ambient}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {selectedNode && (
        <NodePopover
          node={selectedNode}
          screenX={popoverPos.x}
          screenY={popoverPos.y}
          onClose={() => {
            setSelectedNode(null);
            if (onNodeSelect) onNodeSelect(null);
          }}
        />
      )}
    </>
  );
}
