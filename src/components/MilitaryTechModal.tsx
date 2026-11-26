import React, { useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  BookOpen,
  Building2,
  Check,
  Clock,
  Cpu,
  HeartPulse,
  Landmark,
  Plane,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { getScenarioDefinition, getScenarioTechnologies } from '../data/scenarios';
import { BRANCH_INFO } from '../data/technologies';
import {
  getBudgetPolicy,
  getControlledProvinces,
  getMilitaryRating,
  getMonthlyEconomy,
  getRecruitmentCost,
  round1,
  roundInt,
} from '../engine/helpers';
import {
  ArmyBranch,
  BudgetSector,
  GameState,
  SpendingLevel,
  TechId,
} from '../types/game';

interface MilitaryTechModalProps {
  open: boolean;
  gameState: GameState;
  feedbackMessage: { text: string; tone: 'info' | 'error' } | null;
  onClose: () => void;
  onRecruit: (branch: ArmyBranch, amount: number) => void;
  onStartResearch: (techId: TechId) => void;
  onStabilize: () => void;
  onSetBudgetSector: (sector: BudgetSector, level: SpendingLevel) => void;
  onIssueWarBonds: (amount: 50 | 100) => void;
  onRepayDebt: (amount: 50 | 100) => void;
}

const BRANCH_ORDER: ArmyBranch[] = ['ground', 'air', 'navy', 'defense'];
const RECRUIT_AMOUNTS = [5, 10, 25, 50] as const;

const BRANCH_ICONS: Record<ArmyBranch, React.ReactNode> = {
  ground: <Users className="w-4 h-4 text-cyan-400" />,
  air: <Plane className="w-4 h-4 text-sky-400" />,
  navy: <Anchor className="w-4 h-4 text-indigo-400" />,
  defense: <Shield className="w-4 h-4 text-emerald-400" />,
};

interface SectorMeta {
  id: BudgetSector;
  label: string;
  barColor: string;
  accentText: string;
  icon: React.ReactNode;
  hints: Record<SpendingLevel, string>;
}

const BUDGET_SECTORS: SectorMeta[] = [
  {
    id: 'defense',
    label: 'Difesa & Armamenti',
    barColor: 'bg-cyan-400',
    accentText: 'text-cyan-300',
    icon: <Shield className="w-4 h-4 text-cyan-400 shrink-0" />,
    hints: {
      cut: 'Risparmio massimo · -10% forza in battaglia, reclutamento +12% costo',
      normal: 'Prontezza standard · costi e forza militare bilanciati',
      boosted: 'Priorità bellica · +8% forza in battaglia, reclutamento -12% costo',
    },
  },
  {
    id: 'education',
    label: 'Istruzione & Ricerca',
    barColor: 'bg-sky-400',
    accentText: 'text-sky-300',
    icon: <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />,
    hints: {
      cut: 'Libera fondi subito · Velocità ricerca 65% e crescita PIL frenata',
      normal: 'Velocità ricerca 100% · crescita strutturale stabile',
      boosted: 'Velocità ricerca 140% · accelera tecnologie e crescita del PIL',
    },
  },
  {
    id: 'welfare',
    label: 'Sanità & Welfare',
    barColor: 'bg-emerald-400',
    accentText: 'text-emerald-300',
    icon: <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0" />,
    hints: {
      cut: 'Libera fondi per le armi · Stabilità -2%/mese e alto rischio proteste',
      normal: 'Servizi essenziali garantiti · stabilità sociale in equilibrio',
      boosted: 'Coesione forte · Stabilità +2%/mese e +15% crescita manodopera',
    },
  },
  {
    id: 'infrastructure',
    label: 'Infrastrutture & Economia',
    barColor: 'bg-amber-400',
    accentText: 'text-amber-300',
    icon: <Building2 className="w-4 h-4 text-amber-400 shrink-0" />,
    hints: {
      cut: 'Taglia spese civili · -10% efficienza PIL, logistica e mantenimento peggiori',
      normal: 'Reti e logistica nazionali in regime ordinario',
      boosted: '+10% efficienza PIL, -8% mantenimento, ricostruzione post-conquista rapida',
    },
  },
];

const LEVEL_BUTTONS: Array<{ id: SpendingLevel; label: string }> = [
  { id: 'cut', label: 'Tagliato' },
  { id: 'normal', label: 'Normale' },
  { id: 'boosted', label: 'Potenziato' },
];

export const MilitaryTechModal: React.FC<MilitaryTechModalProps> = ({
  open,
  gameState,
  feedbackMessage,
  onClose,
  onRecruit,
  onStartResearch,
  onStabilize,
  onSetBudgetSector,
  onIssueWarBonds,
  onRepayDebt,
}) => {
  const [tab, setTab] = useState<'army' | 'tech' | 'economy'>('army');
  const [recruitAmount, setRecruitAmount] = useState<number>(10);

  if (!open) return null;

  const player = gameState.nations[gameState.playerId];
  const policy = getBudgetPolicy(player);
  const eco = getMonthlyEconomy(gameState, gameState.playerId);
  const militaryRating = getMilitaryRating(player);
  const hasCoast = getControlledProvinces(gameState, player.id).some((p) => p.coastal);
  const scenarioTechs = getScenarioTechnologies(gameState.scenarioId);
  const scenarioDef = getScenarioDefinition(gameState.scenarioId);

  const debtStatus =
    eco.debtToGdpPercent > 140
      ? { label: 'Allarme Spread', tone: 'text-rose-400' }
      : eco.debtToGdpPercent > 100
        ? { label: 'Soglia Critica', tone: 'text-amber-300' }
        : eco.debtToGdpPercent > 70
          ? { label: 'Sotto Osservazione', tone: 'text-cyan-300' }
          : { label: 'Sostenibile', tone: 'text-emerald-400' };

  const activeResearchMonthsLeft = player.activeResearch
    ? Math.max(1, Math.ceil(player.activeResearch.turnsRemaining))
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Comando e Governo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-4xl h-[90dvh] sm:h-auto sm:max-h-[90dvh] bg-[#0D1524] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Fixed Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none truncate">
              Comando & Governo
            </h2>
            <p className="text-xs text-slate-400 mt-1 whitespace-normal">
              Fondi: <strong className="font-mono-num text-amber-300">{round1(player.funds)} B$</strong>
              <span aria-hidden="true"> · </span>
              Saldo:{' '}
              <strong
                className={`font-mono-num ${eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {eco.netIncome >= 0 ? '+' : ''}
                {eco.netIncome} B$/mese
              </strong>
              <span aria-hidden="true"> · </span>
              Debito/PIL:{' '}
              <strong className={`font-mono-num ${debtStatus.tone}`}>
                {eco.debtToGdpPercent}%
              </strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 sm:bg-transparent text-slate-200 sm:text-slate-400 hover:text-slate-100 hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Clear Horizontal Tabs (single-tap, zero truncation) */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-950/75 border-b border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('army')}
            className={`min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'army'
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/45'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Forze Armate</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('tech')}
            className={`min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'tech'
                ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/45'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>
              Tecnologie ({player.researchedTechs.length}/{scenarioTechs.length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('economy')}
            className={`min-h-[42px] flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'economy'
                ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/45'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
            }`}
          >
            <Landmark className="w-4 h-4 shrink-0" />
            <span>Economia & Bilancio</span>
          </button>
        </div>

        {/* Inline feedback */}
        {feedbackMessage && (
          <div
            className={`mx-4 sm:mx-5 mt-3 rounded-md px-3 py-2 text-xs border shrink-0 whitespace-normal ${
              feedbackMessage.tone === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-100'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-6">
          {/* ===================== TAB 1: FORZE ARMATE ===================== */}
          {tab === 'army' && (
            <div className="space-y-4">
              {/* Top Military Summary + Unified Batch Selector */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                <div className="grid grid-cols-3 gap-3 sm:gap-5 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Potenza Militare</div>
                    <div className="font-mono-num text-lg sm:text-xl font-bold text-cyan-300 leading-tight mt-0.5">
                      {militaryRating}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Mantenimento</div>
                    <div className="font-mono-num text-lg sm:text-xl font-bold text-rose-300 leading-tight mt-0.5">
                      -{eco.upkeep} B$
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Manodopera</div>
                    <div className="font-mono-num text-lg sm:text-xl font-bold text-slate-100 leading-tight mt-0.5">
                      {roundInt(player.manpower)}k
                    </div>
                  </div>
                </div>

                {/* Single Unified Quantity Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                    Quantità reclutamento:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {RECRUIT_AMOUNTS.map((amt) => {
                      const active = recruitAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRecruitAmount(amt)}
                          className={`min-h-[40px] min-w-[52px] px-2.5 py-1.5 rounded-lg font-mono-num text-xs font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500 text-slate-950 shadow-sm'
                              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/70'
                          }`}
                        >
                          +{amt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {policy.defense !== 'normal' && (
                <div className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-lg px-3.5 py-2 whitespace-normal">
                  Bilancio Difesa impostato su{' '}
                  <strong className={policy.defense === 'boosted' ? 'text-cyan-300' : 'text-amber-300'}>
                    {policy.defense === 'boosted' ? 'Potenziato' : 'Tagliato'}
                  </strong>
                  :{' '}
                  {policy.defense === 'boosted'
                    ? 'costi di reclutamento ridotti (-12%) e +8% efficacia in combattimento.'
                    : 'costi di reclutamento maggiorati (+12%) e -10% efficacia in combattimento.'}
                </div>
              )}

              {/* Compact 4-Branch Cards with Single Clear Recruit Button */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {BRANCH_ORDER.map((branch) => {
                  const spec = BRANCH_INFO[branch];
                  const count = roundInt(player.army[branch]);
                  const cost = getRecruitmentCost(player, branch, recruitAmount);
                  const navyBlocked = branch === 'navy' && !hasCoast;
                  const canAfford =
                    !navyBlocked && player.funds >= cost.funds && player.manpower >= cost.manpower;

                  return (
                    <div
                      key={branch}
                      className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">{BRANCH_ICONS[branch]}</div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-100">{spec.name}</h3>
                            <p className="text-[11px] text-cyan-300/90 mt-0.5 whitespace-normal">
                              {spec.role}
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed whitespace-normal">
                              {spec.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-2">
                          <div className="font-mono-num text-2xl font-bold text-slate-50 leading-none">
                            {count}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">attive</div>
                        </div>
                      </div>

                      {navyBlocked ? (
                        <div className="text-xs text-amber-300/90 bg-amber-950/30 border border-amber-500/25 rounded-lg px-3 py-2.5 whitespace-normal">
                          Serve almeno un territorio costiero per costruire unità navali.
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onRecruit(branch, recruitAmount)}
                          className="w-full min-h-[52px] flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-3.5 py-2.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 active:bg-cyan-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-cyan-400/40 transition-colors cursor-pointer text-left"
                        >
                          <span className="text-xs font-bold text-cyan-100">
                            Recluta +{recruitAmount} {spec.name}
                          </span>
                          <span className="font-mono-num text-[11px] text-slate-200 whitespace-normal sm:text-right">
                            <strong className="text-amber-300">{cost.funds} B$</strong> ·{' '}
                            <strong className="text-cyan-300">{cost.manpower}k</strong> ·{' '}
                            <span className="text-rose-300">+{cost.monthlyUpkeepDelta} B$/mese</span>
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== TAB 2: TECNOLOGIE ===================== */}
          {tab === 'tech' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3.5 py-2.5">
                <span className="whitespace-normal">
                  Albero tecnologico:{' '}
                  <strong className="text-slate-100">{scenarioDef.title}</strong> ({scenarioDef.eraTag})
                </span>
                <span className="whitespace-nowrap">
                  Velocità Ricerca:{' '}
                  <strong
                    className={`font-mono-num ${
                      eco.researchSpeedPercent > 100
                        ? 'text-emerald-400'
                        : eco.researchSpeedPercent < 100
                          ? 'text-rose-400'
                          : 'text-sky-300'
                    }`}
                  >
                    {eco.researchSpeedPercent}%
                  </strong>
                </span>
              </div>

              {player.activeResearch && (
                <div className="rounded-lg bg-amber-950/30 border border-amber-500/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-xs whitespace-normal">
                      <span className="text-amber-200 font-semibold">
                        Ricerca in corso:{' '}
                        {scenarioTechs.find((t) => t.id === player.activeResearch?.techId)?.name}
                      </span>
                      <span className="text-slate-300 ml-2">
                        ({activeResearchMonthsLeft}{' '}
                        {activeResearchMonthsLeft === 1 ? 'mese' : 'mesi'} rimanenti)
                      </span>
                    </div>
                  </div>
                  <div className="w-full sm:w-32 h-2 rounded-full bg-slate-900 overflow-hidden shrink-0">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            6,
                            Math.round(
                              ((player.activeResearch.totalTurns -
                                player.activeResearch.turnsRemaining) /
                                Math.max(1, player.activeResearch.totalTurns)) *
                                100
                            )
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {scenarioTechs.map((tech) => {
                  const completed = player.researchedTechs.includes(tech.id);
                  const inProgress = player.activeResearch?.techId === tech.id;
                  const canStart =
                    !completed && !player.activeResearch && player.funds >= tech.cost;

                  return (
                    <div
                      key={tech.id}
                      className={`rounded-xl p-4 border flex flex-col justify-between gap-3 ${
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
                              ~{activeResearchMonthsLeft} mesi
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
                          className="w-full min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-amber-500/20 hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 transition-colors cursor-pointer"
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

          {/* ===================== TAB 3: ECONOMIA & BILANCIO ===================== */}
          {tab === 'economy' && (
            <div className="space-y-4">
              {/* Live Monthly Impact Preview Strip */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 rounded-xl bg-slate-900/85 border border-slate-800 p-3.5">
                <div>
                  <div className="text-[11px] text-slate-400">Saldo Netto / mese</div>
                  <div
                    className={`font-mono-num text-base sm:text-xl font-bold mt-0.5 ${
                      eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {eco.netIncome >= 0 ? '+' : ''}
                    {eco.netIncome} B$
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Stabilità / mese</div>
                  <div
                    className={`font-mono-num text-base sm:text-xl font-bold mt-0.5 ${
                      eco.monthlyStabilityDelta > 0
                        ? 'text-emerald-400'
                        : eco.monthlyStabilityDelta < 0
                          ? 'text-rose-400'
                          : 'text-slate-200'
                    }`}
                  >
                    {eco.monthlyStabilityDelta >= 0 ? '+' : ''}
                    {eco.monthlyStabilityDelta}%
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Velocità Ricerca</div>
                  <div
                    className={`font-mono-num text-base sm:text-xl font-bold mt-0.5 ${
                      eco.researchSpeedPercent > 100
                        ? 'text-emerald-400'
                        : eco.researchSpeedPercent < 100
                          ? 'text-rose-400'
                          : 'text-sky-300'
                    }`}
                  >
                    {eco.researchSpeedPercent}%
                  </div>
                </div>
              </div>

              {/* Section A: Public Spending Allocation (100% State Budget) */}
              <section className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Ripartizione Spesa Pubblica (100% Bilancio Statale)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                      Tagliare i servizi civili libera fondi per le armi ma frena ricerca, PIL o
                      stabilità interna.
                    </p>
                  </div>
                </div>

                {/* 100% Stacked Bar */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-950 border border-slate-800">
                    {BUDGET_SECTORS.map((sec) => (
                      <div
                        key={sec.id}
                        className={`${sec.barColor} transition-all duration-300`}
                        style={{ width: `${eco.budgetShares[sec.id]}%` }}
                        title={`${sec.label}: ${eco.budgetShares[sec.id]}%`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    {BUDGET_SECTORS.map((sec) => (
                      <span key={sec.id} className="whitespace-nowrap">
                        <span className={sec.accentText}>{sec.label.split(' ')[0]}</span>{' '}
                        <strong className="font-mono-num text-slate-200">
                          {eco.budgetShares[sec.id]}%
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 4 Adjustable Sector Controls */}
                <div className="space-y-2.5 pt-1">
                  {BUDGET_SECTORS.map((sec) => {
                    const current = policy[sec.id];
                    return (
                      <div
                        key={sec.id}
                        className="rounded-lg bg-slate-950/70 border border-slate-800/90 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {sec.icon}
                            <span className="text-xs font-semibold text-slate-100">{sec.label}</span>
                            <span className={`font-mono-num text-xs font-bold ${sec.accentText}`}>
                              {eco.budgetShares[sec.id]}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug whitespace-normal">
                            {sec.hints[current]}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 shrink-0">
                          {LEVEL_BUTTONS.map((btn) => {
                            const active = current === btn.id;
                            const activeStyle =
                              btn.id === 'cut'
                                ? 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/55'
                                : btn.id === 'boosted'
                                  ? 'bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/55'
                                  : 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/55';
                            return (
                              <button
                                key={btn.id}
                                type="button"
                                onClick={() => onSetBudgetSector(sec.id, btn.id)}
                                className={`min-h-[40px] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                  active
                                    ? activeStyle
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                }`}
                              >
                                {btn.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section B: Sovereign Public Debt & War Bonds */}
              <section className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Debito Pubblico & Titoli di Guerra
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                      Emetti debito per finanziare subito lo sforzo bellico o rimborsalo per abbattere
                      gli interessi mensili.
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${debtStatus.tone}`}>
                    {debtStatus.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 rounded-lg bg-slate-950/70 border border-slate-800 p-3 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Debito Totale</div>
                    <div className="font-mono-num text-base font-bold text-slate-100 mt-0.5">
                      {eco.publicDebt} B$
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Debito / PIL</div>
                    <div className={`font-mono-num text-base font-bold mt-0.5 ${debtStatus.tone}`}>
                      {eco.debtToGdpPercent}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Interessi / mese</div>
                    <div className="font-mono-num text-base font-bold text-rose-400 mt-0.5">
                      -{eco.debtInterest} B$
                    </div>
                  </div>
                </div>

                {eco.debtToGdpPercent > 100 && (
                  <div className="flex items-start gap-2 rounded-lg bg-rose-950/40 border border-rose-500/40 px-3 py-2.5 text-xs text-rose-200 whitespace-normal">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      {eco.debtToGdpPercent > 140
                        ? 'Allarme debito (>140% PIL): interessi molto elevati, forte calo di stabilità mensile (-3%), rischio crisi interna e attacchi opportunisti dai vicini.'
                        : 'Soglia critica (>100% PIL): gli interessi aumentano e la stabilità cala (-1%/mese). Tagliare anche il Welfare aggrava le proteste.'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={eco.debtToGdpPercent >= 220}
                    onClick={() => onIssueWarBonds(50)}
                    className="min-h-[46px] flex flex-col items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-400/40 text-amber-200 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Titoli +50 B$
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-normal">Liquidità subito</span>
                  </button>
                  <button
                    type="button"
                    disabled={eco.debtToGdpPercent >= 220}
                    onClick={() => onIssueWarBonds(100)}
                    className="min-h-[46px] flex flex-col items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-400/40 text-amber-200 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Titoli +100 B$
                    </span>
                    <span className="text-[10px] text-amber-300/80 font-normal">Sforzo bellico</span>
                  </button>
                  <button
                    type="button"
                    disabled={eco.publicDebt <= 0.1 || player.funds < Math.min(50, eco.publicDebt)}
                    onClick={() => onRepayDebt(50)}
                    className="min-h-[46px] flex flex-col items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/70 disabled:opacity-40 border border-emerald-500/40 text-emerald-200 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Rimborsa 50 B$
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-normal">Riduce interessi</span>
                  </button>
                  <button
                    type="button"
                    disabled={eco.publicDebt <= 0.1 || player.funds < Math.min(100, eco.publicDebt)}
                    onClick={() => onRepayDebt(100)}
                    className="min-h-[46px] flex flex-col items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/70 disabled:opacity-40 border border-emerald-500/40 text-emerald-200 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Rimborsa 100 B$
                    </span>
                    <span className="text-[10px] text-emerald-300/80 font-normal">Rientro rapido</span>
                  </button>
                </div>
              </section>

              {/* Section C: Detailed Monthly Ledger + Post-Conquest Integration */}
              <section className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-100 pb-1">
                  Dettaglio Bilancio Mensile & Unione Territori
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PIL Nazionale Base</span>
                  <span className="font-mono-num">+{eco.baseGdp} B$</span>
                </div>
                {eco.annexedCount > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>
                      Territori Annessi ({eco.annexedCount} · resa ricostruzione{' '}
                      <strong className="font-mono-num text-cyan-300">
                        {eco.avgAnnexedIntegrationPercent}%
                      </strong>
                      )
                    </span>
                    <span className="font-mono-num text-cyan-300">+{eco.annexedGdp} B$</span>
                  </div>
                )}
                {eco.techBonus > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Bonus Industria Bellica</span>
                    <span className="font-mono-num text-emerald-300">+{eco.techBonus} B$</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                  <span>Entrate Lorde (Stabilità ×{eco.stabilityFactor} · Infrastr. ×{eco.infraFactor})</span>
                  <span className="font-mono-num font-semibold text-slate-100">
                    +{eco.grossIncome} B$
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Spesa Servizi Civili & Governo</span>
                  <span className="font-mono-num text-amber-300">-{eco.civilianCost} B$</span>
                </div>
                {eco.adminCost > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Amministrazione Territori Annessi</span>
                    <span className="font-mono-num text-amber-300">-{eco.adminCost} B$</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Mantenimento Forze Armate</span>
                  <span className="font-mono-num text-rose-300">-{eco.upkeep} B$</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Interessi Debito Pubblico</span>
                  <span className="font-mono-num text-rose-300">-{eco.debtInterest} B$</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 font-semibold text-slate-100">
                  <span>Saldo Netto Mensile</span>
                  <span
                    className={`font-mono-num ${eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                  >
                    {eco.netIncome >= 0 ? '+' : ''}
                    {eco.netIncome} B$
                  </span>
                </div>
              </section>

              {/* Section D: Domestic Cohesion & Stability Investment */}
              <div className="rounded-xl bg-slate-900/75 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <HeartPulse className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Coesione & Stabilità Interna
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                      Aumenta subito la Stabilità di +10% (attuale: {roundInt(player.stability)}%),
                      accelerando la ricostruzione dei territori annessi e prevenendo crisi interne.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={player.funds < 24 || player.stability >= 98}
                  onClick={onStabilize}
                  className="min-h-[44px] px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 disabled:opacity-40 border border-emerald-500/40 text-emerald-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Stabilizza (+10%) · 24 B$
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
