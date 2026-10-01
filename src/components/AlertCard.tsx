import { useEffect, useRef } from 'react';
import type { AlertInfo } from '../engine/derived';
import type { LevelIndex } from '../engine/types';
import { levelColor, levelTint } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { Icon, type IconName } from './icons';
import { Card, CardHead, LevelIcon } from './ui';

const MARKER_ICON: Record<string, IconName> = {
  'Demanda em alta': 'arrowUp',
  'Recursos em queda': 'arrowDown',
  'Chuva intensa': 'rain',
  'Calor extremo': 'thermo',
  'Vulnerabilidade elevada': 'shield'
};

function AlertBox({ a, compact }: { a: AlertInfo; compact: boolean }) {
  const { model, selectRegion } = useApp();
  const region = model.regions.find((r) => r.id === a.regionId)!;
  const level: LevelIndex = model.cur.regions[a.regionId].level;
  const sat = a.kind === 'esgotada';
  const minutes = `${a.etaMinutes} ${a.etaMinutes === 1 ? 'minuto' : 'minutos'}`;
  const markers = a.markers.length > 0 && (
    <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0" aria-label="Tendência">
      {!compact && <li className="mr-0.5 flex items-center gap-1 text-[10.5px] text-t2"><Icon name="trending" size={12} />Tendência</li>}
      {a.markers.map((m) => (
        <li key={m} className="inline-flex h-[18px] items-center gap-1 border border-line2 px-1.5 text-[10.5px] leading-[14px] text-t1" style={{ borderRadius: 999 }}>
          {!compact && <Icon name={MARKER_ICON[m] ?? 'info'} size={10} strokeWidth={2} />}{m}
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`flex flex-none flex-col border ${compact ? 'gap-1 p-1.5' : 'gap-2 p-2.5'}`} style={{ borderColor: levelColor(level), background: levelTint(level), borderRadius: 2 }}>
      <button
        className="flex w-full items-center gap-2.5 text-left" onClick={() => selectRegion(a.regionId)}
        aria-label={`${sat ? 'Saturação operacional' : 'Possível saturação operacional'}: ${sat ? `capacidade esgotada na Região ${region.name}` : `Região ${region.name} em aproximadamente ${minutes}`}. Selecionar a região.`}
      >
        <span className={`flex flex-none items-center justify-center border ${compact ? 'h-7 w-7' : 'h-9 w-9'}`} style={{ borderColor: levelColor(level), borderRadius: 999, color: '#f5f5f5' }}>
          {sat ? <LevelIcon level={3} size={compact ? 12 : 15} color="#f5f5f5" /> : <Icon name="clock" size={compact ? 14 : 18} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-4">
          <b className="text-[13px] font-semibold">{sat ? 'Saturação operacional' : 'Possível saturação operacional'}</b>
          {sat ? (
            <span className="text-[12px] text-t2">Capacidade esgotada na <b className="font-semibold text-t1">Região {region.name}</b></span>
          ) : compact ? (
            <span className="text-[12px] text-t2">Região {region.name} em aproximadamente <b className="font-semibold text-t1">{minutes}</b></span>
          ) : (
            <>
              <span className="text-[12px] text-t2">Região {region.name} em aproximadamente</span>
              <b className="text-[18px] font-semibold leading-6 text-t1">{minutes}</b>
            </>
          )}
        </span>
        <Icon name="right" size={14} className="flex-none text-t2" />
      </button>
      {markers}
    </div>
  );
}

export function AlertCard() {
  const { model, registerCard, hazard } = useApp();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { registerCard('alerta', ref.current); return () => registerCard('alerta', null); }, [registerCard]);
  const alerts = model.alerts;
  const top = alerts[0];
  const hazardWord = hazard === 'chuva' ? 'chuva' : 'calor';

  return (
    <Card ref={ref} tabIndex={-1} label="Alerta operacional" className="flex min-h-0 flex-col">
      <CardHead
        icon="alert" title="Alerta operacional"
        right={top && (
          <span className="pill" style={{ border: `1px solid ${top.priority === 'Crítica' ? 'var(--nivel-critico)' : 'var(--nivel-elevado)'}`, background: top.priority === 'Crítica' ? levelTint(3) : levelTint(2), color: '#f5f5f5', height: 20 }}>
            <LevelIcon level={top.priority === 'Crítica' ? 3 : 2} size={9} />
            <span className="sr-only">Prioridade </span>{top.priority}
          </span>
        )}
      />
      <div className="scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2" role="status" aria-live="polite" aria-atomic="false">
        {alerts.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
            <span className="flex h-9 w-9 items-center justify-center border border-line2 text-t2" style={{ borderRadius: 999 }}><Icon name="check" size={18} /></span>
            <b className="text-[13px] font-semibold">Nenhum alerta ativo</b>
            <span className="text-[12px] text-t2">A situação está dentro da capacidade.</span>
            <span className="sr-only">Monitorando {hazardWord} em quatro regiões.</span>
          </div>
        )}
        {alerts.map((a) => <AlertBox key={a.regionId} a={a} compact={alerts.length > 1} />)}
        {model.lead !== null && (
          <span className="pill pill-line mt-auto self-start" style={{ height: 22 }}>
            <Icon name="clock" size={12} />Antecedência do primeiro alerta: <span className="num">{model.lead} min</span>
          </span>
        )}
      </div>
    </Card>
  );
}
