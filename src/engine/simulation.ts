import {
  CovertOpSpec,
  getScenarioBlocs,
  getScenarioCovertOps,
  getScenarioDefinition,
  getScenarioInitialDiplomacy,
  getScenarioNationSeeds,
  getScenarioTech,
  getScenarioTechnologies,
  getScenarioTerritoryOwners,
} from '../data/scenarios';
import {
  ArmyBranch,
  AttackMode,
  CovertOpOutcome,
  CovertOpType,
  GameState,
  NationState,
  NewsCategory,
  NewsEvent,
  ScenarioId,
  TechId,
  War,
} from '../types/game';
import { resolveOffensive } from './combat';
import {
  areAllied,
  areAtWar,
  checkAttackModeEligibility,
  checkMilitaryReach,
  clamp,
  directedKey,
  formatTurnDate,
  getControlledProvinces,
  getMilitaryRating,
  getMonthlyEconomy,
  getPotentialDefenders,
  getRecruitmentCost,
  getRelation,
  getWarBetween,
  hasNonAggressionPact,
  hasSanctioned,
  hasTech,
  isSovereign,
  pairKey,
  round1,
  roundInt,
  safeNum,
  sanctionKey,
} from './helpers';

export const GAME_STATE_VERSION = 2;

export type { CovertOpSpec };

export const COVERT_OPS: Record<CovertOpType, CovertOpSpec> = getScenarioCovertOps('2026');

export function getCovertOpsForScenario(scenarioId?: ScenarioId): Record<CovertOpType, CovertOpSpec> {
  return getScenarioCovertOps(scenarioId);
}

export function getCovertDetectionRisk(
  attacker: NationState,
  target: NationState,
  opType: CovertOpType,
  isFalseFlag: boolean,
  scenarioId: ScenarioId = '2026'
): number {
  const spec = getScenarioCovertOps(scenarioId)[opType];
  let risk = spec.baseDetectionRisk;
  if (isFalseFlag) risk += 6;
  if (hasTech(attacker, 'cyber_warfare')) risk -= 10;
  if (hasTech(target, 'cyber_warfare')) risk += 8;
  if (target.stability >= 82) risk += 5;
  if (target.stability < 40) risk -= 6;
  return clamp(roundInt(risk), 8, 65);
}

function makeNews(
  turn: number,
  category: NewsCategory,
  headline: string,
  detail: string,
  nationIds?: string[],
  scenarioId: ScenarioId = '2026'
): NewsEvent {
  return {
    id: `news_${turn}_${Math.random().toString(36).slice(2, 9)}`,
    turn,
    dateLabel: formatTurnDate(turn, scenarioId),
    category,
    headline,
    detail,
    nationIds,
  };
}

function syncNewsDates(state: GameState): void {
  for (const item of state.news) {
    item.dateLabel = formatTurnDate(item.turn, state.scenarioId);
  }
}

function setRelation(state: GameState, a: string, b: string, value: number): void {
  if (a === b) return;
  state.relations[pairKey(a, b)] = clamp(Math.round(safeNum(value, 0)), -100, 100);
}

function adjustRelation(state: GameState, a: string, b: string, delta: number): void {
  if (a === b) return;
  const current = getRelation(state, a, b);
  state.relations[pairKey(a, b)] = clamp(Math.round(current + delta), -100, 100);
}

function cloneState(state: GameState): GameState {
  const nations: Record<string, NationState> = {};
  for (const [id, n] of Object.entries(state.nations)) {
    nations[id] = {
      ...n,
      army: { ...n.army },
      researchedTechs: [...n.researchedTechs],
      activeResearch: n.activeResearch ? { ...n.activeResearch } : null,
      neighbors: [...n.neighbors],
    };
  }
  return {
    ...state,
    nations,
    relations: { ...state.relations },
    alliances: { ...state.alliances },
    nonAggressionPacts: { ...state.nonAggressionPacts },
    sanctions: { ...state.sanctions },
    navalBlockades: { ...(state.navalBlockades ?? {}) },
    wars: state.wars.map((w) => ({ ...w })),
    news: [...state.news],
    battleHistory: [...state.battleHistory],
    offensivesThisTurn: { ...state.offensivesThisTurn },
    diplomacyUsedThisTurn: { ...state.diplomacyUsedThisTurn },
    covertUsedThisTurn: { ...(state.covertUsedThisTurn ?? {}) },
  };
}

