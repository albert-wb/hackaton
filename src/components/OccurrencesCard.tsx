import { useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { OCCURRENCE_ICONS_CALOR, OCCURRENCE_ICONS_CHUVA, Icon } from './icons';
import { Card, CardHead } from './ui';

export function OccurrencesCard() {
  const { model, hazard, selectRegion, setPanel } = useApp();
  const icons = hazard === 'chuva' ? OCCURRENCE_ICONS_CHUVA : OCCURRENCE_ICONS_CALOR;
  const latest = useMemo(
    () => [...model.occNow].sort((a, b) => b.minutes - a.minutes || b.seq - a.seq).slice(0, 5),
    [model.occNow]
  );
  const nameOf = (id: string) => model.regions.find((r) => r.id === id)!.name;

  return (
    <Card label="Últimas ocorrências" className="flex min-h-0 flex-col">
      <CardHead
        icon="list" title="Últimas ocorrências" sub="Ocorrências simuladas"
        right={<button className="flex items-center gap-1 text-[11px] text-t2 hover:text-t1" onClick={() => setPanel('ocorrencias')}>Ver todas <Icon name="arrowRight" size={12} /></button>}
      />
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col p-0" aria-label="Cinco ocorrências mais recentes">
        {latest.map((o, i) => (
          <li key={o.seq} className="h-[38px] flex-none border-b border-line">
            <button className="row-hover flex h-full w-full items-center gap-2 px-3 text-left" onClick={() => selectRegion(o.regionId)} aria-label={`${o.type}, ${o.time}, Região ${nameOf(o.regionId)}`}>
              <Icon name={icons[o.typeIndex]} size={15} className="flex-none text-t2" />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">{o.type}</span>
              <span className="num flex-none text-[12px] text-t2">{o.time}</span>
              <span className={`pill w-[58px] flex-none justify-center ${i === 0 ? 'pill-white' : 'pill-line'}`} style={{ height: 18, padding: 0, fontWeight: i === 0 ? 700 : 500 }}>{nameOf(o.regionId)}</span>
            </button>
          </li>
        ))}
        {latest.length === 0 && <li className="flex flex-1 items-center justify-center text-[12px] text-t2">Nenhuma ocorrência até o momento.</li>}
      </ul>
    </Card>
  );
}
