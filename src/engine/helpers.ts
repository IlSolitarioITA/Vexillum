import { getScenarioDefinition } from '../data/scenarios';
import { BRANCH_INFO } from '../data/technologies';
import {
  ArmyBranches,
  AttackMode,
  BudgetPolicy,
  BudgetSector,
  GameState,
  NationSeed,
  NationState,
  ScenarioId,
  SpendingLevel,
  TechId,
  War,
} from '../types/game';

const MONTHS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

export const DEFAULT_BUDGET_POLICY: BudgetPolicy = {
  defense: 'normal',
  education: 'normal',
  welfare: 'normal',
  infrastructure: 'normal',
};

export function safeNum(value: number, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  const n = safeNum(value, min);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

export function round1(value: number): number {
  return Math.round(safeNum(value, 0) * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(safeNum(value, 0) * 100) / 100;
}

export function roundInt(value: number): number {
  return Math.round(safeNum(value, 0));
}

export function getBudgetPolicy(nation?: Partial<NationState> | null): BudgetPolicy {
  const p = nation?.budgetPolicy;
  const valid = (v: unknown): SpendingLevel =>
    v === 'cut' || v === 'normal' || v === 'boosted' ? v : 'normal';
  return {
    defense: valid(p?.defense),
    education: valid(p?.education),
    welfare: valid(p?.welfare),
    infrastructure: valid(p?.infrastructure),
  };
}

/** Computes exact 100%-normalized public budget shares from the 4 sector spending levels */
export function getBudgetSharesPercent(policy: BudgetPolicy): Record<BudgetSector, number> {
  const weightOf = (lvl: SpendingLevel) => (lvl === 'cut' ? 12 : lvl === 'boosted' ? 38 : 25);
  const raw: Record<BudgetSector, number> = {
    defense: weightOf(policy.defense),
    education: weightOf(policy.education),
    welfare: weightOf(policy.welfare),
    infrastructure: weightOf(policy.infrastructure),
  };
  const total = raw.defense + raw.education + raw.welfare + raw.infrastructure;
  const sectors: BudgetSector[] = ['defense', 'education', 'welfare', 'infrastructure'];
  const shares: Record<BudgetSector, number> = {
    defense: 25,
    education: 25,
    welfare: 25,
    infrastructure: 25,
  };
  let sum = 0;
  for (const s of sectors) {
    shares[s] = Math.round((raw[s] / total) * 100);
    sum += shares[s];
  }
  if (sum !== 100) {
    const largest = sectors.reduce((a, b) => (shares[a] >= shares[b] ? a : b));
    shares[largest] += 100 - sum;
  }
  return shares;
}

export function getResearchSpeedMultiplier(nation: NationState): number {
  const policy = getBudgetPolicy(nation);
  if (policy.education === 'boosted') return 1.4;
  if (policy.education === 'cut') return 0.65;
  return 1.0;
}

export function getDefenseCombatMultiplier(nation: NationState): number {
  const policy = getBudgetPolicy(nation);
  if (policy.defense === 'boosted') return 1.08;
  if (policy.defense === 'cut') return 0.9;
  return 1.0;
}

export function formatTurnDate(turn: number, scenarioId: ScenarioId = '2026'): string {
  const def = getScenarioDefinition(scenarioId);
  const safeTurn = Math.max(0, Math.floor(safeNum(turn, 0)));
  const totalMonths = def.startMonthIndex + safeTurn;
  const monthIdx = totalMonths % 12;
  const year = def.startYear + Math.floor(totalMonths / 12);
  return `${MONTHS_IT[monthIdx]} ${year}`;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function directedKey(actorId: string, targetId: string): string {
  return `${actorId}->${targetId}`;
}

export function sanctionKey(imposerId: string, targetId: string): string {
  return `${imposerId}->${targetId}`;
}

export function hasTech(nation: NationState, techId: TechId): boolean {
  return nation.researchedTechs.includes(techId);
}

/** Great-circle Haversine distance in kilometers between two [lon, lat] points */
export function computeDistanceKm(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const dist = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, h))));
  return roundInt(safeNum(dist, 1000));
}

