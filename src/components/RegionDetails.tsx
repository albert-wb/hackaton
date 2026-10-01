import { useMemo, useRef, useState } from 'react';
import { useApp } from '../state/AppContext';
import { REGIONS } from '../data/regions';
import { roundFactors, whatIfExtraTeam } from '../engine/pressure';
import type { FactorKey, LevelIndex } from '../engine/types';
import { useCountUp, useSize } from '../lib/hooks';
import { fmt } from '../lib/format';
import { LEVELS, levelColor, levelTint } from '../lib/levels';
import { Icon, type IconName } from './icons';
import { Arrow, Card, CardHead, DotBar, LevelIcon, Tip, deltaTone, toneColor } from './ui';
import { stepClock } from '../engine/derived';

const FACTOR_ICONS: Record<FactorKey, IconName> = {
  demanda: 'alert', crescimento: 'trending', clima: 'rain', recursos: 'users', vulnerabilidade: 'shield', infra: 'building'
};

function Gauge({ score, level }: { score: number; level: LevelIndex }) {
  const cx = 60, cy = 60, r = 48;
  const pt = (f: number, rad = r): [number, number] => { const a = ((135 + 270 * f) * Math.PI) / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
  const arc = (f0: number, f1: number) => {
    const [x0, y0] = pt(f0), [x1, y1] = pt(f1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${(f1 - f0) * 270 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };
  const f = Math.min(Math.max(score / 100, 0.004), 1);
  return (
    <svg width="104" height="104" viewBox="0 0 120 120" aria-hidden="true">
      <path d={arc(0, 1)} fill="none" stroke="#262626" strokeWidth="9" strokeLinecap="round" />
      <path d={arc(0, f)} fill="none" stroke={levelColor(level)} strokeWidth="9" strokeLinecap="round" style={{ transition: 'stroke 250ms ease-out' }} />
      {[0.25, 0.5, 0.75].map((m) => { const [x0, y0] = pt(m, r - 8), [x1, y1] = pt(m, r + 8); return <line key={m} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#101010" strokeWidth="2.5" />; })}
    </svg>
  );
}

function RegionTrend() {
  const { model, regionId, step } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const W = w || 300, H = h || 60;
  const L = 24, R = 8, T = 6, B = 14;
  const xs = (t: number) => L + ((W - L - R) * t) / 4;
  const ys = (v: number) => T + (H - T - B) * (1 - v / 100);
  const vals = model.steps.map((s) => s.regions[regionId].score);
  const past = vals.slice(0, step + 1).map((v, t) => [xs(t), ys(v)] as const);
  const line = past.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const area = past.length > 1 ? `${line}L${past[past.length - 1][0]} ${ys(0)}L${past[0][0]} ${ys(0)}Z` : '';
  const fut = vals.slice(step).map((v, i) => [xs(step + i), ys(v)] as const);
  const futLine = fut.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  const lv = model.cur.regions[regionId].level;
  const ticks = H < 90 ? [0, 50, 100] : [0, 25, 50, 75, 100];
  return (
    <div ref={ref} className="min-h-0 flex-1">
      <svg width={W} height={H} role="img" aria-label={`Tendência da pressão em ${REGIONS.find((r) => r.id === regionId)!.name}, de 14:00 a 14:40`}>
        {([[0, 25, 0], [25, 50, 1], [50, 75, 2], [75, 100, 3]] as const).map(([a, b, l]) => (
          <rect key={l} x={L} y={ys(b)} width={W - L - R} height={ys(a) - ys(b)} fill={levelColor(l)} opacity="0.07" />
        ))}
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={ys(v)} y2={ys(v)} stroke="#2a2a2a" strokeWidth="1" /><text x={L - 4} y={ys(v) + 3} textAnchor="end" fontSize="9" fill="#a3a3a3" className="num">{v}</text></g>)}
        {[0, 1, 2, 3, 4].map((t) => <text key={t} x={xs(t)} y={H - 3} textAnchor={t === 0 ? 'start' : t === 4 ? 'end' : 'middle'} fontSize="9" fill="#a3a3a3" className="num">{stepClock(t)}</text>)}
        {area && <path d={area} fill="#f5f5f5" opacity="0.06" />}
        <path d={futLine} fill="none" stroke="#a3a3a3" strokeWidth="1.2" strokeDasharray="3 3" />
        {fut.slice(1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="#101010" stroke="#a3a3a3" strokeWidth="1.2" />)}
        <path d={line} fill="none" stroke="#f5f5f5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {past.slice(0, -1).map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="#f5f5f5" />)}
        <circle cx={past[past.length - 1][0]} cy={past[past.length - 1][1]} r="4.2" fill="#101010" stroke={levelColor(lv)} strokeWidth="2" />
      </svg>
    </div>
  );
}

export function RegionDetails() {
  const { model, regionId, step, hazard, setPanel } = useApp();
  const [whatIf, setWhatIf] = useState(false);
  const region = REGIONS.find((r) => r.id === regionId)!;
  const p = model.cur.regions[regionId];
  const score = useCountUp(p.score);
  const prev = step > 0 ? model.steps[step - 1].regions[regionId] : null;
  const chuva = hazard === 'chuva';

  const names: Record<FactorKey, string> = {
    demanda: 'Demanda atual', crescimento: 'Crescimento da demanda', clima: chuva ? 'Intensidade da chuva' : 'Índice de calor',
    recursos: 'Recursos ocupados', vulnerabilidade: 'Vulnerabilidade', infra: 'Infraestrutura crítica'
  };
  const rows = useMemo(() => {
    const ints = roundFactors(p.factors.map((f) => f.points), p.score);
    const prevInts = prev ? roundFactors(prev.factors.map((f) => f.points), prev.score) : null;
    return p.factors
      .map((f, i) => ({ key: f.key, int: ints[i], max: f.max, raw: f.points, delta: prevInts ? ints[i] - prevInts[i] : 0, idx: i }))
      .sort((a, b) => b.int - a.int || b.raw - a.raw || a.idx - b.idx);
  }, [p, prev]);

  const wi = useMemo(() => (whatIf ? whatIfExtraTeam(model.snap, model.steps, regionId, step) : null), [whatIf, model.snap, model.steps, regionId, step]);
  const eta = p.etaMinutes;
  const etaTxt = (e: typeof eta) => (e === 'saturado' ? 'Saturado' : e === null ? 'Sem tendência' : `~${Math.max(1, Math.round(e))} min`);

  return (
    <Card className="flex flex-col" label="Detalhes da região">
      <CardHead icon="pin" title="Detalhes da região" right={<span className="pill" style={{ border: `1px solid ${levelColor(p.level)}`, background: levelTint(p.level), color: '#f5f5f5' }}><LevelIcon level={p.level} size={9} />{region.name}</span>} />
      <div className="relative flex min-h-0 flex-1 flex-col gap-1 px-3 pb-2 pt-1.5">
        <div className="flex items-start gap-3">
          <div className="flex flex-none flex-col items-center">
            <div className="relative h-[104px] w-[104px]">
              <Gauge score={score} level={p.level} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-1">
                <span className="t-hero leading-[38px]" aria-label={`Pressão ${p.score} de 100`}>{fmt(score)}</span>
                <span className="num text-[10px] leading-3 text-t2">/100</span>
              </div>
            </div>
            <span className="-mt-3 flex items-center gap-1 text-[11px] text-t2">
              Pressão operacional
              <Tip text="Índice de 0 a 100 que combina demanda, chuva, equipes e vulnerabilidade." side="below"><button aria-label="O que é a pressão operacional?" className="text-t2 hover:text-t1"><Icon name="help" size={12} /></button></Tip>
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h3 className="m-0 text-[18px] font-semibold leading-[22px]">Região {region.name}</h3>
            <div className="flex flex-col gap-1 border p-2" style={{ borderColor: levelColor(p.level), background: levelTint(p.level), borderRadius: 2 }} role="status">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex-none" style={{ color: levelColor(p.level) }}>{eta === 'saturado' ? <LevelIcon level={3} size={16} /> : eta === null ? <LevelIcon level={0} size={16} /> : <Icon name="alert" size={16} />}</span>
                <span className="flex min-w-0 flex-col leading-4">
                  {typeof eta === 'number' && <><b className="text-[12px] font-semibold">Possível saturação</b><span className="num text-[13px] font-semibold">em ~{Math.max(1, Math.round(eta))} min</span></>}
                  {eta === 'saturado' && <><b className="text-[12px] font-semibold">Capacidade esgotada</b><span className="text-[11px] text-t2">Sem equipes livres</span></>}
                  {eta === null && <b className="text-[12px] font-semibold">Sem tendência de saturação</b>}
                </span>
              </div>
              <span className="text-[10px] leading-[13px] text-t2">Estimativa por tendência; não validada.</span>
            </div>
            <button className="btn self-start" onClick={() => setWhatIf(true)} aria-haspopup="dialog"><Icon name="plus" size={14} />E se +1 equipe?</button>
          </div>
        </div>

        <div className="mt-1 flex flex-col">
          <div className="flex items-center justify-between"><span className="t-title">Principais fatores</span><button className="text-[11px] text-t2 underline hover:text-t1" onClick={() => setPanel('como')}>Como é calculado?</button></div>
          <ul className="m-0 mt-1 flex list-none flex-col p-0">
            {rows.map((r) => {
              const tone = deltaTone(r.delta, 'up');
              return (
                <li key={r.key} className="grid h-[18px] items-center gap-1.5" style={{ gridTemplateColumns: '14px minmax(0,1fr) 62px 44px 12px' }}>
                  <Icon name={FACTOR_ICONS[r.key]} size={14} className="text-t2" />
                  <span className="truncate text-[12px]">{names[r.key]}</span>
                  <DotBar value={r.int} max={r.max} />
                  <span className="num text-right text-[11px]"><span className="font-semibold">{r.int}</span> <span className="text-t2">/{r.max}</span></span>
                  <span style={{ color: toneColor(tone) }} aria-label={r.delta > 0 ? 'subiu' : r.delta < 0 ? 'caiu' : 'estável'}><Arrow delta={r.delta} size={11} /></span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-1 flex min-h-0 flex-1 flex-col">
          <span className="t-title">Tendência da pressão</span>
          <RegionTrend />
        </div>

        {wi && (
          <div role="dialog" aria-label="E se mais uma equipe" className="absolute inset-x-2 bottom-2 z-20 flex flex-col gap-2 border border-line2 bg-s2 p-3" style={{ borderRadius: 2 }}>
            <div className="flex items-center justify-between"><b className="text-[12px] font-semibold">E se +1 equipe? · {region.name}</b><button className="btn" style={{ height: 24, width: 24, padding: 0 }} aria-label="Fechar comparação" onClick={() => setWhatIf(false)}><Icon name="close" size={12} /></button></div>
            <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 20px 1fr' }}>
              {[{ t: 'Antes', pr: p, e: eta }, null, { t: 'Depois', pr: wi, e: wi.etaMinutes }].map((c, i) => c ? (
                <div key={i} className="flex flex-col gap-1 border border-line p-2" style={{ borderRadius: 2, borderColor: i === 2 ? '#f5f5f5' : undefined }}>
                  <span className="t-micro">{c.t}</span>
                  <span className="flex items-baseline gap-1.5"><span className="t-num">{c.pr.score}</span><LevelIcon level={c.pr.level} size={11} /><span className="t-level text-[10px]">{LEVELS[c.pr.level].name}</span></span>
                  <span className="num text-[11px] text-t2">Tempo até saturação: <span className="text-t1">{etaTxt(c.e)}</span></span>
                </div>
              ) : <Icon key={i} name="arrowRight" size={18} className="text-t2" />)}
            </div>
            <span className="t-micro">Com uma equipe adicional livre neste passo ({model.cur.t === 0 ? '14:00' : stepClock(step)}). Estimativa por tendência; não validada.</span>
          </div>
        )}
      </div>
    </Card>
  );
}

