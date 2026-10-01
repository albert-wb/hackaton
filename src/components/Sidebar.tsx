import { useApp, type NavKey } from '../state/AppContext';
import { Icon, Logo, type IconName } from './icons';
import { Tip } from './ui';

const ITEMS: Array<{ key: NavKey; label: string; icon: IconName; off?: boolean }> = [
  { key: 'visao', label: 'Visão geral', icon: 'home' },
  { key: 'mapa', label: 'Mapa operacional', icon: 'map' },
  { key: 'evolucao', label: 'Evolução temporal', icon: 'chart' },
  { key: 'regioes', label: 'Regiões', icon: 'layers' },
  { key: 'ocorrencias', label: 'Ocorrências', icon: 'list' },
  { key: 'recursos', label: 'Recursos', icon: 'box' },
  { key: 'relatorios', label: 'Relatórios', icon: 'doc', off: true },
  { key: 'config', label: 'Configurações', icon: 'gear', off: true }
];

export function Sidebar() {
  const { nav, navigate, setPanel, panel, providerLabel } = useApp();
  return (
    <aside className="flex w-[184px] flex-none flex-col justify-between border-r border-line bg-base p-3" aria-label="Navegação">
      <nav className="flex flex-col gap-1">
        {ITEMS.map((it) => {
          const active = it.key === nav && !it.off;
          const btn = (
            <button
              key={it.key}
              aria-current={active ? 'page' : undefined}
              aria-disabled={it.off || undefined}
              onClick={() => (it.off ? undefined : navigate(it.key))}
              className={`flex h-[34px] w-full items-center gap-2 whitespace-nowrap px-2 text-left text-[13px] ${it.off ? 'cursor-not-allowed text-t3' : active ? 'bg-s3 font-medium text-t1' : 'text-t2 hover:bg-s2 hover:text-t1'}`}
              style={{ borderRadius: 2, transition: 'background 200ms ease-out, color 200ms ease-out' }}
            >
              <Icon name={it.icon} size={16} />{it.label}
            </button>
          );
          return it.off
            ? <Tip key={it.key} text="Fora do escopo do protótipo" side="right" className="block w-full">{btn}</Tip>
            : btn;
        })}
      </nav>

      <div className="card flex flex-col gap-2 p-3">
        <i className="lm lm-tl" /><i className="lm lm-tr" /><i className="lm lm-bl" /><i className="lm lm-br" />
        <div className="flex items-center gap-2"><Logo size={22} /><b className="text-[13px] font-semibold">StormOps</b></div>
        <p className="m-0 text-[11px] leading-[15px] text-t2">Inteligência a serviço da resposta. Antecipe pressões.</p>
        <div className="border-t border-line pt-2">
          <span className="t-micro">Fonte de dados</span>
          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] leading-4"><span className="h-[6px] w-[6px] rounded-full bg-t1" aria-hidden="true" />{providerLabel}</div>
        </div>
        <button className="flex items-center gap-1 text-left text-[12px] text-t1 underline" aria-expanded={panel === 'como'} onClick={() => setPanel('como')}>
          Como funciona <Icon name="arrowRight" size={12} />
        </button>
      </div>
    </aside>
  );
}
