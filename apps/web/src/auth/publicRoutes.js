export function isPublicRoute(path) {
  return !/^\/(dashboard|progress|login|register|verify-email|leaderboard|contests|channels|study-rooms|learn|interview|arcade)(\/|$)/.test(path);
}