export function createInitialGameState(
  playerId: string,
  scenarioId: ScenarioId = '2026'
): GameState {
  const scenario = getScenarioDefinition(scenarioId);
  const seeds = getScenarioNationSeeds(scenarioId);
  const territoryOwners = getScenarioTerritoryOwners(scenarioId);
  const blocMeta = getScenarioBlocs(scenarioId);

  const nations: Record<string, NationState> = {};
  for (const seed of seeds) {
    const owner = territoryOwners[seed.id] ?? seed.id;
    const isSubject = owner !== seed.id;
    nations[seed.id] = {
      ...seed,
      ownerId: owner,
      funds: isSubject ? 0 : seed.startingFunds,
      aggressiveness: 0,
      researchedTechs: [],
      activeResearch: null,
      warExhaustion: 0,
      annexations: 0,
      airDefenseDisabledUntilTurn: -1,
      cyberDisruptedUntilTurn: -1,
      sabotagedUntilTurn: -1,
      internalCrisisActive: false,
      army: isSubject ? { ground: 0, air: 0, navy: 0, defense: 0 } : { ...seed.army },
      neighbors: [...seed.neighbors],
    };
  }

  // Ensure selected playerId is sovereign in this scenario
  const requested = nations[playerId];
  const validPlayerId =
    requested && requested.ownerId === requested.id ? playerId : scenario.defaultPlayerId;

  const relations: Record<string, number> = {};
  const alliances: Record<string, boolean> = {};
  const nonAggressionPacts: Record<string, number> = {};

  if (scenarioId === '2026') {
    const coreBlocMembers = Object.values(nations).filter(
      (n) =>
        isSovereign(n) &&
        (n.bloc === 'euro_atlantic' || n.bloc === 'eastern_pact' || n.bloc === 'indo_pacific')
    );
    for (let i = 0; i < coreBlocMembers.length; i++) {
      for (let j = i + 1; j < coreBlocMembers.length; j++) {
        const a = coreBlocMembers[i];
        const b = coreBlocMembers[j];
        if (a.bloc === b.bloc) {
          alliances[pairKey(a.id, b.id)] = true;
        }
      }
    }
  }

  const diplomacy = getScenarioInitialDiplomacy(scenarioId);
  for (const [a, b] of diplomacy.alliances) {
    if (nations[a] && nations[b] && isSovereign(nations[a]) && isSovereign(nations[b])) {
      alliances[pairKey(a, b)] = true;
      relations[pairKey(a, b)] = Math.max(relations[pairKey(a, b)] ?? 0, 72);
    }
  }
  for (const [a, b, expiry] of diplomacy.nonAggressionPacts) {
    if (nations[a] && nations[b] && isSovereign(nations[a]) && isSovereign(nations[b])) {
      nonAggressionPacts[pairKey(a, b)] = expiry;
    }
  }
  for (const [a, b, rel] of diplomacy.relations) {
    if (nations[a] && nations[b] && isSovereign(nations[a]) && isSovereign(nations[b])) {
      relations[pairKey(a, b)] = rel;
    }
  }

  const wars: War[] = [];
  for (const w of diplomacy.initialWars) {
    if (
      nations[w.attackerId] &&
      nations[w.defenderId] &&
      isSovereign(nations[w.attackerId]) &&
      isSovereign(nations[w.defenderId])
    ) {
      wars.push({
        id: `war_0_${w.attackerId}_${w.defenderId}`,
        attackerId: w.attackerId,
        defenderId: w.defenderId,
        startTurn: 0,
        attackerControl: w.attackerControl ?? 0,
        defenderControl: 0,
        attackerLosses: 0,
        defenderLosses: 0,
        triggeredByAlliance: false,
      });
    }
  }

  const playerNation = nations[validPlayerId];
  const sovereignCount = Object.values(nations).filter((n) => isSovereign(n)).length;

  const openingNews: NewsEvent[] = [
    makeNews(
      0,
      'global',
      `${playerNation.name} assume il comando (${scenario.shortName})`,
      scenarioId === '1914'
        ? `Luglio 1914: la Crisi di Sarajevo infiamma l’Europa. Triplice Intesa e Imperi Centrali mobilitano milioni di soldati mentre ${sovereignCount} potenze sovrane decidono il destino del secolo.`
        : scenarioId === '1939'
          ? `Settembre 1939: la guerra esplode sul fronte polacco. Alleati e Potenze dell’Asse si scontrano mentre URSS (Patto Molotov-Ribbentrop) e Stati Uniti osservano gli sviluppi.`
          : `Gennaio 2026: tutte le ${sovereignCount} nazioni sono attive. Usa operazioni multi-dominio (Terra, Aria, Mare, Combinato) e guerra ibrida per plasmare l’equilibrio globale.`,
      [validPlayerId],
      scenarioId
    ),
    makeNews(
      0,
      'diplomacy',
      scenarioId === '1914'
        ? 'Ultimatum nei Balcani: mobilitazione generale in Europa'
        : scenarioId === '1939'
          ? 'Patto Germania–URSS in vigore · Fronte occidentale in allarme'
          : 'Blocchi geopolitici in stato di allerta',
      `Schieramento attuale di ${playerNation.name}: ${blocMeta[playerNation.bloc].name}.`,
      [validPlayerId],
      scenarioId
    ),
  ];

  return {
    version: GAME_STATE_VERSION,
    scenarioId,
    turn: 0,
    playerId: validPlayerId,
    globalTension: scenario.initialTension,
    nations,
    relations,
    alliances,
    nonAggressionPacts,
    sanctions: {},
    navalBlockades: {},
    wars,
    news: openingNews,
    lastBattleReport: null,
    battleHistory: [],
    offensivesThisTurn: {},
    diplomacyUsedThisTurn: {},
    covertUsedThisTurn: {},
    status: 'playing',
    worldConquestAchieved: false,
  };
}

function applyAnnexation(state: GameState, winnerId: string, loserId: string): void {
  const winner = state.nations[winnerId];
  const loser = state.nations[loserId];
  if (!winner || !loser) return;

  for (const prov of Object.values(state.nations)) {
    if (prov.ownerId === loserId) {
      prov.ownerId = winnerId;
    }
  }

  const spoils = round1(Math.max(10, loser.funds * 0.45 + loser.gdpIncome * 0.5));
  winner.funds = round1(Math.max(0, winner.funds + spoils));
  winner.manpower = roundInt(Math.max(0, winner.manpower + loser.manpower * 0.25));
  winner.stability = clamp(roundInt(winner.stability - 10), 15, 100);
  winner.aggressiveness = clamp(roundInt(winner.aggressiveness + 14), 0, 100);
  winner.annexations += 1;

  loser.army = { ground: 0, air: 0, navy: 0, defense: 0 };
  loser.funds = 0;
  loser.activeResearch = null;
  loser.internalCrisisActive = false;

  state.wars = state.wars.filter((w) => w.attackerId !== loserId && w.defenderId !== loserId);

  for (const key of Object.keys(state.alliances)) {
    if (key.includes(loserId)) delete state.alliances[key];
  }
  for (const key of Object.keys(state.sanctions)) {
    if (key.startsWith(`${loserId}->`) || key.endsWith(`->${loserId}`)) {
      delete state.sanctions[key];
    }
  }
  for (const key of Object.keys(state.navalBlockades)) {
    if (key.startsWith(`${loserId}->`) || key.endsWith(`->${loserId}`)) {
      delete state.navalBlockades[key];
    }
  }

  state.globalTension = clamp(roundInt(state.globalTension + 7), 0, 100);

  state.news.unshift(
    makeNews(
      state.turn,
      'war',
      `Caduta di ${loser.name}: annessione completata da ${winner.name}`,
      `${winner.name} assume il pieno controllo di ${loser.name} (+${spoils} B$ bottino). La resistenza locale riduce temporaneamente la stabilità (-10%).`,
      [winnerId, loserId]
    )
  );
}

function checkEndConditions(state: GameState): void {
  if (state.status !== 'playing') return;
  const player = state.nations[state.playerId];
  if (!player || player.ownerId !== player.id) {
    state.status = 'defeat';
    const conqueror = state.nations[player?.ownerId ?? ''];
    state.endReason = conqueror
      ? `${player?.name ?? 'La tua nazione'} è stata annessa da ${conqueror.name}. Il comando strategico è caduto.`
      : 'La tua nazione ha perso la propria sovranità.';
    return;
  }

  const allNations = Object.values(state.nations);
  const totalCount = allNations.length;
  const ownedCount = getControlledProvinces(state, state.playerId).length;

  if (ownedCount >= totalCount) {
    state.status = 'victory';
    state.worldConquestAchieved = true;
    state.endReason = `Conquista Totale del Mondo! ${player.name} ha unificato tutti i ${totalCount} territori del pianeta sotto un unico vessillo.`;
    return;
  }

  if (!state.worldConquestAchieved) {
    const totalWorldGdp = allNations.reduce((s, n) => s + n.gdpIncome, 0);
    const playerGdp = getControlledProvinces(state, state.playerId).reduce(
      (s, n) => s + n.gdpIncome,
      0
    );
    const gdpShare = totalWorldGdp > 0 ? playerGdp / totalWorldGdp : 0;

    if (ownedCount >= 18 || gdpShare >= 0.38) {
      state.status = 'victory';
      state.endReason = `${player.name} ha raggiunto l’egemonia geopolitica controllando ${ownedCount} territori (${Math.round(gdpShare * 100)}% del PIL mondiale). Puoi continuare per puntare alla Conquista Totale del Mondo.`;
    }
  }
}

