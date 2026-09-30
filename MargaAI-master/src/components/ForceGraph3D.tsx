"use client";

import dynamic from 'next/dynamic';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { 
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
      <span className="status-badge test-out">Loading Engine...</span>
    </div>
  )
});

export default ForceGraph3D;
