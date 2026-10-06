import React, { lazy, Suspense } from 'react';
import FeatureBoundary from '../components/FeatureBoundary';
const Learn = lazy(() => import('../features/learn/pages/SessionCheck.tsx'));
export function LearnRoute() {
  return <FeatureBoundary><Suspense fallback={<section className="panel" role="status">Opening Learn...</section>}><Learn /></Suspense></FeatureBoundary>;
}

const Arcade = lazy(() => import('../features/arcade/Arcade.tsx'));
export function ArcadeRoute() { return <FeatureBoundary><Suspense fallback={<p role="status">Opening Arcade…</p>}><Arcade /></Suspense></FeatureBoundary>; }
