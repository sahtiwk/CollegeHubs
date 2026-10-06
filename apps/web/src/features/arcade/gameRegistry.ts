import { lazy } from 'react';
import manifest from '@collegehubs/contracts/arcade-games.json';
export type GameDefinition = {id:string;title:string;status:'ranked'|'casual'|'unavailable';description:string;rulesVersion?:string;durationSeconds?:number;path:string};
const components = {
  numberguess: lazy(() => import('./games/NumberGuess')),
  mathamplitude: lazy(() => import('./games/MathAmplitude')),
  sorting: lazy(() => import('./games/SortingComplexity')),
};
// The same pure manifest is consumed by Arcade's create/descriptor boundary.
export const gameRegistry = (manifest as Omit<GameDefinition,'path'>[]).map(game => ({...game,path:'/arcade/'+game.id}));
export const gameRoute = (id:string) => gameRegistry.find(game => game.id===id);
export const gameComponent = (id:string) => components[id as keyof typeof components];
