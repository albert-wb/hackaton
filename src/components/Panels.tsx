import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ALERT_MAX_ETA, ALERT_MIN_SCORE } from '../engine/pressure';
import { stepClock } from '../engine/derived';
import type { RegionId } from '../engine/types';
import { levelColor, LEVELS } from '../lib/levels';
import { useApp, type Panel } from '../state/AppContext';
import { etaLine } from './RegionsCard';
import { LEGEND_PATTERN } from './Patterns';
import { OCCURRENCE_ICONS_CALOR, OCCURRENCE_ICONS_CHUVA, Icon } from './icons';
import { LevelIcon, TeamSquares } from './ui';

/** Painel lateral sobre o conteúdo. Esc e clique fora fecham; o foco vai para o botão de fechar. */
function Drawer({ title, sub, children, onClose }: { title: string; sub?: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex justify-end" style={{ background: 'rgba(0,0,0,0.55)' }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={title} className="drawer card flex h-full w-[420px] flex-col" style={{ borderRadius: 0, background: '#101010' }}>
        <header className="flex flex-none items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="m-0 text-[15px] font-semibold leading-5">{title}</h2>
            {sub && <span className="t-micro">{sub}</span>}
          </div>
          <button ref={closeRef} className="btn ml-auto" style={{ width: 28, padding: 0 }} onClick={onClose} aria-label="Fechar painel"><Icon name="close" size={14} /></button>
        </header>
        <div className="scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

function OccurrencesPanel() {
  const { model, step, hazard, selectRegion } = useApp();
  const [filter, setFilter] = useState<'todas' | RegionId>('todas');
  const icons = hazard === 'chuva' ? OCCURRENCE_ICONS_CHUVA : OCCURRENCE_ICONS_CALOR;
  const list = useMemo(
    () => [...model.occNow].filter((o) => filter === 'todas' || o.regionId === filter).sort((a, b) => b.minutes - a.minutes || b.seq - a.seq),
    [model.occNow, filter]
  );
  const nameOf = (id: string) => model.regions.find((r) => r.id === id)!.name;
  const count = (id: RegionId) => model.occNow.filter((o) => o.regionId === id).length;
  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
        <div className="seg flex-wrap self-start" role="group" aria-label="Filtrar por região">
          <button aria-pressed={filter === 'todas'} onClick={() => setFilter('todas')}>Todas <span className="num text-t3">{model.occNow.length}</span></button>
          {model.regions.map((r) => <button key={r.id} aria-pressed={filter === r.id} onClick={() => setFilter(r.id)}>{r.name} <span className="num text-t3">{count(r.id)}</span></button>)}
        </div>
        <span className="t-micro">{list.length} {list.length === 1 ? 'ocorrência simulada' : 'ocorrências simuladas'} até {stepClock(step)}.</span>
      </div>
      <ul className="m-0 list-none p-0">
        {list.map((o) => (
          <li key={o.seq} className="border-b border-line">
            <button className="row-hover flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => selectRegion(o.regionId)} aria-label={`${o.type}, ${o.time}, Região ${nameOf(o.regionId)}. Selecionar a região.`}>
              <Icon name={icons[o.typeIndex]} size={16} className="flex-none text-t2" />
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[13px]">{o.type}</span><span className="t-micro">Ocorrência {o.indexInRegion + 1} da região</span></span>
              <span className="num flex-none text-[12px] text-t2">{o.time}</span>
              <span className="pill pill-line w-[58px] flex-none justify-center" style={{ height: 18, padding: 0 }}>{nameOf(o.regionId)}</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="px-4 py-6 text-[12px] text-t2">Nenhuma ocorrência nesta região até o momento.</li>}
      </ul>
    </>
  );
}

function ResourcesPanel() {
  const { model, regionId, selectRegion, hazard } = useApp();
  const chuva = hazard === 'chuva';
  const t = model.totals;
  return (
    <>
      <div className="flex items-baseline gap-2 border-b border-line px-4 py-3">
        <span className="t-hero">{t.free}</span>
        <span className="text-[13px] text-t2">de {t.teams} {chuva ? 'equipes livres' : 'equipes e refúgios disponíveis'} na cidade</span>
      </div>
      <ul className="m-0 list-none p-0">
        {model.sorted.map((r) => {
          const p = model.cur.regions[r.id];
          return (
            <li key={r.id} className="border-b border-line">
              <button className="row-hover flex w-full flex-col gap-2 px-4 py-3 text-left" aria-pressed={r.id === regionId} onClick={() => selectRegion(r.id)} style={{ boxShadow: r.id === regionId ? 'inset 2px 0 0 #f5f5f5' : undefined }}>
                <span className="flex items-center gap-2">
                  <LevelIcon level={p.level} size={12} />
                  <b className="text-[14px] font-semibold">{r.name}</b>
                  <span className="t-level ml-1 text-[10px] text-t2">{LEVELS[p.level].name}</span>
                  <span className="num ml-auto text-[13px]"><b className="font-semibold">{p.score}</b><span className="text-t2">/100</span></span>
                </span>
                <span className="flex items-center gap-3">
                  <TeamSquares total={p.teamsTotal} free={p.teamsFree} size={14} />
                  <span className="num text-[12px]">{p.teamsFree} de {p.teamsTotal} {chuva ? 'equipes livres' : 'disponíveis'}</span>
                </span>
                <span className="flex justify-between text-[11px] text-t2">
                  <span>{p.active} {chuva ? 'ocorrências ativas' : 'atendimentos ativos'}</span>
                  <span>{etaLine(p.etaMinutes)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="m-0 px-4 py-3 text-[11px] leading-[15px] text-t2">Quadrado cheio = equipe ocupada · quadrado vazado = equipe livre. Dados simulados.</p>
    </>
  );
}

const FACTORS: Array<{ name: string; formula: string; max: number }> = [
  { name: 'Demanda atual', formula: '25 × mín(ocorrências ativas ÷ 12; 1)', max: 25 },
  { name: 'Crescimento da demanda', formula: '20 × limitar((ativas − ativas 10 min antes) ÷ 4; 0; 1). No primeiro passo vale 0.', max: 20 },
  { name: 'Chuva / calor', formula: 'Chuva: 20 × limitar(mm/h ÷ 80). Calor: 20 × limitar((índice de calor − 28) ÷ 14).', max: 20 },
  { name: 'Recursos ocupados', formula: '20 × (1 − equipes livres ÷ equipes totais)', max: 20 },
  { name: 'Vulnerabilidade', formula: '10 × vulnerabilidade da região (0 a 1)', max: 10 },
  { name: 'Infraestrutura crítica', formula: '5 × mín(itens críticos ÷ 2; 1)', max: 5 }
];

function HowItWorksPanel() {
  return (
    <div className="flex flex-col gap-5 px-4 py-4 text-[12.5px] leading-[18px]">
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">O que o Pressure Engine responde</h3>
        <p className="m-0 text-t2">Em qual região a capacidade de resposta pode ser sobrecarregada primeiro, e em quanto tempo. Ele não prevê ocorrências: extrapola a tendência dos últimos 10 minutos.</p>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Pressão operacional (0 a 100)</h3>
        <p className="m-0 mb-2 text-t2">Soma de seis fatores, arredondada. A pressão da cidade é 0,5 × a maior região + 0,5 × a média das regiões.</p>
        <table className="w-full border-collapse text-left text-[11.5px] leading-4">
          <thead><tr className="text-t2"><th className="border-b border-line py-1 pr-2 font-medium">Fator</th><th className="border-b border-line py-1 pr-2 font-medium">Cálculo</th><th className="border-b border-line py-1 text-right font-medium">Máx.</th></tr></thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f.name} className="align-top">
                <td className="border-b border-line py-1.5 pr-2 font-medium">{f.name}</td>
                <td className="border-b border-line py-1.5 pr-2 text-t2">{f.formula}</td>
                <td className="num border-b border-line py-1.5 text-right">{f.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="m-0 mb-2 text-[13px] font-semibold">Níveis</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {LEVELS.map((l, i) => (
            <li key={l.key} className="flex items-center gap-2.5">
              <svg width="26" height="16" aria-hidden="true" style={{ flex: 'none' }}>
                <rect x="0.5" y="0.5" width="25" height="15" rx="2" fill={LEGEND_PATTERN[i] ? `url(#${LEGEND_PATTERN[i]})` : 'none'} stroke={levelColor(i as 0 | 1 | 2 | 3)} />
              </svg>
              <LevelIcon level={i as 0 | 1 | 2 | 3} size={11} />
              <b className="t-level w-[64px] text-[11px]">{l.name}</b>
              <span className="num w-[52px] text-t2">{l.range}</span>
              <span className="text-t2">{l.shape} · {l.pattern}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Tempo até saturação</h3>
        <p className="m-0 text-t2">Se não há equipes livres, a região está saturada. Se a demanda cresce, o tempo é (equipes livres ÷ novas ocorrências em 10 min) × 10 min. Se a demanda não cresce, não há tendência de saturação. É uma estimativa por tendência, não validada.</p>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Quando o alerta dispara</h3>
        <p className="m-0 text-t2">Pressão de <b className="num text-t1">{ALERT_MIN_SCORE}</b> ou mais e tempo até saturação de <b className="num text-t1">{ALERT_MAX_ETA} min</b> ou menos. A prioridade é Crítica com capacidade esgotada ou tempo ≤ 5 min; Alta de 6 a 15 min.</p>
      </section>
      <section className="border border-line p-3" style={{ borderRadius: 2 }}>
        <b className="font-semibold">Modo demonstração</b>
        <p className="m-0 mt-1 text-t2">Todos os dados são simulados, de forma determinística: o mesmo passo e a mesma intensidade sempre geram o mesmo resultado. A geometria das zonas do mapa é editável em <span className="num">src/data/zones.geo.json</span>.</p>
      </section>
    </div>
  );
}

export function PanelHost() {
  const { panel, setPanel, hazard } = useApp();
  if (!panel) return null;
  const close = () => setPanel(null);
  const meta: Record<Exclude<Panel, null>, { title: string; sub: string; body: ReactNode }> = {
    ocorrencias: { title: 'Ocorrências', sub: hazard === 'chuva' ? 'Todas as ocorrências simuladas até o momento' : 'Todos os atendimentos simulados até o momento', body: <OccurrencesPanel /> },
    recursos: { title: 'Recursos', sub: 'Equipes por região, no instante do replay', body: <ResourcesPanel /> },
    como: { title: 'Como funciona', sub: 'Pressure Engine: fórmula, fatores e níveis', body: <HowItWorksPanel /> }
  };
  const m = meta[panel];
  return <Drawer key={panel} title={m.title} sub={m.sub} onClose={close}>{m.body}</Drawer>;
}