function createWarEntry(
  state: GameState,
  attackerId: string,
  defenderId: string,
  triggeredByAlliance = false
): War | null {
  if (attackerId === defenderId) return null;
  if (areAtWar(state, attackerId, defenderId)) return null;
  const attacker = state.nations[attackerId];
  const defender = state.nations[defenderId];
  if (!attacker || !defender || !isSovereign(attacker) || !isSovereign(defender)) return null;

  delete state.alliances[pairKey(attackerId, defenderId)];
  delete state.nonAggressionPacts[pairKey(attackerId, defenderId)];
  setRelation(state, attackerId, defenderId, -100);

  const war: War = {
    id: `war_${state.turn}_${attackerId}_${defenderId}_${Math.random().toString(36).slice(2, 6)}`,
    attackerId,
    defenderId,
    startTurn: state.turn,
    attackerControl: 0,
    defenderControl: 0,
    attackerLosses: 0,
    defenderLosses: 0,
    triggeredByAlliance,
    attackerBeachhead: false,
    defenderBeachhead: false,
  };
  state.wars.push(war);
  return war;
}

function triggerDominoReactions(state: GameState, aggressorId: string, victimId: string): void {
  const aggressor = state.nations[aggressorId];
  const victim = state.nations[victimId];
  if (!aggressor || !victim) return;

  const potentialDefenders = getPotentialDefenders(state, aggressorId, victimId);
  const activatedAllies: NationState[] = [];

  const sortedDefenders = [...potentialDefenders].sort(
    (a, b) => getMilitaryRating(b) - getMilitaryRating(a)
  );

  for (const ally of sortedDefenders) {
    const isBilateral = areAllied(state, ally.id, victimId);
    const sameBloc = victim.bloc !== 'non_aligned' && ally.bloc === victim.bloc;
    const joinChance = isBilateral ? 0.8 : sameBloc ? 0.6 : 0.35;
    const tensionBoost = state.globalTension > 45 ? 0.15 : 0;

    if (Math.random() < joinChance + tensionBoost && activatedAllies.length < 3) {
      createWarEntry(state, ally.id, aggressorId, true);
      activatedAllies.push(ally);
      state.globalTension = clamp(roundInt(state.globalTension + 4), 0, 100);
    }
  }

  if (activatedAllies.length > 0) {
    const names = activatedAllies.map((a) => a.name).join(', ');
    state.news.unshift(
      makeNews(
        state.turn,
        'war',
        `Effetto Domino: ${names} ${activatedAllies.length === 1 ? 'entra' : 'entrano'} in guerra`,
        `Clausola di mutua difesa attivata a sostegno di ${victim.name} contro l’offensiva di ${aggressor.name}.`,
        [aggressorId, victimId, ...activatedAllies.map((a) => a.id)]
      )
    );
  }

  const victimNeighbors = new Set(victim.neighbors);
  const reactingPowers = Object.values(state.nations).filter(
    (n) =>
      isSovereign(n) &&
      n.id !== aggressorId &&
      n.id !== victimId &&
      !areAllied(state, n.id, aggressorId) &&
      (n.gdpIncome >= 24 ||
        victimNeighbors.has(n.id) ||
        (victim.bloc !== 'non_aligned' && n.bloc === victim.bloc))
  );

  const isNeutralTarget = victim.bloc === 'non_aligned' || Boolean(victim.strictNeutral);
  const basePenalty = victim.strictNeutral ? -22 : isNeutralTarget ? -14 : -10;

  const newSanctioners: string[] = [];
  const aidSenders: string[] = [];

  for (const other of reactingPowers) {
    const blocPenalty =
      other.bloc === victim.bloc && victim.bloc !== 'non_aligned' ? -24 : basePenalty;
    adjustRelation(state, other.id, aggressorId, blocPenalty);

    const relToAggressor = getRelation(state, other.id, aggressorId);

    if (
      !hasSanctioned(state, other.id, aggressorId) &&
      (relToAggressor <= -30 || aggressor.aggressiveness >= 28 || victim.strictNeutral) &&
      newSanctioners.length < (victim.strictNeutral ? 3 : 2) &&
      Math.random() < (victim.strictNeutral ? 0.45 : 0.28)
    ) {
      state.sanctions[sanctionKey(other.id, aggressorId)] = true;
      newSanctioners.push(other.name);
    }

    if (
      !areAtWar(state, other.id, aggressorId) &&
      relToAggressor <= -22 &&
      other.funds >= 35 &&
      aidSenders.length < 2 &&
      Math.random() < 0.25
    ) {
      other.funds = round1(Math.max(0, other.funds - 12));
      victim.army.ground = roundInt(victim.army.ground + 10);
      victim.army.defense = roundInt(victim.army.defense + 8);
      victim.funds = round1(victim.funds + 10);
      aidSenders.push(other.name);
    }
  }

  if (newSanctioners.length > 0) {
    state.news.unshift(
      makeNews(
        state.turn,
        'economy',
        `Sanzioni economiche contro ${aggressor.name}`,
        `${newSanctioners.join(', ')} impongono sanzioni finanziarie in risposta all’attacco contro ${victim.name}.`,
        [aggressorId]
      )
    );
  }

  if (aidSenders.length > 0) {
    state.news.unshift(
      makeNews(
        state.turn,
        'diplomacy',
        `Aiuti militari inviati a ${victim.name}`,
        `${aidSenders.join(' e ')} inviano rifornimenti e fondi a sostegno della difesa di ${victim.name}.`,
        [victimId]
      )
    );
  }
}

// ============================================================================
// PLAYER ACTIONS: MILITARY, TECH, DIPLOMACY, COVERT & FALSE FLAG
// ============================================================================

export function recruitUnits(
  state: GameState,
  branch: ArmyBranch,
  amount: number
): { state: GameState; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  if (!player || !isSovereign(player)) return { state, error: 'Nazione non disponibile.' };

  if (branch === 'navy' && !getControlledProvinces(next, player.id).some((p) => p.coastal)) {
    return { state, error: 'Serve almeno una provincia costiera per costruire una Marina.' };
  }

  const cost = getRecruitmentCost(player, branch, amount);
  if (player.funds < cost.funds) {
    return { state, error: `Fondi insufficienti (servono ${cost.funds} B$).` };
  }
  if (player.manpower < cost.manpower) {
    return { state, error: `Manodopera insufficiente (servono ${cost.manpower}k).` };
  }

  player.funds = round1(Math.max(0, player.funds - cost.funds));
  player.manpower = Math.max(0, roundInt(player.manpower - cost.manpower));
  player.army[branch] = roundInt(Math.max(0, player.army[branch] + amount));

  return { state: next };
}

export function stabilizeNation(state: GameState): { state: GameState; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  if (!player) return { state, error: 'Nazione non disponibile.' };
  const cost = 24;
  if (player.stability >= 98) return { state, error: 'Stabilità già al livello massimo.' };
  if (player.funds < cost) return { state, error: `Servono ${cost} B$ per investimenti interni.` };

  player.funds = round1(Math.max(0, player.funds - cost));
  player.stability = clamp(roundInt(player.stability + 10), 0, 100);
  if (player.stability >= 40) {
    player.internalCrisisActive = false;
  }
  return { state: next };
}

export function startResearch(
  state: GameState,
  techId: TechId
): { state: GameState; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const tech = getScenarioTech(next.scenarioId, techId);
  if (!player || !tech) return { state, error: 'Tecnologia non valida.' };
  if (player.researchedTechs.includes(techId)) {
    return { state, error: 'Tecnologia già completata.' };
  }
  if (player.activeResearch) {
    return { state, error: 'Una ricerca è già in corso.' };
  }
  if (player.funds < tech.cost) {
    return { state, error: `Fondi insufficienti (servono ${tech.cost} B$).` };
  }

  player.funds = round1(Math.max(0, player.funds - tech.cost));
  player.activeResearch = {
    techId,
    turnsRemaining: tech.turns,
    totalTurns: tech.turns,
  };
  return { state: next };
}

