import React from 'react';
import { Award, ShieldAlert, Swords, X } from 'lucide-react';
import { AttackMode, BattleReport, GameState } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface BattleReportModalProps {
  report: BattleReport | null;
  gameState: GameState;
  onClose: () => void;
}

const OUTCOME_LABELS: Record<BattleReport['outcome'], { text: string; tone: string }> = {
  decisive_victory: { text: 'Vittoria Decisiva', tone: 'text-emerald-400' },
  victory: { text: 'Operazione Riuscita', tone: 'text-cyan-300' },
  stalemate: { text: 'Scontro Equilibrato', tone: 'text-amber-300' },
  defeat: { text: 'Offensiva Respinta', tone: 'text-rose-400' },
};

const MODE_LABELS: Record<AttackMode, string> = {
  ground: 'Offensiva Terrestre',
  air_raid: 'Raid Aereo',
  amphibious: 'Assalto Anfibio',
  naval_blockade: 'Blocco Navale',
  combined: 'Attacco Combinato (Terra+Aria+Mare)',
};

export const BattleReportModal: React.FC<BattleReportModalProps> = ({
  report,
  gameState,
  onClose,
}) => {
  if (!report) return null;

  const attacker = gameState.nations[report.attackerId];
  const defender = gameState.nations[report.defenderId];
  const outcome = OUTCOME_LABELS[report.outcome];
  const controlDelta = report.controlAfter - report.controlBefore;
  const modeLabel = MODE_LABELS[report.attackMode ?? 'ground'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rapporto di Battaglia"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[86dvh] bg-[#0D1524] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {report.annexed ? (
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
            ) : report.outcome === 'defeat' ? (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Swords className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-wide text-slate-50 leading-none truncate">
                Rapporto di Battaglia
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 whitespace-normal">
                {report.dateLabel} · {modeLabel}
                {typeof report.distanceKm === 'number' ? ` · ${report.distanceKm} km` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi rapporto"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 sm:bg-transparent text-slate-200 sm:text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-5 space-y-4">
          <div className="text-center space-y-1">
            <div className={`font-display text-2xl font-bold tracking-wide ${outcome.tone}`}>
              {report.annexed ? `Annessione di ${report.defenderName}` : outcome.text}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
              {report.summary}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center gap-2">
                {attacker && <FlagBanner flag={attacker.flag} name={attacker.name} size="sm" />}
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">Attaccante</div>
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {report.attackerName}
                  </div>
                </div>
              </div>
              <div className="text-xs flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Forza Effettiva</span>
                <span className="font-mono-num font-semibold text-cyan-300">
                  {report.attackerEffectivePower}
                </span>
              </div>
              <div className="text-[11px] text-rose-300 space-y-0.5 font-mono-num">
                {report.attackerLosses.ground > 0 && (
                  <div>Terrestri: -{report.attackerLosses.ground}</div>
                )}
                {report.attackerLosses.air > 0 && (
                  <div>Aviazione: -{report.attackerLosses.air}</div>
                )}
                {report.attackerLosses.navy > 0 && (
                  <div>Marina: -{report.attackerLosses.navy}</div>
                )}
                {report.attackerLosses.ground === 0 &&
                  report.attackerLosses.air === 0 &&
                  report.attackerLosses.navy === 0 && (
                    <div className="text-emerald-400">Nessuna perdita</div>
                  )}
              </div>
            </div>

            <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-2">
              <div className="flex items-center gap-2">
                {defender && <FlagBanner flag={defender.flag} name={defender.name} size="sm" />}
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">Difensore</div>
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {report.defenderName}
                  </div>
                </div>
              </div>
              <div className="text-xs flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Forza Difensiva</span>
                <span className="font-mono-num font-semibold text-amber-300">
                  {report.defenderEffectivePower}
                </span>
              </div>
              <div className="text-[11px] text-rose-300 space-y-0.5 font-mono-num">
                {report.defenderLosses.ground > 0 && (
                  <div>Terrestri: -{report.defenderLosses.ground}</div>
                )}
                {report.defenderLosses.air > 0 && (
                  <div>Aviazione: -{report.defenderLosses.air}</div>
                )}
                {report.defenderLosses.navy > 0 && (
                  <div>Marina: -{report.defenderLosses.navy}</div>
                )}
                {report.defenderLosses.defense > 0 && (
                  <div>Difese: -{report.defenderLosses.defense}</div>
                )}
                {report.fundsDamaged && report.fundsDamaged > 0 && (
                  <div className="text-amber-300">Fondi distrutti: -{report.fundsDamaged} B$</div>
                )}
              </div>
            </div>
          </div>

          {report.blockadeImposed && (
            <div className="rounded-md bg-cyan-950/45 border border-cyan-500/40 px-3 py-2 text-xs text-cyan-200 whitespace-normal">
              Blocco Navale imposto con successo: le entrate PIL di {report.defenderName} sono
              ridotte del 28% per i prossimi 4 mesi.
            </div>
          )}

          <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Controllo Territoriale su {report.defenderName}</span>
              <span className="font-mono-num font-semibold text-cyan-300">
                {report.controlBefore}% → {report.controlAfter}%{' '}
                {controlDelta > 0 && <span className="text-emerald-400">(+{controlDelta}%)</span>}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  report.annexed ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, report.controlAfter))}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            Torna alla Mappa Operativa
          </button>
        </div>
      </div>
    </div>
  );
};