export function getDistanceLogisticsFactor(
  state: GameState,
  attacker: NationState,
  defender: NationState,
  mode: AttackMode
): { distanceKm: number; factor: number; label: string } {
  const distanceKm = computeDistanceKm(attacker.capitalCoords, defender.capitalCoords);
  const policy = getBudgetPolicy(attacker);
  const infraMod =
    policy.infrastructure === 'boosted' ? 0.04 : policy.infrastructure === 'cut' ? -0.06 : 0;

  if (hasLandBorder(state, attacker.id, defender.id) && mode !== 'naval_blockade') {
    const f = clamp(1.0 + Math.min(0, infraMod), 0.92, 1.0);
    return {
      distanceKm,
      factor: f,
      label: f < 1 ? `Confine diretto (${Math.round(f * 100)}% log.)` : 'Confine diretto (100%)',
    };
  }

  const hasLog = hasTech(attacker, 'modern_logistics');
  const hasAmph = hasTech(attacker, 'amphibious_projection');

  if (distanceKm < 2200) {
    const f = clamp((hasLog ? 0.96 : 0.9) + infraMod, 0.8, 1.0);
    return { distanceKm, factor: f, label: `Raggio regionale (${Math.round(f * 100)}%)` };
  }
  if (distanceKm < 6500) {
    const f = clamp(0.76 + (hasLog ? 0.08 : 0) + (hasAmph ? 0.06 : 0) + infraMod, 0.66, 0.95);
    return {
      distanceKm,
      factor: f,
      label: `Proiezione intercontinentale (${Math.round(f * 100)}%)`,
    };
  }
  const f = clamp(0.62 + (hasLog ? 0.09 : 0) + (hasAmph ? 0.07 : 0) + infraMod, 0.56, 0.88);
  return { distanceKm, factor: f, label: `Lungo raggio transoceanico (${Math.round(f * 100)}%)` };
}

export function getDefaultRelation(
  a?: NationSeed,
  b?: NationSeed,
  scenarioId: ScenarioId = '2026'
): number {
  if (!a || !b || a.id === b.id) return 100;
  if (a.bloc !== 'non_aligned' && a.bloc === b.bloc) return 56;
  if (
    (a.bloc === 'euro_atlantic' && b.bloc === 'eastern_pact') ||
    (a.bloc === 'eastern_pact' && b.bloc === 'euro_atlantic')
  ) {
    return scenarioId === '2026' ? -46 : -64;
  }
  if (scenarioId === '1939') {
    if (a.bloc === 'indo_pacific' || b.bloc === 'indo_pacific') {
      const other = a.bloc === 'indo_pacific' ? b.bloc : a.bloc;
      if (other === 'eastern_pact') return -18;
      if (other === 'euro_atlantic') return -15;
    }
  } else {
    if (
      (a.bloc === 'indo_pacific' && b.bloc === 'eastern_pact') ||
      (a.bloc === 'eastern_pact' && b.bloc === 'indo_pacific')
    ) {
      return -40;
    }
    if (
      (a.bloc === 'euro_atlantic' && b.bloc === 'indo_pacific') ||
      (a.bloc === 'indo_pacific' && b.bloc === 'euro_atlantic')
    ) {
      return scenarioId === '1914' ? 68 : 36;
    }
  }
  if (a.strictNeutral || b.strictNeutral) return 12;
  return 5;
}

export function getRelation(state: GameState, a: string, b: string): number {
  if (a === b) return 100;
  const key = pairKey(a, b);
  if (typeof state.relations[key] === 'number') {
    return clamp(state.relations[key], -100, 100);
  }
  return getDefaultRelation(state.nations[a], state.nations[b], state.scenarioId);
}

export function areAllied(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  return Boolean(state.alliances[pairKey(a, b)]);
}

export function hasNonAggressionPact(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  const expiry = state.nonAggressionPacts[pairKey(a, b)];
  return typeof expiry === 'number' && expiry >= state.turn;
}

export function getWarBetween(state: GameState, a: string, b: string): War | undefined {
  return state.wars.find(
    (w) => (w.attackerId === a && w.defenderId === b) || (w.attackerId === b && w.defenderId === a)
  );
}

export function areAtWar(state: GameState, a: string, b: string): boolean {
  return Boolean(getWarBetween(state, a, b));
}

export function getActiveWarsForNation(state: GameState, nationId: string): War[] {
  return state.wars.filter((w) => w.attackerId === nationId || w.defenderId === nationId);
}