export function improveRelations(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  if (!player || !target || !isSovereign(target)) return { state, error: 'Bersaglio non valido.' };
  if (areAtWar(next, player.id, targetId)) {
    return { state, error: 'Impossibile migliorare relazioni durante una guerra.' };
  }
  if (next.diplomacyUsedThisTurn[targetId]) {
    return { state, error: 'Hai già svolto un’azione diplomatica con questa nazione in questo turno.' };
  }
  const cost = 10;
  if (player.funds < cost) return { state, error: `Servono ${cost} B$ per la missione diplomatica.` };

  player.funds = round1(Math.max(0, player.funds - cost));
  adjustRelation(next, player.id, targetId, 16);
  next.diplomacyUsedThisTurn[targetId] = true;

  if (hasSanctioned(next, targetId, player.id) && getRelation(next, player.id, targetId) >= -5) {
    delete next.sanctions[sanctionKey(targetId, player.id)];
    next.news.unshift(
      makeNews(
        next.turn,
        'diplomacy',
        `${target.name} revoca le sanzioni verso ${player.name}`,
        `Il disgelo diplomatico porta alla fine delle restrizioni economiche bilaterali.`,
        [player.id, targetId]
      )
    );
  }

  syncNewsDates(next);
  return { state: next, message: `Relazioni con ${target.name} migliorate (+16).` };
}

export function signNonAggression(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  if (!player || !target || !isSovereign(target)) return { state, error: 'Bersaglio non valido.' };
  if (areAtWar(next, player.id, targetId)) return { state, error: 'Siete già in guerra.' };
  if (hasNonAggressionPact(next, player.id, targetId)) {
    return { state, error: 'Patto di Non Aggressione già attivo.' };
  }
  const rel = getRelation(next, player.id, targetId);
  if (rel < 10) {
    return { state, error: `Relazioni troppo fredde (${rel}): servono almeno +10 per firmare il patto.` };
  }
  const cost = 12;
  if (player.funds < cost) return { state, error: `Servono ${cost} B$.` };

  player.funds = round1(Math.max(0, player.funds - cost));
  next.nonAggressionPacts[pairKey(player.id, targetId)] = next.turn + 12;
  adjustRelation(next, player.id, targetId, 10);
  next.diplomacyUsedThisTurn[targetId] = true;
  next.globalTension = clamp(roundInt(next.globalTension - 2), 0, 100);

  next.news.unshift(
    makeNews(
      next.turn,
      'diplomacy',
      `Patto di Non Aggressione tra ${player.name} e ${target.name}`,
      `I due governi hanno siglato una garanzia reciproca di sicurezza valida per 12 mesi.`,
      [player.id, targetId]
    )
  );

  syncNewsDates(next);
  return { state: next, message: `Patto firmato con ${target.name} per 12 mesi.` };
}

export function formAlliance(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  if (!player || !target || !isSovereign(target)) return { state, error: 'Bersaglio non valido.' };
  if (areAllied(next, player.id, targetId)) return { state, error: 'Siete già alleati.' };
  if (areAtWar(next, player.id, targetId)) return { state, error: 'Siete in guerra.' };
  const rel = getRelation(next, player.id, targetId);
  if (rel < 45) {
    return {
      state,
      error: `Servono relazioni di almeno +45 (attuali: ${rel}) per stringere un’alleanza militare.`,
    };
  }
  const cost = 18;
  if (player.funds < cost) return { state, error: `Servono ${cost} B$ per integrare i comandi militari.` };

  player.funds = round1(Math.max(0, player.funds - cost));
  next.alliances[pairKey(player.id, targetId)] = true;
  adjustRelation(next, player.id, targetId, 15);
  next.diplomacyUsedThisTurn[targetId] = true;

  next.news.unshift(
    makeNews(
      next.turn,
      'diplomacy',
      `Nuova Alleanza Militare: ${player.name} e ${target.name}`,
      `Le due potenze hanno firmato un trattato di mutua difesa vincolante.`,
      [player.id, targetId]
    )
  );

  syncNewsDates(next);
  return { state: next, message: `Alleanza militare siglata con ${target.name}!` };
}

export function toggleSanction(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  if (!player || !target || !isSovereign(target)) return { state, error: 'Bersaglio non valido.' };

  const key = sanctionKey(player.id, targetId);
  if (next.sanctions[key]) {
    delete next.sanctions[key];
    adjustRelation(next, player.id, targetId, 12);
    return { state: next, message: `Sanzioni verso ${target.name} revocate.` };
  } else {
    next.sanctions[key] = true;
    adjustRelation(next, player.id, targetId, -22);
    next.globalTension = clamp(roundInt(next.globalTension + 2), 0, 100);
    next.news.unshift(
      makeNews(
        next.turn,
        'economy',
        `${player.name} impone sanzioni economiche a ${target.name}`,
        `Restrizioni commerciali e finanziarie riducono le entrate mensili di ${target.name}.`,
        [player.id, targetId]
      )
    );
    syncNewsDates(next);
    return { state: next, message: `Sanzioni imposte contro ${target.name}.` };
  }
}

/** Any sovereign nation can declare war on ANY other sovereign nation; reach & power gap govern battle modes. */
export function declareWar(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  if (!player || !target || !isSovereign(target)) return { state, error: 'Bersaglio non valido.' };
  if (areAtWar(next, player.id, targetId)) return { state, error: 'Siete già in guerra.' };

  const brokePact = hasNonAggressionPact(next, player.id, targetId);
  const isNeutralTarget = target.bloc === 'non_aligned' || Boolean(target.strictNeutral);
  const isStrictNeutral = Boolean(target.strictNeutral);

  createWarEntry(next, player.id, targetId, false);

  const aggrGain = (brokePact ? 26 : 16) + (isStrictNeutral ? 14 : isNeutralTarget ? 7 : 0);
  const tensionGain = isStrictNeutral ? 18 : isNeutralTarget ? 14 : 10;
  const stabLoss = (brokePact ? 10 : 4) + (isStrictNeutral ? 4 : 0);

  player.aggressiveness = clamp(roundInt(player.aggressiveness + aggrGain), 0, 100);
  player.stability = clamp(roundInt(player.stability - stabLoss), 10, 100);
  next.globalTension = clamp(roundInt(next.globalTension + tensionGain), 0, 100);

  const headline = isStrictNeutral
    ? `Violazione della neutralità: ${player.name} attacca ${target.name}`
    : `${player.name} dichiara guerra a ${target.name}`;

  const detail = isStrictNeutral
    ? `L’aggressione contro lo stato neutrale ${target.name} provoca una crisi internazionale (+${tensionGain}% tensione globale) e forte ostilità diplomatica.`
    : isNeutralTarget
      ? `${player.name} apre le ostilità contro ${target.name} (+${tensionGain}% tensione globale). Scegli ora la modalità di attacco dal fronte.`
      : brokePact
        ? `Violando il Patto di Non Aggressione, ${player.name} apre le ostilità contro ${target.name}.`
        : `${player.name} apre le ostilità contro ${target.name}: seleziona attacco Terrestre, Raid Aereo, Marina o Combinato.`;

  next.news.unshift(makeNews(next.turn, 'war', headline, detail, [player.id, targetId]));

  triggerDominoReactions(next, player.id, targetId);
  syncNewsDates(next);

  return { state: next, message: `Guerra dichiarata contro ${target.name}.` };
}

