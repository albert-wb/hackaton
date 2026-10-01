import { useApp } from '../state/AppContext';
import { fmt, signed } from '../lib/format';
import { Card, CardHead } from './ui';
import { Icon } from './icons';

export function ConditionsCard() {
  const { model, hazard } = useApp();
  const c = model.conditions;
  const chuva = hazard === 'chuva';
  const name = (id: string) => model.regions.find((r) => r.id === id)!.name;
  const trend = {
    inicio: { t: 'Início do replay', icon: null as null | 'arrowUp' | 'arrowDown' | 'arrowRight' },
    aumentando: { t: 'Aumentando', icon: 'arrowUp' as const },
    estavel: { t: 'Estável', icon: 'arrowRight' as const },
    diminuindo: { t: 'Diminuindo', icon: 'arrowDown' as const }
  }[c.trend];
  const trendColor = c.trend === 'aumentando' ? 'var(--variacao-piora)' : c.trend === 'diminuindo' ? 'var(--variacao-melhora)' : 'var(--variacao-neutra)';

  const rows: Array<{ k: string; v: React.ReactNode }> = [
    { k: chuva ? 'Chuva atual' : 'Índice de calor', v: `${fmt(c.weatherNow, 1)} ${chuva ? 'mm/h' : '°C'}` },
    chuva
      ? { k: 'Acumulado desde 14:00', v: <span title="Estimativa: soma de mm/h ÷ 6 a cada passo de 10 min">{`~${fmt(c.accumulatedMm, 1)} mm`}</span> }
      : { k: 'Máximo desde 14:00', v: `${fmt(c.maxHeat, 1)} °C` },
    { k: chuva ? 'Tendência da chuva' : 'Tendência do calor', v: <span className="inline-flex items-center gap-1" style={{ color: trendColor }}>{trend.icon && <Icon name={trend.icon} size={12} strokeWidth={2} />}{trend.t}</span> },
    { k: 'Maior crescimento', v: c.biggestGrowth ? `${name(c.biggestGrowth.regionId)} (${signed(c.biggestGrowth.delta)} em 10 min)` : model.cur.t === 0 ? 'Início do replay' : 'Sem crescimento' },
    { k: 'Menos equipes livres', v: `${name(c.fewestTeams.regionId)} (${c.fewestTeams.free} de ${c.fewestTeams.total})` }
  ];

  return (
    <Card label="Condições atuais" className="flex flex-1 flex-col">
      <CardHead icon={chuva ? 'rain' : 'thermo'} title="Condições atuais" />
      <dl className="m-0 flex min-h-0 flex-1 flex-col justify-around px-2.5 py-1">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-2">
            <dt className="whitespace-nowrap text-[12px] leading-4 text-t2">{r.k}</dt>
            <dd className="m-0 text-right text-[11.5px] font-medium leading-4 tabular-nums">{r.v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