export function getControlledProvinces(state: GameState, ownerId: string): NationState[] {
  return Object.values(state.nations).filter((n) => n.ownerId === ownerId);
}

export function isSovereign(nation: NationState): boolean {
  return nation.ownerId === nation.id;
}

export function isEmpireCoastal(state: GameState, ownerId: string): boolean {
  return getControlledProvinces(state, ownerId).some((p) => p.coastal);
}

export function hasLandBorder(state: GameState, a: string, b: string): boolean {
  if (a === b) return false;
  const provincesA = getControlledProvinces(state, a);
  const provincesBSet = new Set(getControlledProvinces(state, b).map((p) => p.id));
  for (const prov of provincesA) {
    for (const neighborId of prov.neighbors) {
      if (provincesBSet.has(neighborId)) {
        return true;
      }
    }
  }
  return false;
}

export function hasBeachheadAgainst(state: GameState, attackerId: string, defenderId: string): boolean {
  const war = getWarBetween(state, attackerId, defenderId);
  if (!war) return false;
  return war.attackerId === attackerId ? Boolean(war.attackerBeachhead) : Boolean(war.defenderBeachhead);
}

export function isUnderNavalBlockade(state: GameState, targetId: string): boolean {
  for (const [key, expiry] of Object.entries(state.navalBlockades ?? {})) {
    if (typeof expiry !== 'number' || expiry < state.turn) continue;
    const [blockaderId, victim] = key.split('->');
    if (
      victim === targetId &&
      state.nations[blockaderId] &&
      isSovereign(state.nations[blockaderId]) &&
      areAtWar(state, blockaderId, targetId)
    ) {
      return true;
    }
  }
  return false;
}

export interface AttackModeEligibility {
  allowed: boolean;
  costFunds: number;
  reason?: string;
}

export function checkAttackModeEligibility(
  state: GameState,
  attackerId: string,
  defenderId: string,
  mode: AttackMode
): AttackModeEligibility {
  const attacker = state.nations[attackerId];
  const defender = state.nations[defenderId];
  if (!attacker || !defender || !isSovereign(attacker) || !isSovereign(defender)) {
    return { allowed: false, costFunds: 0, reason: 'Nazione non valida.' };
  }

  const land = hasLandBorder(state, attackerId, defenderId);
  const beachhead = hasBeachheadAgainst(state, attackerId, defenderId);
  const atkCoast = isEmpireCoastal(state, attackerId);
  const defCoast = isEmpireCoastal(state, defenderId);
  const minNavyAmph = hasTech(attacker, 'amphibious_projection') ? 20 : 35;
  const minNavyBlockade = hasTech(attacker, 'amphibious_projection') ? 16 : 26;

  if (mode === 'ground') {
    if (!land && !beachhead) {
      return {
        allowed: false,
        costFunds: 0,
        reason: 'Serve un confine terrestre diretto oppure una testa di ponte ottenuta tramite Assalto Anfibio.',
      };
    }
    if (attacker.army.ground < 6) {
      return { allowed: false, costFunds: 0, reason: 'Servono almeno 6 unità di Forze Terrestri.' };
    }
    return { allowed: true, costFunds: 0 };
  }

  if (mode === 'air_raid') {
    if (attacker.army.air < 8) {
      return { allowed: false, costFunds: 6, reason: 'Servono almeno 8 unità di Aviazione per condurre un Raid Aereo.' };
    }
    if (attacker.funds < 6) {
      return { allowed: false, costFunds: 6, reason: 'Servono 6 B$ di carburante e munizionamento aereo.' };
    }
    return { allowed: true, costFunds: 6 };
  }

  if (mode === 'amphibious') {
    if (!atkCoast || !defCoast) {
      return {
        allowed: false,
        costFunds: 10,
        reason: 'Entrambe le nazioni devono avere accesso al mare per un Assalto Anfibio.',
      };
    }
    if (attacker.army.navy < minNavyAmph) {
      return {
        allowed: false,
        costFunds: 10,
        reason: `Serve una Marina di almeno ${minNavyAmph} unità (attuale: ${roundInt(attacker.army.navy)}).`,
      };
    }
    if (attacker.army.ground < 8) {
      return { allowed: false, costFunds: 10, reason: 'Servono almeno 8 unità Terrestri da sbarcare.' };
    }
    if (attacker.funds < 10) {
      return { allowed: false, costFunds: 10, reason: 'Servono 10 B$ per la logistica dello sbarco anfibio.' };
    }
    return { allowed: true, costFunds: 10 };
  }

  if (mode === 'naval_blockade') {
    if (!atkCoast || !defCoast) {
      return {
        allowed: false,
        costFunds: 8,
        reason: 'Il Blocco Navale richiede che entrambi gli stati abbiano accesso al mare.',
      };
    }
    if (attacker.army.navy < minNavyBlockade) {
      return {
        allowed: false,
        costFunds: 8,
        reason: `Serve una Marina di almeno ${minNavyBlockade} unità per imporre un Blocco Navale.`,
      };
    }
    if (attacker.funds < 8) {
      return { allowed: false, costFunds: 8, reason: 'Servono 8 B$ per dispiegare la flotta di blocco.' };
    }
    return { allowed: true, costFunds: 8 };
  }

  const canReachCombined = land || beachhead || (atkCoast && defCoast && attacker.army.navy >= minNavyAmph);
  if (!canReachCombined) {
    return {
      allowed: false,
      costFunds: 18,
      reason: 'Serve confine terrestre, testa di ponte o una Marina adeguata per un Attacco Combinato.',
    };
  }
  if (attacker.army.ground < 10 || attacker.army.air < 10) {
    return {
      allowed: false,
      costFunds: 18,
      reason: 'L’Attacco Combinato richiede almeno 10 unità Terrestri e 10 di Aviazione.',
    };
  }
  if (attacker.funds < 18) {
    return { allowed: false, costFunds: 18, reason: 'Servono 18 B$ per coordinare l’Attacco Combinato.' };
  }
  return { allowed: true, costFunds: 18 };
}

