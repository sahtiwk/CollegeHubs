import registry from '@collegehubs/contracts/learn-curricula.json';
export const domainLabel=(domain:string)=>registry.domains.find(d=>d.id===domain)?.label||domain;
