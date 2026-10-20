// Accessible inline adaptation of MargaAI NodePopover; no fixed-position canvas overlay.
import React,{useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import type {RoadmapNode} from './RoadmapView';
export default function NodePopover({node,onClose}:{node:RoadmapNode;onClose:()=>void}){
  const heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;heading.current?.focus();return()=>{if(previous?.isConnected)previous.focus();};},[node.id]);
  return <section className="panel stack" aria-label="Selected topic" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onClose();}}}><p className="eyebrow">{node.status==='completed'?'Completed topic':'Your next reading'}</p><h2 ref={heading} tabIndex={-1}>{node.label}</h2><p>{node.description}</p><div className="learn-nav"><Link to={'/learn/nodes/'+node.id}>Open resources & assessments →</Link><button onClick={onClose}>Close topic preview</button></div></section>;
}