export interface ReachabilityResult {
  canReach: boolean;
  viaLand: boolean;
  viaSea: boolean;
  requiredNavy: number;
  reason?: string;
}

export function checkMilitaryReach(
  state: GameState,
  attackerId: string,
  defenderId: string
): ReachabilityResult {
  const attacker = state.nations[attackerId];
  const defender = state.nations[defenderId];
  if (!attacker || !defender) {
    return { canReach: false, viaLand: false, viaSea: false, requiredNavy: 0, reason: 'Nazione non valida.' };
  }
  if (hasLandBorder(state, attackerId, defenderId) || hasBeachheadAgainst(state, attackerId, defenderId)) {
    return { canReach: true, viaLand: true, viaSea: false, requiredNavy: 0 };
  }

  const attackerCoastal = isEmpireCoastal(state, attackerId);
  const defenderCoastal = isEmpireCoastal(state, defenderId);
  const requiredNavy = hasTech(attacker, 'amphibious_projection') ? 20 : 35;

  if (attackerCoastal && defenderCoastal && attacker.army.navy >= requiredNavy) {
    return { canReach: true, viaLand: false, viaSea: true, requiredNavy };
  }
  return {
    canReach: false,
    viaLand: false,
    viaSea: false,
    requiredNavy,
    reason: !attackerCoastal
      ? 'Senza sbocco sul mare puoi condurre offensive terrestri solo su confini diretti (puoi usare Raid Aerei).'
      : !defenderCoastal
        ? `${defender.name} non ha coste: servono confini terrestri per invadere, ma puoi usare Raid Aerei.`
        : `Servono almeno ${requiredNavy} unità di Marina per uno sbarco anfibio (puoi comunque usare Raid Aerei).`,
  };
}

export function getSanctionImposers(state: GameState, targetId: string): string[] {
  const imposers: string[] = [];
  for (const key of Object.keys(state.sanctions)) {
    if (!state.sanctions[key]) continue;
    const [imposerId, target] = key.split('->');
    if (target === targetId && state.nations[imposerId] && isSovereign(state.nations[imposerId])) {
      imposers.push(imposerId);
    }
  }
  return imposers;
}

export function hasSanctioned(state: GameState, imposerId: string, targetId: string): boolean {
  return Boolean(state.sanctions[sanctionKey(imposerId, targetId)]);
}

export function getTotalArmyUnits(army: ArmyBranches): number {
  return roundInt(
    Math.max(0, safeNum(army.ground)) +
      Math.max(0, safeNum(army.air)) +
      Math.max(0, safeNum(army.navy)) +
      Math.max(0, safeNum(army.defense))
  );
}

