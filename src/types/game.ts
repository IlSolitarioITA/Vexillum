export type ScenarioId = '2026' | '1914' | '1939';

export type BlocId =
  | 'euro_atlantic'
  | 'eastern_pact'
  | 'indo_pacific'
  | 'arab_league'
  | 'non_aligned';

export type RegionId =
  | 'Europa'
  | 'Americhe'
  | 'Asia e Oceania'
  | 'Medio Oriente e Nord Africa'
  | 'Africa Subsahariana';

export type MapMode = 'political' | 'relations';

export type ArmyBranch = 'ground' | 'air' | 'navy' | 'defense';

export type AttackMode = 'ground' | 'air_raid' | 'amphibious' | 'naval_blockade' | 'combined';

export type CovertOpType = 'propaganda' | 'cyber' | 'sabotage' | 'rebels';

export type BudgetSector = 'defense' | 'education' | 'welfare' | 'infrastructure';

export type SpendingLevel = 'cut' | 'normal' | 'boosted';

export interface BudgetPolicy {
  defense: SpendingLevel;
  education: SpendingLevel;
  welfare: SpendingLevel;
  infrastructure: SpendingLevel;
}

export type TechId =
  | 'tactical_drones'
  | 'integrated_air_defense'
  | 'war_industry'
  | 'modern_logistics'
  | 'cyber_warfare'
  | 'joint_doctrine'
  | 'amphibious_projection'
  | 'precision_artillery';

export type FlagPattern =
  | 'vertical3'
  | 'horizontal3'
  | 'horizontal2'
  | 'nordic'
  | 'canton'
  | 'circle'
  | 'cross'
  | 'diagonal'
  | 'solid_emblem';

export interface FlagSpec {
  pattern: FlagPattern;
  colors: [string, string, string?];
  accent?: string;
}

export interface ArmyBranches {
  ground: number;
  air: number;
  navy: number;
  defense: number;
}

export interface ActiveResearch {
  techId: TechId;
  turnsRemaining: number;
  totalTurns: number;
}

export interface NationSeed {
  id: string;
  name: string;
  region: RegionId;
  bloc: BlocId;
  capitalCoords: [number, number]; // [lon, lat]
  gdpIncome: number; // B$ per turn
  startingFunds: number; // B$
  manpower: number; // thousands of recruitable personnel
  manpowerGrowth: number; // thousands per turn
  stability: number; // 0-100
  coastal: boolean;
  strictNeutral?: boolean;
  terrainDefense: number; // 1.0 to 1.35 natural defense multiplier
  army: ArmyBranches;
  neighbors: string[];
  flag: FlagSpec;
  recommended?: boolean;
  summary: string;
}

export interface NationState extends NationSeed {
  ownerId: string;
  funds: number;
  /** Sovereign public debt in B$ */
  publicDebt: number;
  /** Public spending policy across 4 state sectors (Defense, Education, Welfare, Infrastructure) */
  budgetPolicy: BudgetPolicy;
  /** Territory economic reconstruction & integration yield (0.55..1.0; 1.0 for homeland core) */
  integration: number;
  aggressiveness: number; // 0-100
  researchedTechs: TechId[];
  activeResearch: ActiveResearch | null;
  warExhaustion: number; // 0-100
  annexations: number;
  /** Hybrid warfare & instability status timers (active while state.turn <= value) */
  airDefenseDisabledUntilTurn: number;
  cyberDisruptedUntilTurn: number;
  sabotagedUntilTurn: number;
  internalCrisisActive: boolean;
}

export interface War {
  id: string;
  attackerId: string;
  defenderId: string;
  startTurn: number;
  attackerControl: number; // 0 to 100
  defenderControl: number; // 0 to 100
  attackerLosses: number;
  defenderLosses: number;
  triggeredByAlliance?: boolean;
  /** True once an amphibious landing establishes a bridgehead allowing follow-up ground offensives */
  attackerBeachhead?: boolean;
  defenderBeachhead?: boolean;
}

export interface BattleReport {
  id: string;
  turn: number;
  dateLabel: string;
  attackMode: AttackMode;
  attackerId: string;
  attackerName: string;
  defenderId: string;
  defenderName: string;
  isNavalAssault: boolean;
  distanceKm: number;
  allocationPercent: number;
  attackerEffectivePower: number;
  defenderEffectivePower: number;
  attackerLosses: ArmyBranches;
  defenderLosses: ArmyBranches;
  fundsDamaged?: number;
  blockadeImposed?: boolean;
  controlBefore: number;
  controlAfter: number;
  outcome: 'decisive_victory' | 'victory' | 'stalemate' | 'defeat';
  annexed: boolean;
  summary: string;
}

export interface CovertOpOutcome {
  success: boolean;
  detected: boolean;
  triggeredWarBetween?: [string, string];
  triggeredCrisis?: boolean;
  headline: string;
  detail: string;
}

export type NewsCategory = 'war' | 'diplomacy' | 'economy' | 'global' | 'covert';

export interface NewsEvent {
  id: string;
  turn: number;
  dateLabel: string;
  category: NewsCategory;
  headline: string;
  detail: string;
  nationIds?: string[];
}

export type GameEventKind = 'national' | 'world_council';

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  pros: string;
  cons: string;
  tone?: 'neutral' | 'aggressive' | 'diplomatic' | 'economic';
}

export interface GameEvent {
  id: string;
  templateId: string;
  turn: number;
  dateLabel: string;
  kind: GameEventKind;
  title: string;
  subtitle: string;
  description: string;
  involvedNationId?: string;
  secondaryNationId?: string;
  choices: EventChoice[];
}

export interface TechDefinition {
  id: TechId;
  name: string;
  shortBonus: string;
  description: string;
  cost: number;
  turns: number;
  category: 'offense' | 'defense' | 'economy' | 'doctrine';
}

export interface GameState {
  version: number;
  scenarioId: ScenarioId;
  turn: number; // 0 = mese iniziale dello scenario
  playerId: string;
  globalTension: number; // 0-100
  /** Progressive geopolitical friction counter driving realistic AI flashpoints */
  geopoliticalFriction: number;
  /** Turn index of the last interactive decision/World Council event */
  lastEventTurn: number;
  /** Currently active interactive decision event awaiting player choice */
  pendingEvent: GameEvent | null;
  nations: Record<string, NationState>;
  relations: Record<string, number>;
  alliances: Record<string, boolean>;
  nonAggressionPacts: Record<string, number>;
  sanctions: Record<string, boolean>;
  /** Directed naval blockades keyed by `${attackerId}->${defenderId}` -> expiry turn */
  navalBlockades: Record<string, number>;
  wars: War[];
  news: NewsEvent[];
  lastBattleReport: BattleReport | null;
  battleHistory: BattleReport[];
  offensivesThisTurn: Record<string, number>;
  diplomacyUsedThisTurn: Record<string, boolean>;
  covertUsedThisTurn: Record<string, boolean>;
  status: 'playing' | 'victory' | 'defeat';
  worldConquestAchieved?: boolean;
  endReason?: string;
}

export type SaveSlotId = 'slot_1' | 'slot_2' | 'slot_3' | 'slot_4' | 'slot_5';

export interface SaveMeta {
  slotId: SaveSlotId;
  savedAt: string;
  scenarioId: ScenarioId;
  scenarioShortName: string;
  playerName: string;
  playerId: string;
  dateLabel: string;
  turn: number;
  territoriesCount: number;
  totalTerritories: number;
  funds: number;
}

export interface SaveSlotSummary {
  slotId: SaveSlotId;
  label: string;
  meta: SaveMeta | null;
}
