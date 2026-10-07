// Accessible inline adaptation of MargaAI NodePopover; no fixed-position canvas overlay.
import React from 'react';
import {Link} from 'react-router-dom';
import type {RoadmapNode} from './RoadmapView';
export default function NodePopover({node,onClose}:{node:RoadmapNode;onClose:()=>void}){
  return <section className="panel stack" aria-label="Selected topic"><p className="eyebrow">{node.status==='completed'?'Completed topic':'Your next reading'}</p><h2>{node.label}</h2><p>{node.description}</p><div className="learn-nav"><Link to={'/learn/nodes/'+node.id}>Open resources & assessments →</Link><button onClick={onClose}>Close topic preview</button></div></section>;
}