export function getMilitaryRating(nation: NationSeed | NationState): number {
  const techCount = 'researchedTechs' in nation ? nation.researchedTechs.length : 0;
  const techMult = 1 + techCount * 0.08;
  const crisisFactor = 'internalCrisisActive' in nation && nation.internalCrisisActive ? 0.8 : 1.0;
  const defPolicyFactor = 'budgetPolicy' in nation ? getDefenseCombatMultiplier(nation) : 1.0;
  const raw =
    safeNum(nation.army.ground) * 1.15 +
    safeNum(nation.army.air) * 1.3 +
    safeNum(nation.army.navy) * 0.95 +
    safeNum(nation.army.defense) * 1.0;
  return roundInt(Math.max(0, raw * techMult * crisisFactor * defPolicyFactor));
}

export function getDifficultyBadge(seed: NationSeed): {
  label: 'Facile' | 'Media' | 'Difficile' | 'Estrema';
  colorClass: string;
} {
  const score = seed.gdpIncome * 4 + getMilitaryRating(seed);
  if (score >= 560) return { label: 'Facile', colorClass: 'text-emerald-400' };
  if (score >= 300) return { label: 'Media', colorClass: 'text-cyan-300' };
  if (score >= 165) return { label: 'Difficile', colorClass: 'text-amber-300' };
  return { label: 'Estrema', colorClass: 'text-rose-400' };
}

export interface EconomyBreakdown {
  baseGdp: number;
  annexedGdp: number;
  annexedCount: number;
  avgAnnexedIntegrationPercent: number;
  techBonus: number;
  stabilityFactor: number;
  infraFactor: number;
  sanctionPenaltyPercent: number;
  blockadePenaltyPercent: number;
  cyberPenaltyPercent: number;
  crisisPenaltyPercent: number;
  grossIncome: number;
  civilianCost: number;
  adminCost: number;
  upkeep: number;
  publicDebt: number;
  annualGdp: number;
  debtToGdpPercent: number;
  debtInterestRateMonthly: number;
  debtInterest: number;
  netIncome: number;
  monthlyStabilityDelta: number;
  researchSpeedPercent: number;
  budgetShares: Record<BudgetSector, number>;
}

