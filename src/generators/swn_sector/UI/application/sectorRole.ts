import type { Preview } from './appState';

export function sectorRoleFromPath(pathname: string): Preview {
  return pathname.replace(/\/+$/, '').endsWith('/swn_sector/player') ? 'player' : 'gm';
}
