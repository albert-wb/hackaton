import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../lib/hooks';
import { STEP_COUNT } from '../engine/pressure';
import { stepClock } from '../engine/derived';
import { useApp } from '../state/AppContext';
import { Icon, Logo } from './icons';

export function TopBar() {
  const { hazard, setHazard, step, model, focusCard } = useApp();
  const [nino, setNino] = useState(false);
  const [prof, setProf] = useState(false);
  const ninoRef = useRef<HTMLDivElement>(null);
  const profRef = useRef<HTMLDivElement>(null);
  useDismiss(ninoRef, nino, useCallback(() => setNino(false), []));
  useDismiss(profRef, prof, useCallback(() => setProf(false), []));
  const alerts = model.events.length;

  return (
    <header className="relative z-50 flex h-[56px] flex-none items-center justify-between border-b border-line bg-base px-4">
      <div className="flex flex-none flex-col justify-center gap-[2px]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-t1"><Logo size={26} /><span className="text-[17px] font-semibold leading-5 tracking-[-0.01em]">StormOps</span></span>
          <span className="h-4 w-px bg-line2" aria-hidden="true" />
          <span className="flex items-center gap-1 text-t2"><Icon name="pin" size={14} /><span className="text-[12px] font-medium leading-4 tracking-[0.04em] text-t1">FRANCA / SP</span></span>
        </div>
        <span className="t-micro leading-[14px]">Sistema de apoio à coordenação de emergências municipais</span>
      </div>

      <div className="seg ml-8 mr-auto flex-none" role="tablist" aria-label="Perigo monitorado">
        <button role="tab" aria-selected={hazard === 'chuva'} onClick={() => setHazard('chuva')} className="flex items-center gap-1.5"><Icon name="rain" size={14} />Chuva</button>
        <button role="tab" aria-selected={hazard === 'calor'} onClick={() => setHazard('calor')} className="flex items-center gap-1.5"><Icon name="thermo" size={14} />Calor</button>
      </div>

      <div className="flex flex-none items-center gap-3">
        <div className="pill" style={{ border: '1px solid var(--nivel-atencao)', color: '#f5f5f5', height: 24 }} role="status">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: 'var(--nivel-atencao)' }} aria-hidden="true" />
          <span><b className="font-semibold">MODO DEMONSTRAÇÃO</b> — dados simulados</span>
        </div>

        <div className="flex items-center gap-2 border-l border-line pl-3">
          <Icon name="clock" size={16} className="text-t2" />
          <div className="flex flex-col">
            <span className="num text-[16px] font-semibold leading-5">{stepClock(step)}</span>
            <span className="t-micro">Replay do cenário · passo {step + 1} de {STEP_COUNT}</span>
          </div>
        </div>

        <div ref={ninoRef} className="relative">
          <button className="btn" aria-expanded={nino} aria-haspopup="dialog" onClick={() => setNino((v) => !v)} style={{ height: 26, borderRadius: 999 }}>
            <Icon name="info" size={14} />El Niño 2026–27
          </button>
          {nino && (
            <div role="dialog" aria-label="Contexto El Niño 2026–27" className="absolute right-0 top-[34px] z-50 w-[330px] border border-line2 bg-s2 p-3 text-[12px] leading-[17px]">
              <p className="m-0">A NOAA estimava, em setembro, mais de 90% de chance de El Niño muito forte na primavera/verão 2026–27. Um evento forte aumenta a probabilidade de extremos, mas não os garante.</p>
              <a className="mt-2 inline-flex items-center gap-1 text-t1 underline" href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noopener noreferrer">
                Fonte: NOAA/CPC <Icon name="external" size={12} />
              </a>
            </div>
          )}
        </div>

        <button
          className="relative flex h-8 w-8 items-center justify-center border border-line2 text-t1 hover:bg-s3"
          style={{ borderRadius: 2, transition: 'background 200ms ease-out' }}
          aria-label={`${alerts} alertas emitidos até agora. Ir ao card Alerta operacional`}
          onClick={() => focusCard('alerta')}
        >
          <Icon name="bell" size={16} />
          {alerts > 0 && <span className="pill pill-white num absolute -right-2 -top-2" style={{ height: 16, padding: '0 5px', fontSize: 10 }}>{alerts}</span>}
        </button>

        <div ref={profRef} className="relative">
          <button className="flex items-center gap-2 text-left" aria-expanded={prof} aria-haspopup="menu" onClick={() => setProf((v) => !v)}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 text-t1"><Icon name="user" size={16} /></span>
            <span className="flex flex-col"><span className="text-[12px] font-medium leading-4">Coordenação municipal</span><span className="t-micro">Perfil de demonstração</span></span>
            <Icon name="down" size={14} className="text-t2" />
          </button>
          {prof && (
            <div role="menu" className="absolute right-0 top-[40px] z-50 w-[250px] border border-line2 bg-s2 p-3 text-[12px] leading-[17px]">
              <b className="font-semibold">Perfil de demonstração</b>
              <p className="m-0 mt-1 text-t2">Este protótipo não tem login nem dados de pessoas ou de órgãos reais.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