export function getMonthlyEconomy(state: GameState, nationId: string): EconomyBreakdown {
  const nation = state.nations[nationId];
  if (!nation || !isSovereign(nation)) {
    return {
      baseGdp: 0,
      annexedGdp: 0,
      annexedCount: 0,
      avgAnnexedIntegrationPercent: 100,
      techBonus: 0,
      stabilityFactor: 1,
      infraFactor: 1,
      sanctionPenaltyPercent: 0,
      blockadePenaltyPercent: 0,
      cyberPenaltyPercent: 0,
      crisisPenaltyPercent: 0,
      grossIncome: 0,
      civilianCost: 0,
      adminCost: 0,
      upkeep: 0,
      publicDebt: 0,
      annualGdp: 0,
      debtToGdpPercent: 0,
      debtInterestRateMonthly: 0,
      debtInterest: 0,
      netIncome: 0,
      monthlyStabilityDelta: 0,
      researchSpeedPercent: 100,
      budgetShares: { defense: 25, education: 25, welfare: 25, infrastructure: 25 },
    };
  }

  const policy = getBudgetPolicy(nation);
  const budgetShares = getBudgetSharesPercent(policy);
  const ownedProvinces = getControlledProvinces(state, nationId);
  const annexedProvs = ownedProvinces.filter((p) => p.id !== nationId);

  const baseGdp = safeNum(nation.gdpIncome, 7);
  let annexedGdpRaw = 0;
  let integrationSum = 0;
  let adminCostRaw = 0;

  for (const prov of annexedProvs) {
    const integ = clamp(safeNum(prov.integration, 0.65), 0.55, 1.0);
    const provGdp = safeNum(prov.gdpIncome, 0);
    annexedGdpRaw += provGdp * integ;
    integrationSum += integ;
    // Newly annexed regions cost more to administer until stabilized & reconstructed
    adminCostRaw += provGdp * (0.08 + (1 - integ) * 0.12);
  }

  const avgAnnexedIntegrationPercent =
    annexedProvs.length > 0 ? roundInt((integrationSum / annexedProvs.length) * 100) : 100;

  const stabilityFactor = clamp(0.6 + (safeNum(nation.stability, 70) / 100) * 0.44, 0.52, 1.04);
  const infraFactor =
    policy.infrastructure === 'boosted' ? 1.1 : policy.infrastructure === 'cut' ? 0.9 : 1.0;
  const techMult = hasTech(nation, 'war_industry') ? 1.18 : 1.0;

  const imposers = getSanctionImposers(state, nationId);
  const sanctionPenaltyPercent = clamp(imposers.length * 10, 0, 45);
  const blockadePenaltyPercent = isUnderNavalBlockade(state, nationId) ? 28 : 0;
  const cyberPenaltyPercent = safeNum(nation.cyberDisruptedUntilTurn, -1) >= state.turn ? 20 : 0;
  const crisisPenaltyPercent = nation.internalCrisisActive ? 20 : 0;

  const totalPenalty = clamp(
    sanctionPenaltyPercent + blockadePenaltyPercent + cyberPenaltyPercent + crisisPenaltyPercent,
    0,
    72
  );
  const disruptionFactor = 1 - totalPenalty / 100;

  const activeGdpBase = baseGdp + annexedGdpRaw;
  const rawGross = activeGdpBase * stabilityFactor * infraFactor;
  const techBonus = round1(rawGross * (techMult - 1));
  const grossIncome = round1(Math.max(2, rawGross * techMult * disruptionFactor));

  // Public spending on civilian services (Education, Welfare, Infrastructure)
  // Cutting a sector frees liquid funds for war; boosting invests in research, stability, or GDP.
  const sectorCostShare = (lvl: SpendingLevel, cutRate: number, normRate: number, boostRate: number) =>
    lvl === 'cut' ? cutRate : lvl === 'boosted' ? boostRate : normRate;

  const eduShare = sectorCostShare(policy.education, 0.025, 0.08, 0.145);
  const welfareShare = sectorCostShare(policy.welfare, 0.03, 0.095, 0.165);
  const infraShare = sectorCostShare(policy.infrastructure, 0.02, 0.075, 0.135);
  // Defense allocation adjusts readiness & operational overhead
  const defenseBaseShare = sectorCostShare(policy.defense, -0.02, 0.02, 0.085);

  const civilianCost = round1(
    Math.max(0, grossIncome * (eduShare + welfareShare + infraShare + Math.max(0, defenseBaseShare)))
  );
  const adminCost = round1(Math.max(0, adminCostRaw));

  // Military Upkeep
  const logisticsFactor = hasTech(nation, 'modern_logistics') ? 0.8 : 1.0;
  const infraUpkeepMod =
    policy.infrastructure === 'boosted' ? 0.92 : policy.infrastructure === 'cut' ? 1.1 : 1.0;
  const defenseUpkeepMod =
    policy.defense === 'cut' ? 0.82 : policy.defense === 'boosted' ? 1.08 : 1.0;

  const rawUpkeep =
    safeNum(nation.army.ground) * BRANCH_INFO.ground.upkeepPerUnit +
    safeNum(nation.army.air) * BRANCH_INFO.air.upkeepPerUnit +
    safeNum(nation.army.navy) * BRANCH_INFO.navy.upkeepPerUnit +
    safeNum(nation.army.defense) * BRANCH_INFO.defense.upkeepPerUnit;
  const upkeep = round1(Math.max(0, rawUpkeep * logisticsFactor * infraUpkeepMod * defenseUpkeepMod));

  // Sovereign Public Debt & Monthly Interest
  const publicDebt = round1(Math.max(0, safeNum(nation.publicDebt, baseGdp * 12 * 0.35)));
  const annualGdp = round1(Math.max(12, activeGdpBase * 12));
  const debtToGdpPercent = roundInt((publicDebt / annualGdp) * 100);

  let debtInterestRateMonthly = 0.0075; // 0.75%/mese (~9% annuo nominale di gioco)
  if (debtToGdpPercent > 140) {
    debtInterestRateMonthly = 0.022; // Sovereign crisis spread
  } else if (debtToGdpPercent > 100) {
    debtInterestRateMonthly = 0.014; // Elevated risk spread
  }
  const debtInterest = round1(publicDebt * debtInterestRateMonthly);

  const netIncome = round1(grossIncome - civilianCost - adminCost - upkeep - debtInterest);

  // Projected monthly stability delta from policies, war, and debt pressure
  const activeWarsCount = state.wars.filter(
    (w) => w.attackerId === nationId || w.defenderId === nationId
  ).length;

  let monthlyStabilityDelta = 0;
  if (policy.welfare === 'cut') monthlyStabilityDelta -= 2;
  else if (policy.welfare === 'boosted') monthlyStabilityDelta += 2;

  if (debtToGdpPercent > 140) monthlyStabilityDelta -= 3;
  else if (debtToGdpPercent > 100) monthlyStabilityDelta -= 1;

  if (policy.welfare === 'cut' && debtToGdpPercent > 100) {
    monthlyStabilityDelta -= 1; // Double austerity + debt shock
  }

  if (activeWarsCount > 0 && nation.warExhaustion > 35) {
    monthlyStabilityDelta -= 1;
  } else if (activeWarsCount === 0 && nation.stability < 82) {
    monthlyStabilityDelta += hasTech(nation, 'cyber_warfare') ? 2 : 1;
  }

  const researchSpeedPercent = roundInt(getResearchSpeedMultiplier(nation) * 100);

  return {
    baseGdp: round1(baseGdp),
    annexedGdp: round1(annexedGdpRaw),
    annexedCount: annexedProvs.length,
    avgAnnexedIntegrationPercent,
    techBonus,
    stabilityFactor: round2(stabilityFactor),
    infraFactor: round2(infraFactor),
    sanctionPenaltyPercent,
    blockadePenaltyPercent,
    cyberPenaltyPercent,
    crisisPenaltyPercent,
    grossIncome,
    civilianCost,
    adminCost,
    upkeep,
    publicDebt,
    annualGdp,
    debtToGdpPercent,
    debtInterestRateMonthly,
    debtInterest,
    netIncome,
    monthlyStabilityDelta,
    researchSpeedPercent,
    budgetShares,
  };
}

