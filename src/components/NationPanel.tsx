import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  Ban,
  CheckCircle2,
  Crosshair,
  EyeOff,
  Flag,
  Flame,
  Handshake,
  Layers,
  Plane,
  Radio,
  Shield,
  ShieldAlert,
  Swords,
  Users,
  X,
} from 'lucide-react';
import { getScenarioBlocs } from '../data/scenarios';
import { estimateCombatPreview } from '../engine/combat';
import {
  areAllied,
  areAtWar,
  checkAttackModeEligibility,
  computeDistanceKm,
  getControlledProvinces,
  getMilitaryRating,
  getMonthlyEconomy,
  getPotentialDefenders,
  getRelation,
  getRelationLabel,
  getSanctionImposers,
  getWarBetween,
  hasBeachheadAgainst,
  hasLandBorder,
  hasNonAggressionPact,
  hasSanctioned,
  isSovereign,
  isUnderNavalBlockade,
  roundInt,
} from '../engine/helpers';
import { getCovertDetectionRisk, getCovertOpsForScenario } from '../engine/simulation';
import { AttackMode, CovertOpType, GameState } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface NationPanelProps {
  gameState: GameState;
  nationId: string | null;
  feedbackMessage: { text: string; tone: 'info' | 'error' } | null;
  onClose: () => void;
  onSelectNation: (nationId: string) => void;
  onOpenMilitary: () => void;
  onImproveRelations: (targetId: string) => void;
  onSignPact: (targetId: string) => void;
  onFormAlliance: (targetId: string) => void;
  onToggleSanction: (targetId: string) => void;
  onDeclareWar: (targetId: string) => void;
  onProposePeace: (targetId: string) => void;
  onLaunchOffensive: (defenderId: string, allocationPercent: number, mode: AttackMode) => void;
  onExecuteCovertOp: (targetId: string, opType: CovertOpType, framedNationId?: string) => void;
}

type PanelTab = 'overview' | 'diplomacy' | 'covert';

