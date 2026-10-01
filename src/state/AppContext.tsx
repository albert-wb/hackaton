import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SimulationDataProvider } from '../data/provider';
import { REGIONS } from '../data/regions';
import {
  alertEventsUntil, alertsAt, buildOccurrences, conditionsAt, leadMinutes, occurrencesUntil, regionsByPressure, totalsAt,
  type AlertEvent, type AlertInfo, type Conditions, type Occurrence, type Totals
} from '../engine/derived';
import { computeSteps, STEP_COUNT } from '../engine/pressure';
import type { Hazard, Region, RegionId, Snapshot, StepResult } from '../engine/types';
import { DEFAULT_URL, readUrl, toSearch, type MapTab } from './urlState';

export type Fullscreen = null | 'mapa' | 'evolucao';
export type Panel = null | 'ocorrencias' | 'recursos' | 'como';
export type EvoMetric = 'pressao' | 'ocorrencias' | 'equipes';
export type LayerKey = 'zonas' | 'vias' | 'corregos' | 'ocorrencias' | 'equipes' | 'infra' | 'refugios';
export type NavKey = 'visao' | 'mapa' | 'evolucao' | 'regioes' | 'ocorrencias' | 'recursos' | 'relatorios' | 'config';
export type CardKey = 'regioes' | 'alerta';

export interface Model {
  snap: Snapshot;
  steps: StepResult[];
  regions: Region[];
  cur: StepResult;
  occAll: Occurrence[];
  occNow: Occurrence[];
  totals: Totals;
  totalsPrev: Totals | null;
  conditions: Conditions;
  alerts: AlertInfo[];
  events: AlertEvent[];
  lead: number | null;
  sorted: Region[];
}

interface Ctx {
  step: number;
  playing: boolean;
  speed: 1 | 2 | 4;
  intensity: number;
  regionId: RegionId;
  hazard: Hazard;
  mapTab: MapTab;
  fullscreen: Fullscreen;
  panel: Panel;
  evoMetric: EvoMetric;
  nav: NavKey;
  loading: boolean;
  layers: Record<LayerKey, boolean>;
  model: Model;
  providerLabel: string;
  setStep: (n: number) => void;
  togglePlay: () => void;
  setSpeed: (s: 1 | 2 | 4) => void;
  restart: () => void;
  setIntensity: (v: number) => void;
  selectRegion: (id: RegionId) => void;
  setHazard: (h: Hazard) => void;
  setMapTab: (t: MapTab) => void;
  setFullscreen: (f: Fullscreen) => void;
  setPanel: (p: Panel) => void;
  setEvoMetric: (m: EvoMetric) => void;
  toggleLayer: (k: LayerKey) => void;
  navigate: (k: NavKey) => void;
  registerCard: (k: CardKey, el: HTMLElement | null) => void;
  focusCard: (k: CardKey) => void;
}

