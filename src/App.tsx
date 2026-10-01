import { useEffect, useState } from 'react';
import { AlertCard } from './components/AlertCard';
import { ConditionsCard } from './components/ConditionsCard';
import { KpiRow } from './components/KpiRow';
import { MapCard } from './components/MapCard';
import { OccurrencesCard } from './components/OccurrencesCard';
import { PanelHost } from './components/Panels';
import { Patterns } from './components/Patterns';
import { PressureEvolution } from './components/PressureEvolution';
import { RegionDetails } from './components/RegionDetails';
import { RegionsCard } from './components/RegionsCard';
import { ReplayBar } from './components/ReplayBar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AppProvider, useApp } from './state/AppContext';

const W = 1440, H = 900;

/** Escala o quadro de 1440×900 de forma uniforme para caber na janela. */
function useFrameScale(): number {
  const calc = () => Math.min(window.innerWidth / W, window.innerHeight / H);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

function Skeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Carregando cenário">
      <div className="grid grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 84 }} />)}</div>
      <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '264px minmax(0,1fr) 340px' }}>
        <div className="flex flex-col gap-3"><div className="skeleton" style={{ height: 244 }} /><div className="skeleton flex-1" /></div>
        <div className="skeleton" /><div className="skeleton" />
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: '4fr 3fr 3fr', height: 228 }}>{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>
    </div>
  );
}

function Dashboard() {
  const { loading, fullscreen, setFullscreen } = useApp();
  useEffect(() => {
    if (!fullscreen) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(null); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [fullscreen, setFullscreen]);

  return (
    <main className="relative flex min-w-0 flex-1 flex-col gap-3 p-3" aria-label="Painel de operações">
      <h1 className="sr-only">StormOps Franca: painel de operações da Defesa Civil</h1>
      {loading ? <Skeleton /> : (
        <div className="flex min-h-0 flex-1 flex-col gap-3" aria-hidden={fullscreen ? true : undefined}>
          <KpiRow />
          <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '264px minmax(0,1fr) 340px' }}>
            <div className="flex min-h-0 flex-col gap-3"><RegionsCard /><ConditionsCard /></div>
            <MapCard />
            <RegionDetails />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: '4fr 3fr 3fr', height: 228 }}>
            <PressureEvolution />
            <AlertCard />
            <OccurrencesCard />
          </div>
        </div>
      )}
      <ReplayBar />

      {fullscreen && (
        <div className="absolute inset-x-3 top-3 z-30 flex flex-col bg-base" style={{ bottom: 12 + 52 + 12 }}>
          {fullscreen === 'mapa' ? <MapCard expanded /> : <PressureEvolution expanded />}
        </div>
      )}
      <PanelHost />
    </main>
  );
}

export function App() {
  const scale = useFrameScale();
  return (
    <AppProvider>
      <Patterns />
      <div className="fixed inset-0 overflow-hidden bg-base">
        <div
          className="absolute left-1/2 top-1/2 flex flex-col bg-base text-t1"
          style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          <TopBar />
          <div className="flex min-h-0 flex-1">
            <Sidebar />
            <Dashboard />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
