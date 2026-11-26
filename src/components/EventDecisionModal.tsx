import React from 'react';
import { Globe2, Landmark, MinusCircle, PlusCircle } from 'lucide-react';
import { GameEvent, GameState } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface EventDecisionModalProps {
  event: GameEvent | null;
  gameState: GameState;
  onChoose: (choiceId: string) => void;
}

export const EventDecisionModal: React.FC<EventDecisionModalProps> = ({
  event,
  gameState,
  onChoose,
}) => {
  if (!event) return null;

  const isCouncil = event.kind === 'world_council';
  const involvedNation = event.involvedNationId
    ? gameState.nations[event.involvedNationId]
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4"
    >
      <div className="w-full sm:max-w-2xl max-h-[90dvh] bg-[#0D1524] border-t sm:border border-slate-700/85 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Mobile drag handle indicator */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Fixed Header */}
        <div className="px-4 sm:px-6 pt-3.5 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span
              className={`inline-flex items-center gap-1.5 ${
                isCouncil ? 'text-cyan-300' : 'text-amber-300'
              }`}
            >
              {isCouncil ? (
                <Globe2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Landmark className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{isCouncil ? 'Consiglio Mondiale' : 'Decisione di Governo'}</span>
            </span>
            <span className="font-mono-num text-slate-400 normal-case">{event.dateLabel}</span>
          </div>

          <div className="mt-2 flex items-start gap-3">
            {involvedNation && (
              <FlagBanner
                flag={involvedNation.flag}
                name={involvedNation.name}
                size="md"
                className="mt-0.5 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-slate-50 leading-tight whitespace-normal">
                {event.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1 whitespace-normal">{event.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Narrative + Choices */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-normal">
            {event.description}
          </p>

          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Scegli la linea d’azione
            </div>

            {event.choices.map((choice) => {
              const borderHover =
                choice.tone === 'aggressive'
                  ? 'hover:border-rose-400/60 hover:bg-rose-950/25'
                  : choice.tone === 'diplomatic'
                    ? 'hover:border-cyan-400/60 hover:bg-cyan-950/25'
                    : choice.tone === 'economic'
                      ? 'hover:border-amber-400/60 hover:bg-amber-950/25'
                      : 'hover:border-slate-500 hover:bg-slate-800/80';

              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose(choice.id)}
                  className={`w-full min-h-[56px] text-left rounded-xl bg-slate-900/85 border border-slate-700/80 p-3.5 sm:p-4 transition-colors cursor-pointer space-y-2 ${borderHover}`}
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-100 whitespace-normal">
                      {choice.label}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed whitespace-normal">
                      {choice.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/90 text-[11px]">
                    <div className="flex items-start gap-1.5 text-emerald-300 whitespace-normal">
                      <PlusCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                      <span>
                        <strong className="font-semibold">Pro:</strong> {choice.pros}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-rose-300 whitespace-normal">
                      <MinusCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                      <span>
                        <strong className="font-semibold">Contro:</strong> {choice.cons}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