const AppCtx = createContext<Ctx | null>(null);
const provider = new SimulationDataProvider();

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const init = useMemo(() => readUrl(window.location.search), []);
  const [step, setStepState] = useState(init.passo);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<1 | 2 | 4>(1);
  const [intensity, setIntensityState] = useState(init.intensidade);
  const [regionId, setRegionId] = useState<RegionId>(init.regiao);
  const [hazard, setHazardState] = useState<Hazard>(init.aba);
  const [mapTab, setMapTabState] = useState<MapTab>(init.mapa);
  const [fullscreen, setFullscreen] = useState<Fullscreen>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [evoMetric, setEvoMetric] = useState<EvoMetric>('pressao');
  const [nav, setNav] = useState<NavKey>('visao');
  const [loading, setLoading] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    zonas: true, vias: true, corregos: true, ocorrencias: false, equipes: false, infra: true, refugios: init.aba === 'calor'
  });
  const cards = useRef<Partial<Record<CardKey, HTMLElement | null>>>({});
  const loadTimer = useRef(0);

  /* ---------- modelo (engine + derivados) ---------- */
  const snap = useMemo(() => provider.getSnapshot(hazard, intensity), [hazard, intensity]);
  const steps = useMemo(() => computeSteps(snap), [snap]);
  const occAll = useMemo(() => buildOccurrences(steps, REGIONS, hazard), [steps, hazard]);
  const model = useMemo<Model>(() => ({
    snap, steps, regions: REGIONS, cur: steps[step], occAll,
    occNow: occurrencesUntil(occAll, step),
    totals: totalsAt(steps, REGIONS, step),
    totalsPrev: step > 0 ? totalsAt(steps, REGIONS, step - 1) : null,
    conditions: conditionsAt(steps, REGIONS, step),
    alerts: alertsAt(steps, REGIONS, hazard, step),
    events: alertEventsUntil(steps, REGIONS, step),
    lead: leadMinutes(alertEventsUntil(steps, REGIONS, step)),
    sorted: regionsByPressure(steps, REGIONS, step)
  }), [snap, steps, occAll, step, hazard]);

  /* ---------- URL ---------- */
  useEffect(() => {
    const next = toSearch({ passo: step, intensidade: intensity, regiao: regionId, aba: hazard, mapa: mapTab });
    if (next !== window.location.search) window.history.replaceState(null, '', `${window.location.pathname}${next}${window.location.hash}`);
  }, [step, intensity, regionId, hazard, mapTab]);

  /* ---------- reprodução: um passo a cada 4 s (1x), 2 s (2x) ou 1 s (4x); para em T4 ---------- */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStepState((s) => {
        if (s >= STEP_COUNT - 1) return s;
        return s + 1;
      });
    }, 4000 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed]);
  useEffect(() => { if (playing && step >= STEP_COUNT - 1) setPlaying(false); }, [playing, step]);
  useEffect(() => () => window.clearTimeout(loadTimer.current), []);

  /* ---------- ações ---------- */
  const setStep = useCallback((n: number) => setStepState(Math.min(STEP_COUNT - 1, Math.max(0, n))), []);
  const togglePlay = useCallback(() => {
    if (playing) { setPlaying(false); return; }
    if (step >= STEP_COUNT - 1) setStepState(0);
    setPlaying(true);
  }, [playing, step]);
  const restart = useCallback(() => { setPlaying(false); setStepState(0); }, []);
  const setHazard = useCallback((h: Hazard) => {
    if (h === hazard) return;
    setPlaying(false); setStepState(0); setHazardState(h);
    setLayers((l) => ({ ...l, refugios: h === 'calor' }));
    setLoading(true);
    window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 300);
  }, [hazard]);
  const registerCard = useCallback((k: CardKey, el: HTMLElement | null) => { cards.current[k] = el; }, []);
  const focusCard = useCallback((k: CardKey) => {
    setFullscreen(null); setPanel(null); setNav('visao');
    window.setTimeout(() => {
      const el = cards.current[k];
      if (!el) return;
      el.focus();
      el.classList.remove('card-flash');
      void el.offsetWidth;
      el.classList.add('card-flash');
    }, 30);
  }, []);
  const navigate = useCallback((k: NavKey) => {
    if (k === 'relatorios' || k === 'config') return;
    setNav(k);
    setPanel(null); setFullscreen(null);
    if (k === 'mapa') setFullscreen('mapa');
    else if (k === 'evolucao') setFullscreen('evolucao');
    else if (k === 'ocorrencias') setPanel('ocorrencias');
    else if (k === 'recursos') setPanel('recursos');
    else if (k === 'regioes') focusCard('regioes');
  }, [focusCard]);
  const closePanel = useCallback((p: Panel) => { setPanel(p); if (p === null) setNav((n) => (n === 'ocorrencias' || n === 'recursos' ? 'visao' : n)); }, []);
  const closeFullscreen = useCallback((f: Fullscreen) => { setFullscreen(f); if (f === null) setNav((n) => (n === 'mapa' || n === 'evolucao' ? 'visao' : n)); }, []);

  const value: Ctx = {
    step, playing, speed, intensity, regionId, hazard, mapTab, fullscreen, panel, evoMetric, nav, loading, layers, model,
    providerLabel: provider.label,
    setStep, togglePlay, setSpeed: setSpeedState, restart,
    setIntensity: (v) => setIntensityState(Math.min(1, Math.max(0, v))),
    selectRegion: setRegionId, setHazard, setMapTab: setMapTabState,
    setFullscreen: closeFullscreen, setPanel: closePanel, setEvoMetric,
    toggleLayer: (k) => setLayers((l) => ({ ...l, [k]: !l[k] })),
    navigate, registerCard, focusCard
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export { DEFAULT_URL };
