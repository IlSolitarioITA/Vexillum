import React from 'react';
import { BookOpen, ChevronRight, Newspaper, Shield } from 'lucide-react';

interface MobileBottomDockProps {
  canAdvanceTurn: boolean;
  newsCount: number;
  militaryOpen: boolean;
  newsOpen: boolean;
  helpOpen: boolean;
  onOpenMilitary: () => void;
  onToggleNews: () => void;
  onOpenHelp: () => void;
  onNextTurn: () => void;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  canAdvanceTurn,
  newsCount,
  militaryOpen,
  newsOpen,
  helpOpen,
  onOpenMilitary,
  onToggleNews,
  onOpenHelp,
  onNextTurn,
}) => {
  return (
    <nav
      aria-label="Navigazione principale mobile"
      className="md:hidden shrink-0 z-30 w-full bg-[#0B1220] border-t border-slate-800/90 px-2.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Section navigation buttons */}
        <div className="grid grid-cols-3 gap-1 flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpenMilitary}
            aria-pressed={militaryOpen}
            className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              militaryOpen
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-300 hover:text-white active:bg-slate-800/90'
            }`}
          >
            <Shield className="w-[18px] h-[18px] text-cyan-400 shrink-0" />
            <span className="text-[11px] font-medium leading-none whitespace-nowrap">Governo</span>
          </button>

          <button
            type="button"
            onClick={onToggleNews}
            aria-pressed={newsOpen}
            className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              newsOpen
                ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                : 'text-slate-300 hover:text-white active:bg-slate-800/90'
            }`}
          >
            <Newspaper className="w-[18px] h-[18px] text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium leading-none whitespace-nowrap">
              Cronaca ({newsCount})
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            aria-pressed={helpOpen}
            className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              helpOpen
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-300 hover:text-white active:bg-slate-800/90'
            }`}
          >
            <BookOpen className="w-[18px] h-[18px] text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium leading-none whitespace-nowrap">Guida</span>
          </button>
        </div>

        <div aria-hidden="true" className="h-8 w-px bg-slate-800 shrink-0" />

        {/* Dedicated Primary CTA: Prossimo Turno */}
        <button
          type="button"
          onClick={onNextTurn}
          disabled={!canAdvanceTurn}
          className="min-h-[46px] px-3.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-45 shadow-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Prossimo Turno</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </nav>
  );
};
