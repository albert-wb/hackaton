import { useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { levelColor } from '../lib/levels';
import { fmt } from '../lib/format';
import type { Eta } from '../engine/types';
import { Card, CardHead, LevelIcon } from './ui';
import { Icon } from './icons';
import { useRef } from 'react';

export const etaLine = (eta: Eta): string => {
  if (eta === 'saturado') return 'Capacidade esgotada';
  if (eta === null) return 'Sem tendência';
  return `Saturação em ~${Math.max(1, Math.round(eta))} min`;
};

function Spark({ values, cur, color }: { values: number[]; cur: number; color: string }) {
  const W = 38, H = 20;
  const pts = values.map((v, i) => [2 + (i * (W - 4)) / (values.length - 1), H - 2 - (v / 100) * (H - 4)] as const);
  const d = pts.slice(0, cur + 1).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <path d={d} fill="none" stroke="#f5f5f5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[cur][0]} cy={pts[cur][1]} r="3" fill={color} stroke="#101010" strokeWidth="1" />
    </svg>
  );
}

export function RegionsCard() {
  const { model, step, regionId, selectRegion, setPanel, registerCard } = useApp();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { registerCard('regioes', ref.current); return () => registerCard('regioes', null); }, [registerCard]);

  return (
    <Card ref={ref} tabIndex={-1} label="Regiões" className="flex flex-col" style={{ height: 244 }}>
      <CardHead icon="layers" title="Regiões" right={<button className="flex items-center gap-1 text-[11px] text-t2 hover:text-t1" onClick={() => setPanel('recursos')}>Ver todas <Icon name="arrowRight" size={12} /></button>} />
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col p-0" aria-label="Regiões por pressão, da maior para a menor">
        {model.sorted.map((r) => {
          const p = model.cur.regions[r.id];
          const sel = r.id === regionId;
          return (
            <li key={r.id} className="flex-1 border-b border-line last:border-b-0">
              <button
                onClick={() => selectRegion(r.id)} aria-pressed={sel}
                aria-label={`${r.name}, pressão ${p.score}, ${etaLine(p.etaMinutes)}`}
                className="row-hover flex h-full w-full items-center gap-1 px-2 text-left"
                style={{ background: sel ? '#161616' : undefined, boxShadow: sel ? 'inset 2px 0 0 #f5f5f5' : undefined }}
              >
                <LevelIcon level={p.level} size={13} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium leading-4">{r.name}</span>
                  <span className="truncate text-[11px] leading-[14px] text-t2">{etaLine(p.etaMinutes)}</span>
                </span>
                <span className="flex w-[42px] flex-none items-baseline justify-end gap-0.5">
                  <span className="num text-[16px] font-semibold leading-5" style={{ color: '#f5f5f5' }}>{fmt(p.score)}</span>
                  <span className="num text-[10px] text-t2">/100</span>
                </span>
                <Spark values={model.steps.map((s) => s.regions[r.id].score)} cur={step} color={levelColor(p.level)} />
                <Icon name="right" size={12} className="flex-none text-t2" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
