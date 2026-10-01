import { useApp } from '../state/AppContext';
import { useCountUp } from '../lib/hooks';
import { fmt, signed } from '../lib/format';
import type { ReactNode } from 'react';
import { Arrow, Card, LevelPill, deltaTone, toneColor } from './ui';
import { Icon, type IconName } from './icons';

function Variation({ delta, text, micro, worseWhen }: { delta: number | null; text: string; micro: string; worseWhen: 'up' | 'down' }) {
  if (delta === null) return <div className="flex flex-col items-end" aria-label="sem comparação no primeiro passo"><span className="num text-[13px] font-medium text-t2">—</span><span className="t-micro">{micro}</span></div>;
  const tone = deltaTone(delta, worseWhen);
  return (
    <div className="flex flex-col items-end" style={{ color: toneColor(tone) }}>
      <span className="num flex items-center gap-1 text-[13px] font-semibold"><Arrow delta={delta} />{text}</span>
      <span className="t-micro">{micro}</span>
    </div>
  );
}

function Kpi({ icon, title, children, variation, badge }: { icon: IconName; title: string; children: ReactNode; variation: ReactNode; badge?: ReactNode }) {
  return (
    <Card className="flex items-center gap-3 px-3" style={{ height: 84 }}>
      <span className="flex h-10 w-10 flex-none items-center justify-center border border-line2 text-t1" style={{ borderRadius: 2 }}><Icon name={icon} size={20} /></span>
      <div className="flex min-w-0 flex-1 flex-col"><span className="t-title">{title}</span>{children}</div>
      <div className="flex flex-none flex-col items-end gap-1">{badge}{variation}</div>
    </Card>
  );
}

export function KpiRow() {
  const { model, step, hazard } = useApp();
  const chuva = hazard === 'chuva';
  const w = model.cur.weather;
  const prevW = step > 0 ? model.steps[step - 1].weather : null;
  const act = useCountUp(model.totals.active);
  const free = useCountUp(model.totals.free);
  const wv = useCountUp(w);
  const city = useCountUp(model.cur.city.score);
  const tp = model.totalsPrev;
  const first = step === 0;
  const pct = prevW ? ((w - prevW) / prevW) * 100 : 0;

  return (
    <div className="grid grid-cols-4 gap-3" role="group" aria-label="Indicadores principais">
      <Kpi
        icon={chuva ? 'rain' : 'thermo'} title={chuva ? 'Chuva' : 'Índice de calor'}
        variation={<Variation delta={first ? null : pct} text={chuva ? `${signed(Math.round(pct))}%` : signed(w - (prevW ?? w), 1)} micro="vs 10 min antes" worseWhen="up" />}
      >
        <span className="flex items-baseline gap-1.5"><span className="t-hero">{fmt(wv, 1)}</span><span className="t-micro">{chuva ? 'mm/h' : '°C'}</span></span>
      </Kpi>
      <Kpi
        icon="alert" title={chuva ? 'Ocorrências' : 'Atendimentos por calor'}
        variation={<Variation delta={first || !tp ? null : model.totals.active - tp.active} text={signed(model.totals.active - (tp?.active ?? 0))} micro="em 10 min" worseWhen="up" />}
      >
        <span className="flex items-baseline gap-1.5"><span className="t-hero">{fmt(act)}</span><span className="t-micro">ativas</span></span>
      </Kpi>
      <Kpi
        icon="users" title={chuva ? 'Equipes livres' : 'Equipes e refúgios disponíveis'}
        variation={<Variation delta={first || !tp ? null : model.totals.free - tp.free} text={signed(model.totals.free - (tp?.free ?? 0))} micro="vs 10 min antes" worseWhen="down" />}
      >
        <span className="flex items-baseline gap-1.5"><span className="t-hero">{fmt(free)}</span><span className="t-micro">de {model.totals.teams} equipes livres</span></span>
      </Kpi>
      <Kpi
        icon="trending" title="Pressão da cidade" badge={<LevelPill level={model.cur.city.level} />}
        variation={<Variation delta={first ? null : model.cur.city.deltaVs10min} text={`${signed(model.cur.city.deltaVs10min)} pts`} micro="vs 10 min antes" worseWhen="up" />}
      >
        <span className="flex items-baseline gap-1"><span className="t-hero">{fmt(city)}</span><span className="t-micro">/100</span></span>
      </Kpi>
    </div>
  );
}