export function proposePeace(
  state: GameState,
  targetId: string
): { state: GameState; message?: string; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  const war = getWarBetween(next, player.id, targetId);
  if (!player || !target || !war) return { state, error: 'Nessuna guerra attiva con questa nazione.' };

  const playerIsAttacker = war.attackerId === player.id;
  const playerControl = playerIsAttacker ? war.attackerControl : war.defenderControl;
  const enemyControl = playerIsAttacker ? war.defenderControl : war.attackerControl;
  const warDuration = next.turn - war.startTurn;

  const playerPower = getMilitaryRating(player);
  const targetPower = getMilitaryRating(target);
  const willingness =
    (playerControl - enemyControl) * 1.4 +
    warDuration * 8 +
    (playerPower > targetPower ? 25 : -10) +
    target.warExhaustion * 0.6;

  if (willingness < 18) {
    next.diplomacyUsedThisTurn[targetId] = true;
    return {
      state: next,
      error: `${target.name} respinge la proposta di pace: il fronte è ancora troppo favorevole al nemico.`,
    };
  }

  next.wars = next.wars.filter((w) => w.id !== war.id);
  delete next.navalBlockades[directedKey(player.id, targetId)];
  delete next.navalBlockades[directedKey(targetId, player.id)];
  next.nonAggressionPacts[pairKey(player.id, targetId)] = next.turn + 6;
  setRelation(next, player.id, targetId, -25);
  next.globalTension = clamp(roundInt(next.globalTension - 5), 0, 100);

  next.news.unshift(
    makeNews(
      next.turn,
      'diplomacy',
      `Armistizio firmato tra ${player.name} e ${target.name}`,
      `Le ostilità cessano con una tregua di 6 mesi e ripristino dei confini attuali.`,
      [player.id, targetId]
    )
  );

  syncNewsDates(next);
  return { state: next, message: `${target.name} ha accettato l’armistizio!` };
}

export function launchPlayerOffensive(
  state: GameState,
  defenderId: string,
  allocationPercent: number,
  mode: AttackMode = 'ground'
): { state: GameState; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const defender = next.nations[defenderId];
  if (!player || !defender || !isSovereign(defender)) {
    return { state, error: 'Bersaglio non disponibile.' };
  }

  const war = getWarBetween(next, player.id, defenderId);
  if (!war) return { state, error: 'Devi prima dichiarare guerra.' };

  if ((next.offensivesThisTurn[defenderId] ?? 0) >= 1) {
    return {
      state,
      error: 'Hai già condotto un’operazione militare su questo fronte questo mese. Avanza al Prossimo Turno.',
    };
  }

  const eligibility = checkAttackModeEligibility(next, player.id, defenderId, mode);
  if (!eligibility.allowed) {
    return { state, error: eligibility.reason ?? 'Modalità di attacco non disponibile.' };
  }

  if (eligibility.costFunds > 0) {
    player.funds = round1(Math.max(0, player.funds - eligibility.costFunds));
  }

  const result = resolveOffensive(next, war, player.id, defenderId, allocationPercent, mode);
  player.army = result.attackerArmy;
  defender.army = result.defenderArmy;

  if (result.defenderFundsDelta !== 0) {
    defender.funds = round1(Math.max(0, defender.funds + result.defenderFundsDelta));
  }
  if (result.defenderStabilityDelta !== 0) {
    defender.stability = clamp(roundInt(defender.stability + result.defenderStabilityDelta), 5, 100);
    if (defender.stability < 30) defender.internalCrisisActive = true;
  }
  if (result.disableAirDefTurns > 0) {
    defender.airDefenseDisabledUntilTurn = Math.max(
      defender.airDefenseDisabledUntilTurn,
      next.turn + result.disableAirDefTurns
    );
  }
  if (result.imposeBlockadeTurns > 0) {
    next.navalBlockades[directedKey(player.id, defenderId)] =
      next.turn + result.imposeBlockadeTurns;
  }

  const isOriginalAttacker = war.attackerId === player.id;
  if (isOriginalAttacker) {
    war.attackerControl = result.newControl;
    if (result.establishBeachhead) war.attackerBeachhead = true;
    war.attackerLosses += result.report.attackerLosses.ground + result.report.attackerLosses.air;
    war.defenderLosses += result.report.defenderLosses.ground + result.report.defenderLosses.air;
  } else {
    war.defenderControl = result.newControl;
    if (result.establishBeachhead) war.defenderBeachhead = true;
    war.defenderLosses += result.report.attackerLosses.ground + result.report.attackerLosses.air;
    war.attackerLosses += result.report.defenderLosses.ground + result.report.defenderLosses.air;
  }

  next.offensivesThisTurn[defenderId] = (next.offensivesThisTurn[defenderId] ?? 0) + 1;
  next.lastBattleReport = result.report;
  next.battleHistory = [result.report, ...next.battleHistory].slice(0, 30);

  if (result.annexed) {
    applyAnnexation(next, player.id, defenderId);
  } else {
    const modeHeadline =
      mode === 'air_raid'
        ? `Raid aereo su ${defender.name}`
        : mode === 'naval_blockade'
          ? `Operazione navale contro ${defender.name}`
          : mode === 'amphibious'
            ? `Sbarco anfibio su ${defender.name}`
            : mode === 'combined'
              ? `Attacco combinato su ${defender.name}`
              : `Battaglia di ${defender.name}`;
    next.news.unshift(
      makeNews(next.turn, 'war', modeHeadline, result.report.summary, [player.id, defenderId])
    );
  }

  syncNewsDates(next);
  checkEndConditions(next);
  return { state: next };
}

