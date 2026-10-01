import { useMemo, useRef, useState } from 'react';
import { REGIONS } from '../data/regions';
import { stepClock } from '../engine/derived';
import { STEP_COUNT } from '../engine/pressure';
import type { RegionId } from '../engine/types';
import { useSize } from '../lib/hooks';
import { levelColor } from '../lib/levels';
import { useApp, type EvoMetric } from '../state/AppContext';
import { Icon } from './icons';
import { Card, CardHead } from './ui';

/** Estilos fixos por região: só cinzas, diferenciados por traço (o selecionado vira branco e mais grosso). */
const LINE_STYLE: Record<RegionId, { color: string; dash?: string; cap?: 'round' }> = {
  norte: { color: '#a3a3a3' },
  centro: { color: '#8a8a8a', dash: '6 3' },
  leste: { color: '#6e6e6e', dash: '2 3', cap: 'round' },
  sul: { color: '#a3a3a3', dash: '8 3 2 3' }
};
const CITY_DASH = '4 3';

const METRICS: Array<{ k: EvoMetric; label: string }> = [
  { k: 'pressao', label: 'Pressão' }, { k: 'ocorrencias', label: 'Ocorrências' }, { k: 'equipes', label: 'Equipes livres' }
];

const niceMax = (v: number): number => {
  if (v <= 4) return 4;
  if (v <= 6) return 6;
  if (v <= 8) return 8;
  if (v <= 12) return 12;
  return Math.ceil(v / 4) * 4;
};

