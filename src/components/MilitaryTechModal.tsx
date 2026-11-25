import React, { useState } from 'react';
import {
  Anchor,
  Check,
  Clock,
  Cpu,
  HeartPulse,
  Plane,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { BRANCH_INFO, TECHNOLOGIES } from '../data/technologies';
import {
  getControlledProvinces,
  getMonthlyEconomy,
  getRecruitmentCost,
  round1,
  roundInt,
} from '../engine/helpers';
import { ArmyBranch, GameState, TechId } from '../types/game';

interface MilitaryTechModalProps {
  open: boolean;
  gameState: GameState;
  feedbackMessage: { text: string; tone: 'info' | 'error' } | null;
  onClose: () => void;
  onRecruit: (branch: ArmyBranch, amount: number) => void;
  onStartResearch: (techId: TechId) => void;
  onStabilize: () => void;
}

const BRANCH_ORDER: ArmyBranch[] = ['ground', 'air', 'navy', 'defense'];

const BRANCH_ICONS: Record<ArmyBranch, React.ReactNode> = {
  ground: <Users className="w-4 h-4 text-cyan-400" />,
  air: <Plane className="w-4 h-4 text-sky-400" />,
  navy: <Anchor className="w-4 h-4 text-indigo-400" />,
  defense: <Shield className="w-4 h-4 text-emerald-400" />,
};

export const MilitaryTechModal: React.FC<MilitaryTechModalProps> = ({
  open,
  gameState,
  feedbackMessage,
  onClose,
  onRecruit,
  onStartResearch,
  onStabilize,
}) => {
  const [tab, setTab] = useState<'army' | 'tech'>('army');
  if (!open) return null;

  const player = gameState.nations[gameState.playerId];
  const eco = getMonthlyEconomy(gameState, gameState.playerId);
  const hasCoast = getControlledProvinces(gameState, player.id).some((p) => p.coastal);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comando Esercito e Ricerca Tecnologica"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] bg-[#0D1524] border border-slate-700/80 rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none">
              Comando Militare & Ricerca
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Fondi: <strong className="font-mono-num text-amber-300">{round1(player.funds)} B$</strong>
              <span aria-hidden="true"> · </span>
              Manodopera:{' '}
              <strong className="font-mono-num text-cyan-300">{roundInt(player.manpower)}k</strong>
              <span aria-hidden="true"> · </span>
              Mantenimento:{' '}
              <strong className="font-mono-num text-rose-300">-{eco.upkeep} B$/mese</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setTab('army')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'army'
                    ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Forze Armate (4)</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('tech')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  tab === 'tech'
                    ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Tecnologie ({player.researchedTechs.length}/{TECHNOLOGIES.length})</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline feedback */}
        {feedbackMessage && (
          <div
            className={`mx-5 mt-3 rounded-md px-3 py-2 text-xs border ${
              feedbackMessage.tone === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-100'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'army' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BRANCH_ORDER.map((branch) => {
                  const spec = BRANCH_INFO[branch];
                  const count = roundInt(player.army[branch]);
                  const cost5 = getRecruitmentCost(player, branch, 5);
                  const cost10 = getRecruitmentCost(player, branch, 10);
                  const cost25 = getRecruitmentCost(player, branch, 25);
                  const cost50 = getRecruitmentCost(player, branch, 50);
                  const navyBlocked = branch === 'navy' && !hasCoast;

                  return (
                    <div
                      key={branch}
                      className="rounded-lg bg-slate-900/75 border border-slate-800 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {BRANCH_ICONS[branch]}
                            <div>
                              <h3 className="text-sm font-semibold text-slate-100">{spec.name}</h3>
                              <p className="text-[11px] text-cyan-300/90">{spec.role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono-num text-xl font-bold text-slate-50 leading-none">
                              {count}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">unità attive</div>
                          </div>
                        </div>

                        <p className="mt-2.5 text-xs text-slate-400 leading-relaxed whitespace-normal">
                          {spec.description}
                        </p>
                      </div>

                      {navyBlocked ? (
                        <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/25 rounded-md px-3 py-2">
                          Serve almeno un territorio costiero per costruire unità navali.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
                          {[
                            { amount: 5, cost: cost5 },
                            { amount: 10, cost: cost10 },
                            { amount: 25, cost: cost25 },
                            { amount: 50, cost: cost50 },
                          ].map(({ amount, cost }) => {
                            const canAfford =
                              player.funds >= cost.funds && player.manpower >= cost.manpower;
                            return (
                              <button
                                key={amount}
                                type="button"
                                disabled={!canAfford}
                                onClick={() => onRecruit(branch, amount)}
                                className="flex flex-col items-center justify-center py-2 px-1.5 rounded-md bg-slate-800/90 hover:bg-cyan-950/70 hover:border-cyan-500/40 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/70 transition-colors cursor-pointer"
                              >
                                <span className="text-xs font-semibold text-slate-100">
                                  +{amount}
                                </span>
                                <span className="font-mono-num text-[10px] text-amber-300 mt-0.5 whitespace-nowrap">
                                  {cost.funds} B$ · {cost.manpower}k
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Domestic Stability Investment */}
              <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Investimento in Coesione e Stabilità Interna
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                      Aumenta subito la Stabilità di +10% (attuale: {roundInt(player.stability)}%),
                      riducendo le rivolte post-annessione e migliorando gettito PIL e morale.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={player.funds < 24 || player.stability >= 98}
                  onClick={onStabilize}
                  className="px-4 py-2.5 rounded-md text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 disabled:opacity-40 border border-emerald-500/40 text-emerald-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Stabilizza (+10%) · 24 B$
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {player.activeResearch && (
                <div className="rounded-lg bg-amber-950/30 border border-amber-500/35 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-xs">
                      <span className="text-amber-200 font-semibold">
                        Ricerca in corso:{' '}
                        {TECHNOLOGIES.find((t) => t.id === player.activeResearch?.techId)?.name}
                      </span>
                      <span className="text-slate-300 ml-2">
                        ({player.activeResearch.turnsRemaining}{' '}
                        {player.activeResearch.turnsRemaining === 1 ? 'mese' : 'mesi'} rimanenti)
                      </span>
                    </div>
                  </div>
                  <div className="w-28 h-2 rounded-full bg-slate-900 overflow-hidden shrink-0">
                    <div
                      className="h-full bg-amber-400"
                      style={{
                        width: `${Math.round(
                          ((player.activeResearch.totalTurns -
                            player.activeResearch.turnsRemaining) /
                            Math.max(1, player.activeResearch.totalTurns)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {TECHNOLOGIES.map((tech) => {
                  const completed = player.researchedTechs.includes(tech.id);
                  const inProgress = player.activeResearch?.techId === tech.id;
                  const canStart =
                    !completed && !player.activeResearch && player.funds >= tech.cost;

                  return (
                    <div
                      key={tech.id}
                      className={`rounded-lg p-4 border flex flex-col justify-between gap-3 ${
                        completed
                          ? 'bg-emerald-950/25 border-emerald-500/35'
                          : inProgress
                            ? 'bg-amber-950/25 border-amber-500/45'
                            : 'bg-slate-900/75 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-100">{tech.name}</h3>
                          {completed ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 shrink-0">
                              <Check className="w-3.5 h-3.5" />
                              Attiva
                            </span>
                          ) : inProgress ? (
                            <span className="font-mono-num text-[11px] font-semibold text-amber-300 shrink-0">
                              -{player.activeResearch?.turnsRemaining} mesi
                            </span>
                          ) : (
                            <span className="font-mono-num text-[11px] text-slate-400 shrink-0">
                              {tech.cost} B$ · {tech.turns} mesi
                            </span>
                          )}
                        </div>

                        <div className="mt-1 text-xs font-medium text-cyan-300 whitespace-normal">
                          {tech.shortBonus}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed whitespace-normal">
                          {tech.description}
                        </p>
                      </div>

                      {!completed && !inProgress && (
                        <button
                          type="button"
                          disabled={!canStart}
                          onClick={() => onStartResearch(tech.id)}
                          className="w-full py-2 px-3 rounded-md text-xs font-semibold bg-slate-800 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 transition-colors cursor-pointer"
                        >
                          {player.activeResearch
                            ? 'Attendi fine ricerca corrente'
                            : player.funds < tech.cost
                              ? `Servono ${tech.cost} B$`
                              : `Avvia Ricerca (${tech.cost} B$)`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