/** Hybrid Warfare, Instability & False Flag Operations (usable in peacetime or war) */
export function executeCovertOperation(
  state: GameState,
  targetId: string,
  opType: CovertOpType,
  framedNationId?: string
): { state: GameState; outcome?: CovertOpOutcome; error?: string } {
  const next = cloneState(state);
  const player = next.nations[next.playerId];
  const target = next.nations[targetId];
  const scenarioOps = getScenarioCovertOps(next.scenarioId);
  const spec = scenarioOps[opType];

  if (!player || !target || !spec || !isSovereign(target)) {
    return { state, error: 'Bersaglio non valido.' };
  }
  if (targetId === player.id) {
    return { state, error: 'Non puoi eseguire operazioni coperte sul tuo stesso territorio.' };
  }
  if (next.covertUsedThisTurn[targetId]) {
    return {
      state,
      error: 'Hai già condotto un’operazione coperta contro questa nazione in questo mese.',
    };
  }

  const isFalseFlag =
    Boolean(framedNationId) &&
    spec.supportsFalseFlag &&
    framedNationId !== player.id &&
    framedNationId !== targetId &&
    Boolean(next.nations[framedNationId!]) &&
    isSovereign(next.nations[framedNationId!]);

  const totalCost = spec.cost + (isFalseFlag ? spec.falseFlagExtraCost : 0);
  if (player.funds < totalCost) {
    return { state, error: `Fondi insufficienti (servono ${totalCost} B$).` };
  }

  player.funds = round1(Math.max(0, player.funds - totalCost));
  next.covertUsedThisTurn[targetId] = true;

  const detectionRisk = getCovertDetectionRisk(
    player,
    target,
    opType,
    isFalseFlag,
    next.scenarioId
  );
  const detected = Math.random() * 100 < detectionRisk;

  // Apply operational damage to target (even if later exposed, covert strike still has partial or full impact)
  let triggeredCrisis = false;
  let effectSummary = '';

  if (opType === 'propaganda') {
    const stabDrop = 10 + Math.floor(Math.random() * 5);
    target.stability = clamp(roundInt(target.stability - stabDrop), 5, 100);
    effectSummary = `Stabilità di ${target.name} ridotta di -${stabDrop}% (ora ${target.stability}%).`;
  } else if (opType === 'cyber') {
    const fundsLoss = round1(clamp(target.gdpIncome * 0.42, 8, 32));
    target.funds = round1(Math.max(0, target.funds - fundsLoss));
    target.cyberDisruptedUntilTurn = Math.max(target.cyberDisruptedUntilTurn, next.turn + 3);
    target.airDefenseDisabledUntilTurn = Math.max(
      target.airDefenseDisabledUntilTurn,
      next.turn + 3
    );
    target.stability = clamp(roundInt(target.stability - 4), 5, 100);
    effectSummary =
      next.scenarioId === '2026'
        ? `Difese aeree disattivate e PIL -20% per 3 mesi (-${fundsLoss} B$ drenati).`
        : `Comunicazioni e cifrari compromessi: ricognizione/difesa aerea accecata e PIL -20% per 3 mesi (-${fundsLoss} B$ drenati).`;
  } else if (opType === 'sabotage') {
    const defLoss = Math.max(2, roundInt(target.army.defense * 0.14));
    const groundLoss = Math.max(1, roundInt(target.army.ground * 0.06));
    target.army.defense = Math.max(0, roundInt(target.army.defense - defLoss));
    target.army.ground = Math.max(0, roundInt(target.army.ground - groundLoss));
    target.sabotagedUntilTurn = Math.max(target.sabotagedUntilTurn, next.turn + 3);
    target.stability = clamp(roundInt(target.stability - 6), 5, 100);
    effectSummary = `Sabotate difese (-${defLoss} unità, -30% bonus difensivo per 3 mesi) e Stabilità -6%.`;
  } else {
    // rebels
    const stabDrop = 12 + Math.floor(Math.random() * 5);
    target.stability = clamp(roundInt(target.stability - stabDrop), 5, 100);
    if (target.stability < 30) {
      triggeredCrisis = true;
      target.internalCrisisActive = true;
      const gLoss = Math.max(4, roundInt(target.army.ground * 0.2));
      const dLoss = Math.max(3, roundInt(target.army.defense * 0.18));
      const fLoss = round1(clamp(target.funds * 0.28, 8, 40));
      target.army.ground = Math.max(0, roundInt(target.army.ground - gLoss));
      target.army.defense = Math.max(0, roundInt(target.army.defense - dLoss));
      target.funds = round1(Math.max(0, target.funds - fLoss));
      next.globalTension = clamp(roundInt(next.globalTension + 6), 0, 100);
      effectSummary = `RIVOLTA INTERNA esplosa in ${target.name} (Stabilità ${target.stability}%): -${gLoss} Terrestri, -${dLoss} Difesa, -${fLoss} B$ e crisi attiva (-20% efficacia)!`;
    } else {
      effectSummary = `Opposizione finanziata in ${target.name}: Stabilità scesa al ${target.stability}% (sotto il 30% esplode la rivolta).`;
    }
  }

  // Case A: Operation EXPOSED by enemy intelligence
  if (detected) {
    adjustRelation(next, player.id, targetId, isFalseFlag ? -52 : -36);
    player.aggressiveness = clamp(roundInt(player.aggressiveness + (isFalseFlag ? 22 : 12)), 0, 100);
    next.globalTension = clamp(roundInt(next.globalTension + (isFalseFlag ? 12 : 6)), 0, 100);
    next.sanctions[sanctionKey(targetId, player.id)] = true;

    let extraDetail = '';
    if (isFalseFlag && framedNationId) {
      const framed = next.nations[framedNationId];
      if (framed) {
        adjustRelation(next, player.id, framed.id, -58);
        next.sanctions[sanctionKey(framed.id, player.id)] = true;
        extraDetail = ` Anche ${framed.name}, incastrata nel tentativo di False Flag, rompe i rapporti e impone sanzioni!`;
      }
    }

    const headline = isFalseFlag
      ? `SCANDALO FALSE FLAG: ${player.name} smascherata da ${target.name}!`
      : `Intelligence: operazione coperta di ${player.name} scoperta in ${target.name}`;

    const detail = `${target.name} ha attribuito l’attacco (${spec.name}) a ${player.name}, imponendo sanzioni immediate.${extraDetail} ${effectSummary}`;

    next.news.unshift(
      makeNews(next.turn, 'covert', headline, detail, [player.id, targetId], next.scenarioId)
    );
    syncNewsDates(next);

    return {
      state: next,
      outcome: {
        success: false,
        detected: true,
        triggeredCrisis,
        headline,
        detail,
      },
    };
  }

  // Case B: Undetected FALSE FLAG — blame shifts to framed third nation!
  if (isFalseFlag && framedNationId) {
    const framed = next.nations[framedNationId];
    const relDrop = opType === 'sabotage' ? -72 : -58;
    adjustRelation(next, targetId, framed.id, relDrop);
    next.globalTension = clamp(roundInt(next.globalTension + 7), 0, 100);

    const newRel = getRelation(next, targetId, framed.id);
    const warChance =
      newRel <= -55 ? 0.85 : newRel <= -35 ? 0.65 : next.globalTension >= 45 ? 0.45 : 0.2;

    let triggeredWarBetween: [string, string] | undefined;
    if (!areAtWar(next, targetId, framed.id) && Math.random() < warChance) {
      createWarEntry(next, targetId, framed.id, false);
      triggeredWarBetween = [targetId, framed.id];
      next.globalTension = clamp(roundInt(next.globalTension + 9), 0, 100);

      const warHeadline = `False Flag riuscito: ${target.name} dichiara guerra a ${framed.name}!`;
      const warDetail = `Convinta che ${framed.name} abbia condotto l’operazione (${spec.name}), ${target.name} apre le ostilità! ${effectSummary}`;
      next.news.unshift(
        makeNews(next.turn, 'war', warHeadline, warDetail, [targetId, framed.id], next.scenarioId)
      );
      // Domino chain reaction between their alliance blocs!
      triggerDominoReactions(next, targetId, framed.id);
      syncNewsDates(next);

      return {
        state: next,
        outcome: {
          success: true,
          detected: false,
          triggeredWarBetween,
          triggeredCrisis,
          headline: warHeadline,
          detail: warDetail,
        },
      };
    }

    const ffHeadline = `False Flag riuscito: ${target.name} accusa ${framed.name}`;
    const ffDetail = `${target.name} attribuisce l’operazione (${spec.name}) a ${framed.name} (relazioni crollate a ${newRel}). ${effectSummary}`;
    next.news.unshift(
      makeNews(next.turn, 'covert', ffHeadline, ffDetail, [targetId, framed.id], next.scenarioId)
    );
    syncNewsDates(next);

    return {
      state: next,
      outcome: {
        success: true,
        detected: false,
        triggeredCrisis,
        headline: ffHeadline,
        detail: ffDetail,
      },
    };
  }

  // Case C: Undetected Anonymous Covert Operation
  const anonHeadline = triggeredCrisis
    ? `Crisi Interna e Rivolta in ${target.name}`
    : `${spec.name} anonimo su ${target.name}`;
  const anonDetail = `Operazione riuscita senza lasciare tracce. ${effectSummary}`;
  next.news.unshift(
    makeNews(next.turn, 'covert', anonHeadline, anonDetail, [targetId], next.scenarioId)
  );
  syncNewsDates(next);

  return {
    state: next,
    outcome: {
      success: true,
      detected: false,
      triggeredCrisis,
      headline: anonHeadline,
      detail: anonDetail,
    },
  };
}

