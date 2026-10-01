import { forwardRef, type CSSProperties, type ReactNode } from 'react';
import type { LevelIndex } from '../engine/types';
import { LEVELS, levelColor, levelTint } from '../lib/levels';
import { Icon, type IconName } from './icons';

/** Card com borda de 1px, raio de 2px e marcas em L nos quatro cantos. */
export const Card = forwardRef<HTMLElement, { className?: string; style?: CSSProperties; children: ReactNode; label?: string; tabIndex?: number }>(
  function Card({ className = '', style, children, label, tabIndex }, ref) {
    return (
      <section ref={ref} className={`card ${className}`} style={style} aria-label={label} tabIndex={tabIndex}>
        <i className="lm lm-tl" /><i className="lm lm-tr" /><i className="lm lm-bl" /><i className="lm lm-br" />
        {children}
      </section>
    );
  }
);

export function CardHead({ icon, title, sub, right }: { icon: IconName; title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="card-head">
      <Icon name={icon} size={16} className="text-t2" />
      <div className="flex min-w-0 flex-col justify-center whitespace-nowrap">
        <h2 className="t-title m-0 text-[12px]">{title}</h2>
        {sub && <span className="text-[10px] leading-3 text-t3">{sub}</span>}
      </div>
      <div className="ml-auto flex flex-none items-center gap-2 whitespace-nowrap">{right}</div>
    </header>
  );
}

/** Forma do nível: círculo, triângulo, losango, octógono. Cor + forma (nunca só cor). */
export function LevelIcon({ level, size = 12, color, outline }: { level: LevelIndex; size?: number; color?: string; outline?: boolean }) {
  const fill = color ?? levelColor(level);
  const o = outline ? { stroke: '#0a0a0a', strokeWidth: 0.9 } : {};
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      {level === 0 && <circle cx="5" cy="5" r="4.4" fill={fill} {...o} />}
      {level === 1 && <polygon points="5,0.5 9.7,9.2 0.3,9.2" fill={fill} {...o} />}
      {level === 2 && <polygon points="5,0.2 9.8,5 5,9.8 0.2,5" fill={fill} {...o} />}
      {level === 3 && <polygon points="3,0.2 7,0.2 9.8,3 9.8,7 7,9.8 3,9.8 0.2,7 0.2,3" fill={fill} {...o} />}
    </svg>
  );
}

/** Pílula do nível: ícone + nome em caixa-alta, contorno e tinta (16%) na cor do nível. */
export function LevelPill({ level }: { level: LevelIndex }) {
  return (
    <span className="pill" style={{ border: `1px solid ${levelColor(level)}`, background: levelTint(level) }}>
      <LevelIcon level={level} size={10} />
      <span className="t-level" style={{ color: '#f5f5f5' }}>{LEVELS[level].name}</span>
    </span>
  );
}

/** Barra pontilhada de 10 segmentos. */
export function DotBar({ value, max, color = '#f5f5f5', segments = 10 }: { value: number; max: number; color?: string; segments?: number }) {
  let filled = Math.round((value / max) * segments);
  if (value > 0 && filled === 0) filled = 1;
  return (
    <span className="flex gap-[2px]" role="img" aria-label={`${filled} de ${segments}`}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} style={{ width: 5, height: 8, borderRadius: 1, background: i < filled ? color : '#2a2a2a' }} />
      ))}
    </span>
  );
}

/**
 * Variação: a seta mostra a direção numérica; a cor mostra se é bom ou ruim.
 * Piora = âmbar, melhora = verde, sem mudança = cinza (inverso da imagem de tema).
 */
export function deltaTone(delta: number, worseWhen: 'up' | 'down'): 'piora' | 'melhora' | 'neutra' {
  if (delta === 0) return 'neutra';
  return (delta > 0) === (worseWhen === 'up') ? 'piora' : 'melhora';
}
export const toneColor = (t: 'piora' | 'melhora' | 'neutra'): string => `var(--variacao-${t})`;

export function Arrow({ delta, size = 12 }: { delta: number; size?: number }) {
  if (delta > 0) return <Icon name="arrowUp" size={size} strokeWidth={2} />;
  if (delta < 0) return <Icon name="arrowDown" size={size} strokeWidth={2} />;
  return <Icon name="arrowRight" size={size} strokeWidth={2} />;
}

export function Tip({ text, children, side = 'top', className = '' }: { text: string; children: ReactNode; side?: 'top' | 'right' | 'below'; className?: string }) {
  const cls = side === 'right' ? 'tip tip-right' : side === 'below' ? 'tip tip-below' : 'tip';
  return (
    <span className={`${cls} ${className}`}>
      {children}
      <span className="tip-bubble" role="tooltip">{text}</span>
    </span>
  );
}

/** Quadrados de equipe: preenchido = ocupada, vazado = livre. */
export function TeamSquares({ total, free, size = 12, gap = 3 }: { total: number; free: number; size?: number; gap?: number }) {
  return (
    <span className="flex" style={{ gap }} role="img" aria-label={`${free} de ${total} equipes livres`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ width: size, height: size, border: '1.5px solid #f5f5f5', borderRadius: 1, background: i < total - free ? '#f5f5f5' : 'transparent' }} />
      ))}
    </span>
  );
}