export const NationPanel: React.FC<NationPanelProps> = ({
  gameState,
  nationId,
  feedbackMessage,
  onClose,
  onSelectNation,
  onOpenMilitary,
  onImproveRelations,
  onSignPact,
  onFormAlliance,
  onToggleSanction,
  onDeclareWar,
  onProposePeace,
  onLaunchOffensive,
  onExecuteCovertOp,
}) => {
  const [panelTab, setPanelTab] = useState<PanelTab>('overview');
  const [allocation, setAllocation] = useState<number>(60);
  const [attackMode, setAttackMode] = useState<AttackMode>('ground');
  const [confirmWarTarget, setConfirmWarTarget] = useState<string | null>(null);

  // Covert ops state
  const [covertOp, setCovertOp] = useState<CovertOpType>('propaganda');
  const [useFalseFlag, setUseFalseFlag] = useState<boolean>(false);
  const [framedNationId, setFramedNationId] = useState<string>('');

  const province = nationId ? gameState.nations[nationId] : null;
  const isAnnexedProvince = Boolean(province && province.ownerId !== province.id);
  const owner = province ? gameState.nations[province.ownerId] : null;
  const activeTarget = province ? (isAnnexedProvince && owner ? owner : province) : null;

  // Candidate third-party nations for False Flag (sorted: rivals & neighbors of target first)
  const falseFlagCandidates = useMemo(() => {
    if (!activeTarget) return [];
    const targetNeighborSet = new Set(activeTarget.neighbors);
    return Object.values(gameState.nations)
      .filter(
        (n) =>
          isSovereign(n) &&
          n.id !== gameState.playerId &&
          n.id !== activeTarget.id
      )
      .sort((a, b) => {
        const scoreA =
          (targetNeighborSet.has(a.id) ? 30 : 0) -
          getRelation(gameState, activeTarget.id, a.id) +
          (a.gdpIncome >= 30 ? 25 : 0);
        const scoreB =
          (targetNeighborSet.has(b.id) ? 30 : 0) -
          getRelation(gameState, activeTarget.id, b.id) +
          (b.gdpIncome >= 30 ? 25 : 0);
        return scoreB - scoreA;
      });
  }, [activeTarget, gameState]);

  useEffect(() => {
    setConfirmWarTarget(null);
    setPanelTab('overview');
    setUseFalseFlag(false);
    if (activeTarget && activeTarget.id !== gameState.playerId) {
      const land = hasLandBorder(gameState, gameState.playerId, activeTarget.id);
      const beach = hasBeachheadAgainst(gameState, gameState.playerId, activeTarget.id);
      if (land || beach) setAttackMode('ground');
      else if (activeTarget.coastal) setAttackMode('amphibious');
      else setAttackMode('air_raid');
    }
  }, [nationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (
      falseFlagCandidates.length > 0 &&
      (!framedNationId || !falseFlagCandidates.some((c) => c.id === framedNationId))
    ) {
      setFramedNationId(falseFlagCandidates[0].id);
    }
  }, [falseFlagCandidates, framedNationId]);

  if (!nationId || !province || !owner || !activeTarget) return null;

  const isPlayer = province.ownerId === gameState.playerId;
  const player = gameState.nations[gameState.playerId];
  const relation = getRelation(gameState, gameState.playerId, activeTarget.id);
  const allied = areAllied(gameState, gameState.playerId, activeTarget.id);
  const pactActive = hasNonAggressionPact(gameState, gameState.playerId, activeTarget.id);
  const atWar = areAtWar(gameState, gameState.playerId, activeTarget.id);
  const war = getWarBetween(gameState, gameState.playerId, activeTarget.id);
  const playerSanctionedTarget = hasSanctioned(gameState, gameState.playerId, activeTarget.id);
  const targetSanctionedPlayer = hasSanctioned(gameState, activeTarget.id, gameState.playerId);
  const diplomacyUsed = Boolean(gameState.diplomacyUsedThisTurn[activeTarget.id]);
  const covertUsed = Boolean(gameState.covertUsedThisTurn?.[activeTarget.id]);
  const offensiveUsed = (gameState.offensivesThisTurn[activeTarget.id] ?? 0) >= 1;

  const potentialInterveners = !isPlayer
    ? getPotentialDefenders(gameState, gameState.playerId, activeTarget.id)
    : [];
  const eco = getMonthlyEconomy(gameState, activeTarget.id);
  const ownedProvinces = getControlledProvinces(gameState, activeTarget.id);
  const sanctionsOnTarget = getSanctionImposers(gameState, activeTarget.id);
  const distKm = !isPlayer
    ? computeDistanceKm(player.capitalCoords, activeTarget.capitalCoords)
    : 0;
  const landBorder = !isPlayer && hasLandBorder(gameState, player.id, activeTarget.id);
  const beachhead = !isPlayer && hasBeachheadAgainst(gameState, player.id, activeTarget.id);

  // Active hybrid debuffs on target
  const isBlockaded = isUnderNavalBlockade(gameState, activeTarget.id);
  const isCybered = (activeTarget.cyberDisruptedUntilTurn ?? -1) >= gameState.turn;
  const isAirDefDown = (activeTarget.airDefenseDisabledUntilTurn ?? -1) >= gameState.turn;
  const isSabotaged = (activeTarget.sabotagedUntilTurn ?? -1) >= gameState.turn;
  const hasDebuffs =
    isBlockaded || isCybered || isAirDefDown || isSabotaged || activeTarget.internalCrisisActive;

  const modeEligibility =
    atWar && !isPlayer
      ? checkAttackModeEligibility(gameState, player.id, activeTarget.id, attackMode)
      : null;

  const preview =
    atWar && !isPlayer
      ? estimateCombatPreview(gameState, player.id, activeTarget.id, allocation, attackMode)
      : null;

  const playerControl = war
    ? war.attackerId === gameState.playerId
      ? war.attackerControl
      : war.defenderControl
    : 0;
  const enemyControl = war
    ? war.attackerId === gameState.playerId
      ? war.defenderControl
      : war.attackerControl
    : 0;

  const scenarioBlocs = getScenarioBlocs(gameState.scenarioId);
  const scenarioCovertOps = getCovertOpsForScenario(gameState.scenarioId);
  const selectedCovertSpec = scenarioCovertOps[covertOp];
  const effectiveFalseFlag = useFalseFlag && selectedCovertSpec.supportsFalseFlag;
  const covertCost =
    selectedCovertSpec.cost + (effectiveFalseFlag ? selectedCovertSpec.falseFlagExtraCost : 0);
  const covertRisk = !isPlayer
    ? getCovertDetectionRisk(
        player,
        activeTarget,
        covertOp,
        effectiveFalseFlag,
        gameState.scenarioId
      )
    : 0;

  return (
    <aside
      aria-label={`Dettagli ${province.name}`}
      className="fixed inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:top-[57px] z-20 w-full md:w-[410px] max-h-[78vh] md:max-h-none bg-[#0D1524]/96 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-700/75 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-800/90 shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <FlagBanner flag={province.flag} name={province.name} size="md" className="mt-0.5" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none">
              {province.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400 whitespace-normal">
              {province.region}
              <span aria-hidden="true"> · </span>
              <span style={{ color: scenarioBlocs[activeTarget.bloc].color }}>
                {activeTarget.strictNeutral
                  ? 'Stato Neutrale'
                  : scenarioBlocs[activeTarget.bloc].name}
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi pannello nazione"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-navigation Tabs for Foreign Sovereign Nations */}
      {!isPlayer && !isAnnexedProvince && (
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-slate-950/70 border-b border-slate-800 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setPanelTab('overview')}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              panelTab === 'overview'
                ? atWar
                  ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
                  : 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {atWar ? 'Fronte & Forza' : 'Panoramica'}
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('diplomacy')}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              panelTab === 'diplomacy'
                ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Diplomazia
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('covert')}
            className={`py-1.5 px-2 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              panelTab === 'covert'
                ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Op. Coperte
          </button>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4">
        {feedbackMessage && (
          <div
            className={`rounded-md px-3 py-2 text-xs leading-relaxed whitespace-normal border ${
              feedbackMessage.tone === 'error'
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-100'
            }`}
          >
            {feedbackMessage.text}
          </div>
        )}

        {/* Annexed territory notice */}
        {isAnnexedProvince && (
          <div className="rounded-lg bg-slate-900/90 border border-amber-500/35 p-3 space-y-2">
            <div className="text-xs font-semibold text-amber-300">Territorio Annesso</div>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
              {province.name} è sotto il controllo diretto di{' '}
              <strong className="text-slate-100">{owner.name}</strong> e contribuisce alle sue
              entrate economiche e ai suoi confini strategici.
            </p>
            <button
              type="button"
              onClick={() => onSelectNation(owner.id)}
              className="text-xs font-medium text-cyan-300 hover:text-cyan-200 underline underline-offset-4 cursor-pointer"
            >
              Apri scheda di {owner.name}
            </button>
          </div>
        )}

        {/* Active Hybrid Warfare / Crisis Debuffs Notice */}
        {!isAnnexedProvince && hasDebuffs && (
          <div className="rounded-md bg-amber-950/35 border border-amber-500/35 px-3 py-2 text-[11px] text-amber-200 space-y-1 whitespace-normal">
            <div className="font-semibold text-amber-300">Effetti Ibridi & Crisi Attivi</div>
            {activeTarget.internalCrisisActive && (
              <div>· Rivolta / Crisi Interna attiva (-20% PIL e -20% efficacia militare)</div>
            )}
            {isBlockaded && <div>· Blocco Navale attivo (-28% entrate PIL ogni mese)</div>}
            {isCybered && <div>· Reti colpite da Cyberattacco (-20% PIL)</div>}
            {isAirDefDown && <div>· Difesa Aerea compromessa (vulnerabile a Raid Aerei)</div>}
            {isSabotaged && <div>· Infrastrutture sabotate (-30% bonus difensivo)</div>}
          </div>
        )}

        {/* ===================== TAB 1: OVERVIEW & ACTIVE WAR FRONT ===================== */}
        {!isAnnexedProvince && (isPlayer || panelTab === 'overview') && (
          <>
            <div className="space-y-1.5">
              <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
                {activeTarget.summary}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 pt-1">
                {isPlayer ? (
                  <span className="text-cyan-300 font-medium">Tuo Comando Nazionale</span>
                ) : (
                  <>
                    <span
                      className={
                        atWar
                          ? 'text-rose-400 font-semibold'
                          : allied
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-200 font-medium'
                      }
                    >
                      {atWar
                        ? 'Stato di Guerra'
                        : allied
                          ? 'Alleato Militare'
                          : pactActive
                            ? 'Patto di Non Aggressione'
                            : `Relazioni ${getRelationLabel(relation)}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-slate-300">
                      {relation >= 0 ? '+' : ''}
                      {relation}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-slate-300">{distKm} km</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{activeTarget.coastal ? 'Costiero' : 'Senza Mare'}</span>
                {ownedProvinces.length > 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-300">{ownedProvinces.length} territori</span>
                  </>
                )}
              </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-y border-slate-800/80 text-xs">
              <div>
                <div className="text-slate-400">Entrate Nette / Mese</div>
                <div className="font-mono-num text-sm font-semibold text-amber-300 mt-0.5">
                  {eco.netIncome >= 0 ? '+' : ''}
                  {eco.netIncome} B$
                  <span className="text-[11px] text-slate-400 font-normal ml-1">
                    (PIL {eco.grossIncome})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-400">Potenza Militare</div>
                <div className="font-mono-num text-sm font-semibold text-cyan-300 mt-0.5">
                  {getMilitaryRating(activeTarget)}
                  <span className="text-[11px] text-slate-400 font-normal ml-1">
                    · {activeTarget.researchedTechs.length} tech
                  </span>
                </div>
              </div>
              <div>
                <div className="text-slate-400">Stabilità Interna</div>
                <div
                  className={`font-mono-num text-sm font-semibold mt-0.5 ${
                    activeTarget.stability < 30
                      ? 'text-rose-400'
                      : activeTarget.stability < 55
                        ? 'text-amber-300'
                        : 'text-slate-100'
                  }`}
                >
                  {roundInt(activeTarget.stability)}%
                </div>
              </div>
              <div>
                <div className="text-slate-400">Manodopera</div>
                <div className="font-mono-num text-sm font-semibold text-slate-100 mt-0.5">
                  {roundInt(activeTarget.manpower)}k
                </div>
              </div>
            </div>

            {/* 4-Branch Military Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-200">Ripartizione Forze Armate</h3>
                <span className="text-[11px] text-slate-400 font-mono-num">
                  Terreno ×{activeTarget.terrainDefense.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    Terrestri
                  </span>
                  <span className="font-mono-num font-semibold text-slate-100">
                    {roundInt(activeTarget.army.ground)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    Aviazione
                  </span>
                  <span className="font-mono-num font-semibold text-slate-100">
                    {roundInt(activeTarget.army.air)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Anchor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    Marina
                  </span>
                  <span className="font-mono-num font-semibold text-slate-100">
                    {roundInt(activeTarget.army.navy)}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/75 border border-slate-800 rounded-md px-2.5 py-2">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    Difesa
                  </span>
                  <span className="font-mono-num font-semibold text-slate-100">
                    {roundInt(activeTarget.army.defense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sanctions Notice */}
            {(sanctionsOnTarget.length > 0 || targetSanctionedPlayer) && (
              <div className="text-xs text-amber-200/90 bg-amber-950/30 border border-amber-500/25 rounded-md px-3 py-2 space-y-1 whitespace-normal">
                {sanctionsOnTarget.length > 0 && (
                  <div>
                    Sanzioni su {activeTarget.name}: -{eco.sanctionPenaltyPercent}% PIL (
                    {sanctionsOnTarget.length}{' '}
                    {sanctionsOnTarget.length === 1 ? 'paese' : 'paesi'}).
                  </div>
                )}
                {!isPlayer && targetSanctionedPlayer && (
                  <div className="text-rose-300">
                    {activeTarget.name} applica sanzioni economiche contro di te.
                  </div>
                )}
              </div>
            )}

            {/* PLAYER OWN ECONOMY SUMMARY */}
            {isPlayer && (
              <div className="space-y-3 pt-1">
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-2 text-xs">
                  <div className="font-semibold text-slate-200">Bilancio Mensile</div>
                  <div className="flex justify-between text-slate-300">
                    <span>PIL Nazionale Base</span>
                    <span className="font-mono-num">+{eco.baseGdp} B$</span>
                  </div>
                  {eco.annexedGdp > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span>Territori Annessi</span>
                      <span className="font-mono-num text-cyan-300">+{eco.annexedGdp} B$</span>
                    </div>
                  )}
                  {eco.techBonus > 0 && (
                    <div className="flex justify-between text-slate-300">
                      <span>Bonus Industria Bellica</span>
                      <span className="font-mono-num text-emerald-300">+{eco.techBonus} B$</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>Mantenimento Forze Armate</span>
                    <span className="font-mono-num text-rose-300">-{eco.upkeep} B$</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 font-semibold text-slate-100">
                    <span>Saldo Netto / Mese</span>
                    <span
                      className={`font-mono-num ${eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {eco.netIncome >= 0 ? '+' : ''}
                      {eco.netIncome} B$
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-slate-400">Indice di Aggressività</span>
                  <span
                    className={`font-mono-num font-semibold ${
                      player.aggressiveness >= 45
                        ? 'text-rose-400'
                        : player.aggressiveness >= 20
                          ? 'text-amber-300'
                          : 'text-emerald-400'
                    }`}
                  >
                    {roundInt(player.aggressiveness)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onOpenMilitary}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 border border-cyan-400/40 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Gestisci Esercito e Ricerca Tecnologica</span>
                </button>
              </div>
            )}

            {/* MULTI-DOMAIN WAR FRONT LAUNCHER */}
            {!isPlayer && atWar && (
              <div className="rounded-lg bg-rose-950/35 border border-rose-500/45 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                    <Swords className="w-4 h-4 shrink-0" />
                    <span>Fronte Multi-Dominio</span>
                  </div>
                  <span className="text-[11px] font-mono-num text-slate-300">
                    {landBorder ? 'Confine Diretto' : beachhead ? 'Testa di Ponte' : `${distKm} km`}
                  </span>
                </div>

                {/* Control Progress */}
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-cyan-200">Tuo controllo su {activeTarget.name}</span>
                      <span className="font-mono-num font-semibold text-cyan-300">
                        {roundInt(playerControl)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, playerControl))}%` }}
                      />
                    </div>
                  </div>

                  {enemyControl > 0 && (
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-rose-200">Occupazione nemica su {player.name}</span>
                        <span className="font-mono-num font-semibold text-rose-400">
                          {roundInt(enemyControl)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, enemyControl))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4-Domain Mode Selector (with Naval split into Amphibious / Blockade) */}
                <div className="space-y-1.5 pt-2 border-t border-rose-500/25">
                  <div className="text-[11px] font-semibold text-slate-200">
                    Modalità di Attacco
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {(
                      [
                        { id: 'ground', label: 'Terrestre', sub: 'Conquista · 0 B$', icon: Users },
                        { id: 'air_raid', label: 'Raid Aereo', sub: 'Infrastr. · 6 B$', icon: Plane },
                        { id: 'amphibious', label: 'Assalto Anfibio', sub: 'Via Mare · 10 B$', icon: Anchor },
                        { id: 'naval_blockade', label: 'Blocco Navale', sub: '-28% PIL · 8 B$', icon: Anchor },
                        { id: 'combined', label: 'Combinato (T+A+M)', sub: 'Bonus +28% · 18 B$', icon: Layers },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const active = attackMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAttackMode(m.id)}
                          className={`flex flex-col items-start p-2 rounded-md border text-left transition-colors cursor-pointer ${
                            m.id === 'combined' ? 'col-span-2' : ''
                          } ${
                            active
                              ? 'bg-rose-500/25 border-rose-400/70 text-slate-50'
                              : 'bg-slate-900/75 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>{m.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{m.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Force Slider + Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="force-alloc" className="text-slate-200">
                      Forze impiegate
                    </label>
                    <span className="font-mono-num font-semibold text-amber-300">{allocation}%</span>
                  </div>
                  <input
                    id="force-alloc"
                    type="range"
                    min={25}
                    max={85}
                    step={5}
                    value={allocation}
                    onChange={(e) => setAllocation(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {preview && (
                    <div className="rounded-md bg-slate-950/70 border border-slate-800 p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-semibold ${
                            preview.oddsTone === 'favorable'
                              ? 'text-emerald-400'
                              : preview.oddsTone === 'risky'
                                ? 'text-rose-400'
                                : 'text-amber-300'
                          }`}
                        >
                          {preview.oddsLabel}
                        </span>
                        <span className="font-mono-num text-slate-400">
                          {preview.logisticsLabel}
                        </span>
                      </div>
                      <div className="text-slate-300 whitespace-normal">{preview.expectedEffect}</div>
                      <div className="flex justify-between pt-1.5 border-t border-slate-800/80 text-slate-400">
                        <span>
                          Tua forza:{' '}
                          <strong className="font-mono-num text-cyan-300">
                            {preview.attackerPower}
                          </strong>
                        </span>
                        <span>
                          Difesa nemica:{' '}
                          <strong className="font-mono-num text-rose-300">
                            {preview.defenderPower}
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {modeEligibility && !modeEligibility.allowed && modeEligibility.reason && (
                    <p className="text-[11px] text-amber-200 leading-relaxed whitespace-normal">
                      {modeEligibility.reason}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      offensiveUsed ||
                      !modeEligibility?.allowed ||
                      gameState.status !== 'playing'
                    }
                    onClick={() => onLaunchOffensive(activeTarget.id, allocation, attackMode)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>
                      {offensiveUsed
                        ? 'Operazione già eseguita questo mese'
                        : `Esegui Attacco${modeEligibility?.costFunds ? ` (${modeEligibility.costFunds} B$)` : ''}`}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick CTA to Diplomacy / Covert from Overview when at peace */}
            {!isPlayer && !atWar && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPanelTab('diplomacy')}
                  className="py-2 px-3 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 cursor-pointer"
                >
                  Diplomazia & Guerra
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('covert')}
                  className="py-2 px-3 rounded-md text-xs font-medium bg-amber-950/45 hover:bg-amber-900/50 border border-amber-500/35 text-amber-200 cursor-pointer"
                >
                  Op. Coperte / False Flag
                </button>
              </div>
            )}
          </>
        )}

        {/* ===================== TAB 2: DIPLOMACY & WAR DECLARATION ===================== */}
        {!isPlayer && !isAnnexedProvince && panelTab === 'diplomacy' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
              <span className="text-slate-400">Relazione Bilaterale</span>
              <span className="font-mono-num font-semibold text-slate-100">
                {getRelationLabel(relation)} ({relation >= 0 ? '+' : ''}
                {relation})
              </span>
            </div>

            {!atWar && (
              <>
                <button
                  type="button"
                  disabled={diplomacyUsed || player.funds < 10}
                  onClick={() => onImproveRelations(activeTarget.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-45 border border-slate-700/70 text-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-left whitespace-normal">
                    <Handshake className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Migliora Relazioni (+16)</span>
                  </span>
                  <span className="font-mono-num text-[11px] text-amber-300 shrink-0">10 B$</span>
                </button>

                {!pactActive && !allied && (
                  <button
                    type="button"
                    disabled={diplomacyUsed || relation < 10 || player.funds < 12}
                    onClick={() => onSignPact(activeTarget.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-45 border border-slate-700/70 text-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-left whitespace-normal">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Patto di Non Aggressione (rel. ≥ +10)</span>
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300 shrink-0">12 B$</span>
                  </button>
                )}

                {!allied && (
                  <button
                    type="button"
                    disabled={diplomacyUsed || relation < 45 || player.funds < 18}
                    onClick={() => onFormAlliance(activeTarget.id)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium bg-emerald-950/50 hover:bg-emerald-900/50 disabled:opacity-45 border border-emerald-500/35 text-emerald-100 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-left whitespace-normal">
                      <Flag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Alleanza Militare (rel. ≥ +45)</span>
                    </span>
                    <span className="font-mono-num text-[11px] text-amber-300 shrink-0">18 B$</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => onToggleSanction(activeTarget.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-100 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-left whitespace-normal">
                <Ban className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {playerSanctionedTarget
                    ? 'Revoca Sanzioni Economiche'
                    : 'Imponi Sanzioni Economiche (-10% PIL nemico)'}
                </span>
              </span>
            </button>

            {atWar ? (
              <button
                type="button"
                disabled={diplomacyUsed}
                onClick={() => onProposePeace(activeTarget.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-cyan-500/40 text-cyan-200 transition-colors cursor-pointer"
              >
                <Handshake className="w-4 h-4" />
                <span>Proponi Armistizio e Pace</span>
              </button>
            ) : confirmWarTarget === activeTarget.id ? (
              <div className="rounded-lg bg-rose-950/60 border border-rose-500/50 p-3 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-rose-200 whitespace-normal leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-rose-100 block">
                      Conferma Dichiarazione di Guerra
                    </strong>
                    {getMilitaryRating(activeTarget) > getMilitaryRating(player) * 1.5 && (
                      <span className="block text-rose-300 font-medium">
                        Divario di potenza severo: {activeTarget.name} ha forza{' '}
                        {getMilitaryRating(activeTarget)} contro la tua ({getMilitaryRating(player)}
                        ). Valuta prima potenziamenti, alleanze o operazioni coperte.
                      </span>
                    )}
                    {activeTarget.strictNeutral ? (
                      <span className="block text-amber-200">
                        Stato Neutrale: violare la neutralità causa +18% Tensione Globale e sanzioni
                        diffuse.
                      </span>
                    ) : activeTarget.bloc === 'non_aligned' ? (
                      <span className="block text-amber-200">
                        Paese Non Allineato: l’attacco aumenta Tensione Globale (+14%) e ostilità.
                      </span>
                    ) : null}
                    {potentialInterveners.length > 0 ? (
                      <span className="block">
                        Effetto Domino: possono entrare in guerra{' '}
                        <strong className="text-amber-300">
                          {potentialInterveners
                            .slice(0, 4)
                            .map((n) => n.name)
                            .join(', ')}
                          {potentialInterveners.length > 4
                            ? ` e altri ${potentialInterveners.length - 4}`
                            : ''}
                        </strong>
                        .
                      </span>
                    ) : (
                      <span className="block">
                        Nessun alleato diretto pronto a intervenire, ma altre potenze possono imporre
                        sanzioni o coalizioni.
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmWarTarget(null);
                      setPanelTab('overview');
                      onDeclareWar(activeTarget.id);
                    }}
                    className="flex-1 py-2 px-3 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                  >
                    Dichiara Guerra
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWarTarget(null)}
                    className="py-2 px-3 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={gameState.status !== 'playing'}
                onClick={() => setConfirmWarTarget(activeTarget.id)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 disabled:opacity-40 border border-rose-500/45 text-rose-200 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Dichiara Guerra a {activeTarget.name}</span>
              </button>
            )}
          </div>
        )}

        {/* ===================== TAB 3: HYBRID WARFARE, INSTABILITY & FALSE FLAG ===================== */}
        {!isPlayer && !isAnnexedProvince && panelTab === 'covert' && (
          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-2 text-slate-300 leading-relaxed whitespace-normal">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-100">
                  Operazioni Coperte & Guerra Ibrida
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 whitespace-normal">
                  Utilizzabile anche in tempo di pace per destabilizzare rivali, paralizzare difese
                  o scatenare guerre tra terzi con attacchi False Flag.
                </p>
              </div>
            </div>

            {/* Target stability meter */}
            <div className="rounded-md bg-slate-900/80 border border-slate-800 p-2.5 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">Stabilità di {activeTarget.name}</span>
                <span
                  className={`font-mono-num font-semibold ${
                    activeTarget.stability < 30
                      ? 'text-rose-400'
                      : activeTarget.stability < 50
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                  }`}
                >
                  {roundInt(activeTarget.stability)}%{' '}
                  {activeTarget.stability < 30 ? '(Soglia Rivolta!)' : ''}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    activeTarget.stability < 30
                      ? 'bg-rose-500'
                      : activeTarget.stability < 55
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, activeTarget.stability))}%` }}
                />
              </div>
            </div>

            {/* 4 Covert Operation Cards */}
            <div className="space-y-2">
              {(
                [
                  { id: 'propaganda', icon: Radio },
                  { id: 'cyber', icon: Crosshair },
                  { id: 'sabotage', icon: ShieldAlert },
                  { id: 'rebels', icon: Flame },
                ] as const
              ).map(({ id, icon: Icon }) => {
                const spec = scenarioCovertOps[id];
                const active = covertOp === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setCovertOp(id);
                      if (!spec.supportsFalseFlag) setUseFalseFlag(false);
                    }}
                    className={`w-full text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-950/35 border-amber-400/65'
                        : 'bg-slate-900/75 border-slate-800 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-100">
                        <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>{spec.name}</span>
                      </span>
                      <span className="font-mono-num text-[11px] text-amber-300 shrink-0">
                        {spec.cost} B$
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 leading-relaxed whitespace-normal">
                      {spec.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* False Flag Attribution Selector (for Cyber & Sabotage) */}
            {selectedCovertSpec.supportsFalseFlag && (
              <div className="rounded-lg bg-slate-900/85 border border-slate-700/80 p-3 space-y-2.5">
                <div className="font-semibold text-slate-100">Attribuzione Operazione</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUseFalseFlag(false)}
                    className={`py-2 px-2.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      !useFalseFlag
                        ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Anonimo ({selectedCovertSpec.cost} B$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseFalseFlag(true)}
                    className={`py-2 px-2.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      useFalseFlag
                        ? 'bg-rose-500/25 border-rose-400/65 text-rose-100'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    False Flag (+{selectedCovertSpec.falseFlagExtraCost} B$)
                  </button>
                </div>

                {useFalseFlag && (
                  <div className="space-y-1.5 pt-1">
                    <label
                      htmlFor="false-flag-target"
                      className="block text-[11px] text-amber-200 whitespace-normal"
                    >
                      Incolpa un paese terzo (può scatenare una guerra reale tra i due):
                    </label>
                    <select
                      id="false-flag-target"
                      value={framedNationId}
                      onChange={(e) => setFramedNationId(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-md bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    >
                      {falseFlagCandidates.map((c) => {
                        const relBetween = getRelation(gameState, activeTarget.id, c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} (rel. con {activeTarget.name}:{' '}
                            {relBetween >= 0 ? '+' : ''}
                            {relBetween})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Risk & Execution CTA */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-300">
              <span>Rischio scoperta intelligence:</span>
              <span
                className={`font-mono-num font-semibold ${
                  covertRisk >= 30 ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {covertRisk}%
              </span>
            </div>

            <button
              type="button"
              disabled={
                covertUsed ||
                player.funds < covertCost ||
                gameState.status !== 'playing' ||
                (effectiveFalseFlag && !framedNationId)
              }
              onClick={() =>
                onExecuteCovertOp(
                  activeTarget.id,
                  covertOp,
                  effectiveFalseFlag ? framedNationId : undefined
                )
              }
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-colors cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              <span>
                {covertUsed
                  ? 'Operazione già eseguita questo mese'
                  : effectiveFalseFlag
                    ? `Lancia False Flag (${covertCost} B$)`
                    : `Esegui ${selectedCovertSpec.name} (${covertCost} B$)`}
              </span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
