import { Crown, Mic } from 'lucide-react';
import type { TeamId } from '../game/types';
import { LifelineBadge } from './LifelineButton';

interface Props {
  team: TeamId;
  name: string;
  score: number;
  lifelineUsed: boolean;
  /** 'answering' | 'steal' when this team currently holds the floor. */
  role: 'answering' | 'steal' | null;
  /** True when this team won the last question (flash). */
  scored?: boolean;
  size: 'teacher' | 'display';
}

export function TeamScoreboard({ team, name, score, lifelineUsed, role, size }: Props) {
  const big = size === 'display';
  const active = role !== null;
  return (
    <section
      aria-label={`${name} score ${score}`}
      className={`panel flex flex-col items-center justify-center text-center transition-shadow ${big ? 'gap-0.5 p-1.5' : 'gap-1.5 p-3'} ${
        active ? 'border-gold-400 shadow-[0_0_36px_rgba(248,210,74,0.45)]' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span className="chip border-gold-500/60 bg-navy-900 text-gold-300">TEAM {team}</span>
        <h2 className={`max-w-full break-words font-bold text-white ${big ? 'text-[clamp(1.1rem,min(2.2vw,3.4vh),2.4rem)]' : 'text-2xl'}`}>{name}</h2>
        {role && (
          <span className="chip border-gold-300 bg-gold-400 text-navy-950">
            <Mic aria-hidden className="h-4 w-4" />
            {role === 'steal' ? 'STEAL' : 'ANSWERING'}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        <div
          className={`flex items-center gap-2 font-display tabular-nums text-gold-400 ${big ? 'text-[clamp(2rem,min(5.2vw,8vh),5rem)]' : 'text-6xl'} leading-none`}
          aria-hidden
        >
          <Crown className={big ? 'h-[0.5em] w-[0.5em]' : 'h-8 w-8'} />
          {score}
        </div>
        <LifelineBadge used={lifelineUsed} big={big} />
      </div>
    </section>
  );
}