export function PressureEvolution({ expanded = false }: { expanded?: boolean }) {
  const { model, step, regionId, selectRegion, evoMetric, setEvoMetric, setFullscreen, hazard } = useApp();
  const boxRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(boxRef);
  const [hover, setHover] = useState<number | null>(null);
  const W = w || 400, H = h || 150;
  const L = 30, R = 38, T = 10, B = 20;

  const series = useMemo(() => {
    const pick = (id: RegionId, t: number): number => {
      const p = model.steps[t].regions[id];
      return evoMetric === 'pressao' ? p.score : evoMetric === 'ocorrencias' ? p.active : p.teamsFree;
    };
    return REGIONS.map((r) => ({ id: r.id, name: r.name, values: model.steps.map((_, t) => pick(r.id, t)) }));
  }, [model.steps, evoMetric]);

  const yMax = evoMetric === 'pressao' ? 100 : niceMax(Math.max(...series.flatMap((s) => s.values)));
  const ticks = evoMetric === 'pressao' ? [0, 25, 50, 75, 100] : Array.from({ length: Math.min(yMax, 4) + 1 }, (_, i) => Math.round((yMax / Math.min(yMax, 4)) * i));
  const xs = (t: number) => L + ((W - L - R) * t) / (STEP_COUNT - 1);
  const ys = (v: number) => T + (H - T - B) * (1 - v / yMax);
  const path = (vals: number[], to: number) => vals.slice(0, to + 1).map((v, t) => `${t ? 'L' : 'M'}${xs(t).toFixed(1)} ${ys(v).toFixed(1)}`).join('');
  const unit = evoMetric === 'pressao' ? 'pontos' : evoMetric === 'ocorrencias' ? (hazard === 'chuva' ? 'ocorrências ativas' : 'atendimentos ativos') : 'equipes livres';
  const sel = series.find((s) => s.id === regionId)!;
  const cityVals = model.steps.map((s) => s.city.score);

  const order = [...series.filter((s) => s.id !== regionId), sel]; // selecionada por cima
  const hoverT = hover ?? null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const t = Math.round(((x - L) / (W - L - R)) * (STEP_COUNT - 1));
    setHover(t >= 0 && t <= step ? t : null);
  };

  const lastY = ys(sel.values[step]);
  const pillW = 26;

  return (
    <Card label="Evolução da pressão" className="flex min-h-0 flex-col" style={expanded ? { height: '100%' } : undefined}>
      <CardHead
        icon="chart" title="Evolução da pressão"
        right={
          <>
            <div className="seg" role="tablist" aria-label="Métrica do gráfico">
              {METRICS.map((m) => <button key={m.k} role="tab" aria-selected={evoMetric === m.k} onClick={() => setEvoMetric(m.k)} style={{ height: 22, padding: '0 10px', fontSize: 11 }}>{m.label}</button>)}
            </div>
            <button className="btn" style={{ height: 24, width: 24, padding: 0 }} aria-label={expanded ? 'Fechar tela cheia' : 'Abrir o gráfico em tela cheia'} onClick={() => setFullscreen(expanded ? null : 'evolucao')}>
              <Icon name={expanded ? 'shrink' : 'expand'} size={13} />
            </button>
          </>
        }
      />
      <div ref={boxRef} className="relative min-h-0 flex-1">
        <svg
          width={W} height={H} role="img" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
          aria-label={`Evolução de ${METRICS.find((m) => m.k === evoMetric)!.label.toLowerCase()} por região, de 14:00 até ${stepClock(step)}. Região selecionada: ${sel.name}, ${sel.values[step]} ${unit}.`}
        >
          {evoMetric === 'pressao' && ([[0, 25, 0], [25, 50, 1], [50, 75, 2], [75, 100, 3]] as const).map(([a, b, l]) => (
            <rect key={l} x={L} y={ys(b)} width={W - L - R} height={ys(a) - ys(b)} fill={levelColor(l)} opacity="0.06" />
          ))}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={ys(v)} y2={ys(v)} stroke="#2a2a2a" />
              <text x={L - 5} y={ys(v) + 3} textAnchor="end" fontSize="10" fill="#a3a3a3" className="num">{v}</text>
            </g>
          ))}
          {Array.from({ length: STEP_COUNT }, (_, t) => (
            <g key={t}>
              <line x1={xs(t)} x2={xs(t)} y1={T} y2={H - B} stroke="#2a2a2a" strokeDasharray="1 3" opacity={t === step ? 0 : 0.8} />
              <text x={xs(t)} y={H - 6} textAnchor={t === 0 ? 'start' : t === STEP_COUNT - 1 ? 'end' : 'middle'} fontSize="10" fill={t === step ? '#f5f5f5' : '#a3a3a3'} className="num">{stepClock(t)}</text>
            </g>
          ))}
          <line x1={xs(step)} x2={xs(step)} y1={T} y2={H - B} stroke="#6e6e6e" strokeDasharray="2 3" />

          {evoMetric === 'pressao' && <path d={path(cityVals, step)} fill="none" stroke="#f5f5f5" strokeWidth="1" strokeDasharray={CITY_DASH} opacity="0.9" />}

          {order.map((s) => {
            const isSel = s.id === regionId;
            const st = LINE_STYLE[s.id];
            const d = path(s.values, step);
            return (
              <g key={s.id}>
                <path
                  d={d} fill="none" stroke={isSel ? '#f5f5f5' : st.color} strokeWidth={isSel ? 2.25 : 1.5}
                  strokeDasharray={isSel ? undefined : st.dash} strokeLinecap={isSel ? 'round' : st.cap ?? 'butt'} strokeLinejoin="round"
                />
                <path d={d} fill="none" stroke="transparent" strokeWidth="12" style={{ cursor: 'pointer' }} onClick={() => selectRegion(s.id)}>
                  <title>{s.name}</title>
                </path>
                {isSel && s.values.slice(0, step + 1).map((v, t) => <circle key={t} cx={xs(t)} cy={ys(v)} r={t === step ? 3.2 : 2} fill={t === step ? '#0a0a0a' : '#f5f5f5'} stroke="#f5f5f5" strokeWidth={t === step ? 2 : 0} />)}
              </g>
            );
          })}

          {/* pílula branca com o valor atual da região selecionada */}
          <g transform={`translate(${Math.min(xs(step) + 8, W - pillW - 2)}, ${Math.max(T + 8, Math.min(lastY, H - B - 8)) - 8})`}>
            <rect width={pillW} height="16" rx="8" fill="#f5f5f5" />
            <text x={pillW / 2} y="11.5" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#0a0a0a" className="num">{sel.values[step]}</text>
          </g>

          {hoverT !== null && (
            <g pointerEvents="none">
              <line x1={xs(hoverT)} x2={xs(hoverT)} y1={T} y2={H - B} stroke="#a3a3a3" strokeWidth="1" />
              {series.map((s) => <circle key={s.id} cx={xs(hoverT)} cy={ys(s.values[hoverT])} r="2.6" fill="#0a0a0a" stroke="#f5f5f5" />)}
            </g>
          )}
        </svg>

        {hoverT !== null && (
          <div className="pointer-events-none absolute z-10 border border-line2 bg-s2 px-2 py-1.5 text-[11px] leading-[15px]" style={{ borderRadius: 2, top: 6, left: xs(hoverT) > W / 2 ? undefined : xs(hoverT) + 10, right: xs(hoverT) > W / 2 ? W - xs(hoverT) + 10 : undefined }}>
            <b className="num font-semibold">{stepClock(hoverT)}</b>
            {series.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3" style={{ color: s.id === regionId ? '#f5f5f5' : '#a3a3a3' }}>
                <span>{s.name}</span><span className="num">{s.values[hoverT]}</span>
              </div>
            ))}
            {evoMetric === 'pressao' && <div className="flex justify-between gap-3 border-t border-line pt-0.5 text-t2"><span>Cidade</span><span className="num">{cityVals[hoverT]}</span></div>}
          </div>
        )}
      </div>

      <div className="flex flex-none items-center gap-3 border-t border-line px-3 py-1.5 text-[10.5px] leading-[14px] text-t2" role="list" aria-label="Legenda das linhas">
        {REGIONS.map((r) => {
          const isSel = r.id === regionId;
          const st = LINE_STYLE[r.id];
          return (
            <button key={r.id} role="listitem" className="flex items-center gap-1.5 hover:text-t1" style={{ color: isSel ? '#f5f5f5' : undefined }} onClick={() => selectRegion(r.id)} aria-pressed={isSel}>
              <svg width="22" height="6" aria-hidden="true"><line x1="1" x2="21" y1="3" y2="3" stroke={isSel ? '#f5f5f5' : st.color} strokeWidth={isSel ? 2.25 : 1.5} strokeDasharray={isSel ? undefined : st.dash} strokeLinecap={isSel ? 'round' : st.cap ?? 'butt'} /></svg>
              {r.name}
            </button>
          );
        })}
        {evoMetric === 'pressao' && (
          <span role="listitem" className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden="true"><line x1="1" x2="21" y1="3" y2="3" stroke="#f5f5f5" strokeWidth="1" strokeDasharray={CITY_DASH} /></svg>Cidade</span>
        )}
        {evoMetric !== 'pressao' && <span className="ml-auto text-t3">{unit}</span>}
      </div>
    </Card>
  );
}