// ============================================================================
// TURN SIMULATION & AI / DOMINO ENGINE
// ============================================================================

export function advanceTurn(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  const next = cloneState(state);
  next.turn += 1;
  next.offensivesThisTurn = {};
  next.diplomacyUsedThisTurn = {};
  next.covertUsedThisTurn = {};
  next.lastBattleReport = null;

  // Purge expired naval blockades
  for (const [key, expiry] of Object.entries(next.navalBlockades)) {
    const [blkId, victimId] = key.split('->');
    if (expiry < next.turn || !areAtWar(next, blkId, victimId)) {
      delete next.navalBlockades[key];
    }
  }

  const sovereigns = Object.values(next.nations).filter(isSovereign);

  // 1. Monthly economy, manpower, stability, crisis recovery, tech progress
  for (const nation of sovereigns) {
    const eco = getMonthlyEconomy(next, nation.id);
    nation.funds = round1(Math.max(0, nation.funds + eco.netIncome));

    const ownedProvs = getControlledProvinces(next, nation.id);
    const totalGrowth = ownedProvs.reduce(
      (sum, p) => sum + (p.id === nation.id ? p.manpowerGrowth : p.manpowerGrowth * 0.45),
      0
    );
    nation.manpower = roundInt(clamp(nation.manpower + totalGrowth, 0, 6000));

    const activeWars = next.wars.filter(
      (w) => w.attackerId === nation.id || w.defenderId === nation.id
    );
    if (activeWars.length > 0) {
      nation.warExhaustion = clamp(roundInt(nation.warExhaustion + activeWars.length * 2), 0, 100);
      if (nation.warExhaustion > 35) {
        nation.stability = clamp(roundInt(nation.stability - 1), 10, 100);
      }
    } else {
      nation.warExhaustion = clamp(roundInt(nation.warExhaustion - 4), 0, 100);
      const stabRecovery = hasTech(nation, 'cyber_warfare') ? 2 : 1;
      if (nation.stability < 82) {
        nation.stability = clamp(roundInt(nation.stability + stabRecovery), 10, 100);
      }
      nation.aggressiveness = clamp(roundInt(nation.aggressiveness - 2), 0, 100);
    }

    // Internal crisis resolution/persistence
    if (nation.internalCrisisActive) {
      if (nation.stability >= 42) {
        nation.internalCrisisActive = false;
      } else {
        nation.army.ground = Math.max(4, roundInt(nation.army.ground * 0.97));
      }
    } else if (nation.stability < 25) {
      nation.internalCrisisActive = true;
    }

    if (nation.activeResearch) {
      nation.activeResearch.turnsRemaining -= 1;
      if (nation.activeResearch.turnsRemaining <= 0) {
        const finishedId = nation.activeResearch.techId;
        if (!nation.researchedTechs.includes(finishedId)) {
          nation.researchedTechs.push(finishedId);
          if (finishedId === 'cyber_warfare') {
            nation.stability = clamp(roundInt(nation.stability + 10), 0, 100);
          }
        }
        nation.activeResearch = null;
        if (nation.id === next.playerId) {
          const spec = getScenarioTech(next.scenarioId, finishedId);
          next.news.unshift(
            makeNews(
              next.turn,
              'economy',
              `Ricerca completata: ${spec.name}`,
              `${nation.name} ha schierato ${spec.name} (${spec.shortBonus}).`,
              [nation.id],
              next.scenarioId
            )
          );
        }
      }
    }
  }

  // 2. AI recruitment & research
  const scenarioTechs = getScenarioTechnologies(next.scenarioId);
  for (const nation of sovereigns) {
    if (nation.id === next.playerId) continue;

    if (!nation.activeResearch && nation.funds > 75 && Math.random() < 0.14) {
      const available = scenarioTechs.filter(
        (t) => !nation.researchedTechs.includes(t.id) && nation.funds >= t.cost + 20
      );
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        nation.funds = round1(Math.max(0, nation.funds - pick.cost));
        nation.activeResearch = {
          techId: pick.id,
          turnsRemaining: pick.turns,
          totalTurns: pick.turns,
        };
      }
    }

    const atWar = next.wars.some((w) => w.attackerId === nation.id || w.defenderId === nation.id);
    if (
      nation.funds > (atWar ? 24 : 58) &&
      nation.manpower >= 15 &&
      Math.random() < (atWar ? 0.65 : 0.28)
    ) {
      const branches: ArmyBranch[] = nation.coastal
        ? ['ground', 'ground', 'air', 'defense', 'navy']
        : ['ground', 'ground', 'air', 'defense'];
      const chosen = branches[Math.floor(Math.random() * branches.length)];
      const cost = getRecruitmentCost(nation, chosen, 10);
      if (nation.funds >= cost.funds && nation.manpower >= cost.manpower) {
        nation.funds = round1(Math.max(0, nation.funds - cost.funds));
        nation.manpower = Math.max(0, roundInt(nation.manpower - cost.manpower));
        nation.army[chosen] = roundInt(nation.army[chosen] + 10);
      }
    }
  }

  // 3. AI multi-domain offensives on active wars
  const warsSnapshot = [...next.wars];
  for (const warRef of warsSnapshot) {
    const war = next.wars.find((w) => w.id === warRef.id);
    if (!war) continue;

    const atk = next.nations[war.attackerId];
    const def = next.nations[war.defenderId];
    if (!atk || !def || !isSovereign(atk) || !isSovereign(def)) continue;

    const sides: Array<{ actorId: string; targetId: string }> = [
      { actorId: war.attackerId, targetId: war.defenderId },
      { actorId: war.defenderId, targetId: war.attackerId },
    ];

    for (const side of sides) {
      if (side.actorId === next.playerId) continue;
      const currentWar = next.wars.find((w) => w.id === war.id);
      if (!currentWar) break;

      const actor = next.nations[side.actorId];
      const target = next.nations[side.targetId];
      if (!actor || !target || !isSovereign(actor) || !isSovereign(target)) continue;

      const reach = checkMilitaryReach(next, actor.id, target.id);
      let chosenMode: AttackMode | null = null;
      if (reach.viaLand && actor.army.ground >= 16) {
        chosenMode = actor.funds >= 25 && actor.army.air >= 20 && Math.random() < 0.35 ? 'combined' : 'ground';
      } else if (reach.viaSea && actor.army.ground >= 16) {
        chosenMode = Math.random() < 0.3 ? 'naval_blockade' : 'amphibious';
      } else if (actor.army.air >= 18 && actor.funds >= 12) {
        chosenMode = 'air_raid';
      }

      if (!chosenMode) continue;

      const actorRating = getMilitaryRating(actor);
      const targetRating = getMilitaryRating(target);
      const shouldAttack =
        (chosenMode === 'air_raid' || actorRating >= targetRating * 0.7) &&
        Math.random() < (target.id === next.playerId ? 0.52 : 0.44);

      if (shouldAttack) {
        const alloc = clamp(Math.round(45 + Math.random() * 25), 40, 75);
        const result = resolveOffensive(next, currentWar, actor.id, target.id, alloc, chosenMode);
        actor.army = result.attackerArmy;
        target.army = result.defenderArmy;

        if (result.defenderFundsDelta !== 0) {
          target.funds = round1(Math.max(0, target.funds + result.defenderFundsDelta));
        }
        if (result.imposeBlockadeTurns > 0) {
          next.navalBlockades[directedKey(actor.id, target.id)] =
            next.turn + result.imposeBlockadeTurns;
        }

        if (currentWar.attackerId === actor.id) {
          currentWar.attackerControl = result.newControl;
          if (result.establishBeachhead) currentWar.attackerBeachhead = true;
        } else {
          currentWar.defenderControl = result.newControl;
          if (result.establishBeachhead) currentWar.defenderBeachhead = true;
        }

        if (target.id === next.playerId) {
          next.lastBattleReport = result.report;
          next.battleHistory = [result.report, ...next.battleHistory].slice(0, 30);
        }

        if (result.annexed) {
          applyAnnexation(next, actor.id, target.id);
          break;
        } else if (target.id === next.playerId || Math.random() < 0.3) {
          next.news.unshift(
            makeNews(
              next.turn,
              'war',
              `Offensiva di ${actor.name} contro ${target.name}`,
              result.report.summary,
              [actor.id, target.id]
            )
          );
        }
      }
    }
  }

  // 4. Domino Effect: Defensive Coalition against hyper-aggressive player
  const player = next.nations[next.playerId];
  if (player && isSovereign(player) && player.aggressiveness >= 42) {
    const coalitionChance = clamp((player.aggressiveness - 35) / 140, 0.05, 0.32);
    if (Math.random() < coalitionChance) {
      const candidates = sovereigns.filter(
        (n) =>
          n.id !== player.id &&
          !n.strictNeutral &&
          !areAtWar(next, n.id, player.id) &&
          !areAllied(next, n.id, player.id) &&
          !hasNonAggressionPact(next, n.id, player.id) &&
          getRelation(next, n.id, player.id) <= -28 &&
          checkMilitaryReach(next, n.id, player.id).canReach &&
          getMilitaryRating(n) >= getMilitaryRating(player) * 0.4
      );
      if (candidates.length > 0) {
        const leader = candidates[Math.floor(Math.random() * candidates.length)];
        createWarEntry(next, leader.id, player.id, true);
        next.globalTension = clamp(roundInt(next.globalTension + 7), 0, 100);
        next.news.unshift(
          makeNews(
            next.turn,
            'war',
            `Coalizione Difensiva: ${leader.name} dichiara guerra a ${player.name}`,
            `Allarmata dall’espansionismo di ${player.name} (Aggressività ${player.aggressiveness}%), ${leader.name} interviene per contenere l’escalation.`,
            [leader.id, player.id]
          )
        );
      }
    }
  }

  // 5. Third-party regional flashpoints & AI-vs-AI wars based on Global Tension
  const activeAiWars = next.wars.filter(
    (w) => w.attackerId !== next.playerId && w.defenderId !== next.playerId
  ).length;

  const flashpointChance =
    next.globalTension >= 65 ? 0.28 : next.globalTension >= 40 ? 0.16 : 0.07;

  if (activeAiWars < 4 && Math.random() < flashpointChance) {
    const potentialAttackers = sovereigns.filter(
      (n) =>
        n.id !== next.playerId &&
        !n.strictNeutral &&
        n.army.ground >= 60 &&
        !next.wars.some((w) => w.attackerId === n.id || w.defenderId === n.id)
    );
    if (potentialAttackers.length > 0) {
      const actor = potentialAttackers[Math.floor(Math.random() * potentialAttackers.length)];
      const rivalTargets = sovereigns.filter(
        (t) =>
          t.id !== actor.id &&
          t.id !== next.playerId &&
          !t.strictNeutral &&
          !areAllied(next, actor.id, t.id) &&
          getRelation(next, actor.id, t.id) <= -25 &&
          checkMilitaryReach(next, actor.id, t.id).canReach
      );
      if (rivalTargets.length > 0) {
        const victim = rivalTargets[Math.floor(Math.random() * rivalTargets.length)];
        createWarEntry(next, actor.id, victim.id, false);
        actor.aggressiveness = clamp(roundInt(actor.aggressiveness + 14), 0, 100);
        next.globalTension = clamp(roundInt(next.globalTension + 6), 0, 100);
        next.news.unshift(
          makeNews(
            next.turn,
            'war',
            `Crisi regionale: ${actor.name} attacca ${victim.name}`,
            `L’alta tensione internazionale sfocia in un conflitto aperto tra ${actor.name} e ${victim.name}.`,
            [actor.id, victim.id]
          )
        );
        triggerDominoReactions(next, actor.id, victim.id);
      }
    }
  }

  // 6. Natural peace settlement for exhausted AI-only wars
  for (const war of [...next.wars]) {
    if (war.attackerId === next.playerId || war.defenderId === next.playerId) continue;
    if (next.turn - war.startTurn >= 10 && Math.random() < 0.22) {
      const a = next.nations[war.attackerId];
      const b = next.nations[war.defenderId];
      next.wars = next.wars.filter((w) => w.id !== war.id);
      if (a && b) {
        next.news.unshift(
          makeNews(
            next.turn,
            'diplomacy',
            `Cessate il fuoco tra ${a.name} e ${b.name}`,
            `Dopo mesi di logoramento, i due paesi firmano una tregua mediata a livello internazionale.`,
            [a.id, b.id]
          )
        );
      }
    }
  }

  // 7. Gentle global tension drift
  if (next.wars.length === 0) {
    next.globalTension = clamp(roundInt(next.globalTension - 2), 10, 100);
  } else {
    next.globalTension = clamp(
      roundInt(next.globalTension + (next.wars.length >= 4 ? 2 : 0)),
      10,
      100
    );
  }

  next.news = next.news.slice(0, 60);
  syncNewsDates(next);

  checkEndConditions(next);
  return next;
}