export function getRecruitmentCost(
  nation: NationState,
  branch: keyof ArmyBranches,
  amount: number
): { funds: number; manpower: number; monthlyUpkeepDelta: number } {
  const spec = BRANCH_INFO[branch];
  const policy = getBudgetPolicy(nation);
  const techDiscount = hasTech(nation, 'war_industry') ? 0.85 : 1.0;
  const defenseDiscount = policy.defense === 'boosted' ? 0.88 : policy.defense === 'cut' ? 1.12 : 1.0;
  const batches = Math.max(0.5, amount / 10);

  const logisticsFactor = hasTech(nation, 'modern_logistics') ? 0.8 : 1.0;
  const infraUpkeepMod =
    policy.infrastructure === 'boosted' ? 0.92 : policy.infrastructure === 'cut' ? 1.1 : 1.0;
  const defenseUpkeepMod =
    policy.defense === 'cut' ? 0.82 : policy.defense === 'boosted' ? 1.08 : 1.0;

  return {
    funds: round1(spec.costFundsPer10 * batches * techDiscount * defenseDiscount),
    manpower: roundInt(Math.max(1, spec.costManpowerPer10 * batches)),
    monthlyUpkeepDelta: round2(
      amount * spec.upkeepPerUnit * logisticsFactor * infraUpkeepMod * defenseUpkeepMod
    ),
  };
}

export function getPotentialDefenders(
  state: GameState,
  attackerId: string,
  targetId: string
): NationState[] {
  const target = state.nations[targetId];
  if (!target || !isSovereign(target)) return [];

  return Object.values(state.nations).filter((candidate) => {
    if (candidate.id === attackerId || candidate.id === targetId) return false;
    if (!isSovereign(candidate)) return false;
    if (areAtWar(state, attackerId, candidate.id)) return false;
    if (areAllied(state, candidate.id, targetId)) return true;
    if (
      target.bloc !== 'non_aligned' &&
      candidate.bloc === target.bloc &&
      getRelation(state, candidate.id, targetId) >= 25 &&
      getRelation(state, candidate.id, attackerId) < 40
    ) {
      return true;
    }
    return false;
  });
}

export function getRelationLabel(score: number): string {
  if (score >= 60) return 'Eccellenti';
  if (score >= 25) return 'Amichevoli';
  if (score >= -15) return 'Neutrali';
  if (score >= -50) return 'Tese';
  return 'Ostili';
}
