import React, { lazy, Suspense } from 'react';
import FeatureBoundary from '../components/FeatureBoundary';
const Learn = lazy(() => import('../features/learn/pages/SessionCheck.tsx'));
export function LearnRoute() {
  return <FeatureBoundary><Suspense fallback={<section className="panel" role="status">Opening Learn...</section>}><Learn /></Suspense></FeatureBoundary>;
}

const Arcade = lazy(() => import('../features/arcade/Arcade.tsx'));
export function ArcadeRoute() { return <FeatureBoundary name="Arcade"><Suspense fallback={<p role="status">Opening Arcade…</p>}><Arcade /></Suspense></FeatureBoundary>; }

const Interview = lazy(() => import('../features/interview/Interview.tsx'));
export function InterviewRoute() { return <FeatureBoundary name="Interview"><Suspense fallback={<p role="status">Opening Interview…</p>}><Interview /></Suspense></FeatureBoundary>; }
