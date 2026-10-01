/**
 * Dados derivados, determinísticos, a partir dos resultados do engine.
 * Nada aqui inventa valores: tudo vem dos cenários.
 */
import type { Hazard, Region, RegionId, StepResult } from './types';
import { STEP_MINUTES } from './pressure';

export const OCCURRENCE_TYPES_CHUVA = [
  'Alagamento em via pública', 'Queda de árvore', 'Acidente de trânsito', 'Dano estrutural', 'Pedido de resgate'
] as const;
export const OCCURRENCE_TYPES_CALOR = [
  'Mal-estar por calor', 'Desidratação', 'Atendimento a idoso', 'Exaustão pelo calor', 'Pedido de refúgio'
] as const;

export const BASE_HOUR = 14;

/** minutos desde 14:00 -> "14:20" */
export function clockLabel(minutes: number): string {
  const h = BASE_HOUR + Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
export const stepClock = (t: number): string => clockLabel(t * STEP_MINUTES);

export interface Occurrence {
  /** posição global (0-based) na ordem passo → região → sequência */
  seq: number;
  regionId: RegionId;
  /** posição da ocorrência dentro da região (0-based) */
  indexInRegion: number;
  type: string;
  typeIndex: number;
  /** passo em que a ocorrência entra */
  t: number;
  /** minutos desde 14:00 */
  minutes: number;
  time: string;
}

/**
 * Novas ocorrências de uma região em um passo = máx(0, ativas[t] − ativas[t−1]); em T0, igual às ativas.
 * Horário no passo t ≥ 1: 14:(10·(t−1)) + round(k × 10 ÷ (N + 1)); em T0, tudo às 14:00.
 */
export function buildOccurrences(steps: StepResult[], regions: Region[], hazard: Hazard): Occurrence[] {
  const types = hazard === 'chuva' ? OCCURRENCE_TYPES_CHUVA : OCCURRENCE_TYPES_CALOR;
  const out: Occurrence[] = [];
  const perRegion: Record<string, number> = {};
  for (const step of steps) {
    const fresh: Array<{ regionId: RegionId }> = [];
    for (const r of regions) {
      const cur = step.regions[r.id].active;
      const prev = step.t > 0 ? steps[step.t - 1].regions[r.id].active : 0;
      const n = step.t === 0 ? cur : Math.max(0, cur - prev);
      for (let i = 0; i < n; i++) fresh.push({ regionId: r.id });
    }
    const N = fresh.length;
    fresh.forEach((f, idx) => {
      const k = idx + 1;
      const minutes = step.t === 0 ? 0 : STEP_MINUTES * (step.t - 1) + Math.round((k * STEP_MINUTES) / (N + 1));
      const seq = out.length;
      const typeIndex = seq % types.length;
      const indexInRegion = perRegion[f.regionId] ?? 0;
      perRegion[f.regionId] = indexInRegion + 1;
      out.push({ seq, regionId: f.regionId, indexInRegion, type: types[typeIndex], typeIndex, t: step.t, minutes, time: clockLabel(minutes) });
    });
  }
  return out;
}

/** Ocorrências com horário até o relógio do passo t. */
export function occurrencesUntil(all: Occurrence[], t: number): Occurrence[] {
  return all.filter((o) => o.minutes <= t * STEP_MINUTES);
}

export type AlertKind = 'saturacao' | 'esgotada';
export type Priority = 'Crítica' | 'Alta';

export interface AlertInfo {
  regionId: RegionId;
  kind: AlertKind;
  /** minutos até a saturação (arredondado, ≥ 1) quando kind = saturacao */
  etaMinutes: number | null;
  priority: Priority;
  markers: string[];
}

export function alertMarkers(steps: StepResult[], regions: Region[], hazard: Hazard, regionId: RegionId, t: number): string[] {
  const cur = steps[t].regions[regionId];
  const prev = t > 0 ? steps[t - 1].regions[regionId] : null;
  const region = regions.find((r) => r.id === regionId)!;
  const m: string[] = [];
  if (prev && cur.active > prev.active) m.push('Demanda em alta');
  if (prev && cur.teamsFree < prev.teamsFree) m.push('Recursos em queda');
  if (steps[t].weather >= 40) m.push(hazard === 'chuva' ? 'Chuva intensa' : 'Calor extremo');
  if (region.vulnerability >= 0.8) m.push('Vulnerabilidade elevada');
  return m;
}

/** Alertas ativos no passo t, o mais grave primeiro (esgotada, depois menor tempo até saturação). */
export function alertsAt(steps: StepResult[], regions: Region[], hazard: Hazard, t: number): AlertInfo[] {
  const list: AlertInfo[] = [];
  for (const r of regions) {
    const p = steps[t].regions[r.id];
    if (p.etaMinutes === 'saturado') {
      list.push({ regionId: r.id, kind: 'esgotada', etaMinutes: null, priority: 'Crítica', markers: alertMarkers(steps, regions, hazard, r.id, t) });
    } else if (p.alert && typeof p.etaMinutes === 'number') {
      list.push({
        regionId: r.id, kind: 'saturacao', etaMinutes: Math.max(1, Math.round(p.etaMinutes)),
        priority: p.etaMinutes <= 5 ? 'Crítica' : 'Alta', markers: alertMarkers(steps, regions, hazard, r.id, t)
      });
    }
  }
  const sev = (a: AlertInfo) => (a.kind === 'esgotada' ? -1 : a.etaMinutes ?? 99);
  return list.sort((a, b) => sev(a) - sev(b));
}

export interface AlertEvent {
  t: number;
  regionId: RegionId;
  kind: 'alerta' | 'esgotada';
  etaMinutes: number | null;
}

/** Primeiro alerta e primeira saturação de cada região, até o passo t. */
export function alertEventsUntil(steps: StepResult[], regions: Region[], t: number): AlertEvent[] {
  const events: AlertEvent[] = [];
  const seenAlert = new Set<RegionId>();
  const seenSat = new Set<RegionId>();
  for (let s = 0; s <= t; s++) {
    for (const r of regions) {
      const p = steps[s].regions[r.id];
      if (p.alert && !seenAlert.has(r.id)) {
        seenAlert.add(r.id);
        events.push({ t: s, regionId: r.id, kind: 'alerta', etaMinutes: Math.max(1, Math.round(p.etaMinutes as number)) });
      }
      if (p.etaMinutes === 'saturado' && !seenSat.has(r.id)) {
        seenSat.add(r.id);
        events.push({ t: s, regionId: r.id, kind: 'esgotada', etaMinutes: null });
      }
    }
  }
  return events;
}

/** Antecedência (min) entre o primeiro alerta e a primeira saturação da mesma região. */
export function leadMinutes(events: AlertEvent[]): number | null {
  let best: { t: number; lead: number } | null = null;
  for (const sat of events.filter((e) => e.kind === 'esgotada')) {
    const first = events.find((e) => e.kind === 'alerta' && e.regionId === sat.regionId && e.t < sat.t);
    if (first && (best === null || sat.t < best.t)) best = { t: sat.t, lead: (sat.t - first.t) * STEP_MINUTES };
  }
  return best ? best.lead : null;
}

export type RainTrend = 'inicio' | 'aumentando' | 'estavel' | 'diminuindo';

export interface Conditions {
  weatherNow: number;
  /** mm acumulados desde 14:00 (soma de mm/h ÷ 6) — apenas chuva */
  accumulatedMm: number;
  /** máximo do índice de calor desde 14:00 — apenas calor */
  maxHeat: number;
  trend: RainTrend;
  biggestGrowth: { regionId: RegionId; delta: number } | null;
  fewestTeams: { regionId: RegionId; free: number; total: number };
}

export function conditionsAt(steps: StepResult[], regions: Region[], t: number): Conditions {
  const w = steps.slice(0, t + 1).map((s) => s.weather);
  const accumulatedMm = w.reduce((a, b) => a + b / 6, 0);
  let trend: RainTrend = 'inicio';
  if (t > 0) trend = w[t] > w[t - 1] ? 'aumentando' : w[t] < w[t - 1] ? 'diminuindo' : 'estavel';
  let biggest: Conditions['biggestGrowth'] = null;
  if (t > 0) {
    for (const r of regions) {
      const d = steps[t].regions[r.id].active - steps[t - 1].regions[r.id].active;
      if (d > 0 && (biggest === null || d > biggest.delta)) biggest = { regionId: r.id, delta: d };
    }
  }
  let fewest = { regionId: regions[0].id, free: Infinity, total: 1, ratio: Infinity };
  for (const r of regions) {
    const p = steps[t].regions[r.id];
    const ratio = p.teamsFree / p.teamsTotal;
    if (p.teamsFree < fewest.free || (p.teamsFree === fewest.free && ratio < fewest.ratio)) {
      fewest = { regionId: r.id, free: p.teamsFree, total: p.teamsTotal, ratio };
    }
  }
  return {
    weatherNow: w[t], accumulatedMm, maxHeat: Math.max(...w), trend, biggestGrowth: biggest,
    fewestTeams: { regionId: fewest.regionId, free: fewest.free, total: fewest.total }
  };
}

export interface Totals {
  active: number;
  free: number;
  teams: number;
}
export function totalsAt(steps: StepResult[], regions: Region[], t: number): Totals {
  let active = 0, free = 0, teams = 0;
  for (const r of regions) {
    const p = steps[t].regions[r.id];
    active += p.active; free += p.teamsFree; teams += p.teamsTotal;
  }
  return { active, free, teams };
}

/** Região por pressão decrescente (desempate pela ordem fixa). */
export function regionsByPressure(steps: StepResult[], regions: Region[], t: number): Region[] {
  return regions
    .map((r, i) => ({ r, i, s: steps[t].regions[r.id].rawScore }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.r);
}
