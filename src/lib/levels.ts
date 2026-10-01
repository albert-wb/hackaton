import type { LevelIndex } from '../engine/types';

export const LEVELS = [
  { key: 'normal', name: 'NORMAL', range: '0–25', color: 'var(--nivel-normal)', shape: 'círculo', pattern: 'sem padrão' },
  { key: 'atencao', name: 'ATENÇÃO', range: '26–50', color: 'var(--nivel-atencao)', shape: 'triângulo', pattern: 'pontos' },
  { key: 'elevado', name: 'ELEVADO', range: '51–75', color: 'var(--nivel-elevado)', shape: 'losango', pattern: 'listras diagonais' },
  { key: 'critico', name: 'CRÍTICO', range: '76–100', color: 'var(--nivel-critico)', shape: 'octógono', pattern: 'grade densa' }
] as const;

export const levelColor = (l: LevelIndex): string => LEVELS[l].color;
/** tinta do nível a 16% (ou `pct`) de opacidade */
export const levelTint = (l: LevelIndex, pct = 16): string => `color-mix(in srgb, ${LEVELS[l].color} ${pct}%, transparent)`;
/** id do <pattern> do mapa para o nível (normal não tem padrão) */
export const levelPatternId = (l: LevelIndex): string | null => (l === 0 ? null : `pat-nivel-${LEVELS[l].key}`);
