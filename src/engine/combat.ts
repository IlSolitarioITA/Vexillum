import { ArmyBranches, AttackMode, BattleReport, GameState, NationState, War } from '../types/game';
import {
  clamp,
  formatTurnDate,
  getDistanceLogisticsFactor,
  hasLandBorder,
  hasTech,
  round1,
  roundInt,
  safeNum,
} from './helpers';

export interface CombatPreview {
  mode: AttackMode;
  attackerPower: number;
  defenderPower: number;
  ratio: number;
  distanceKm: number;
  logisticsLabel: string;
  oddsLabel: string;
  oddsTone: 'favorable' | 'balanced' | 'risky';
  expectedEffect: string;
}

export function computeDomainForces(
  state: GameState,
  attacker: NationState,
  defender: NationState,
  allocationPercent: number,
  mode: AttackMode
): {
  attackerPower: number;
  defenderPower: number;
  distanceKm: number;
  logisticsLabel: string;
  attackerAirRatio: number;
} {
  const frac = clamp(allocationPercent, 15, 90) / 100;
  const { distanceKm, factor: distFactor, label: logisticsLabel } = getDistanceLogisticsFactor(
    state,
    attacker,
    defender,
    mode
  );

  const atkGround = Math.max(0, safeNum(attacker.army.ground) * frac);
  const atkAir = Math.max(0, safeNum(attacker.army.air) * frac);
  const atkNavy = Math.max(0, safeNum(attacker.army.navy) * frac);

  const defGround = Math.max(1, safeNum(defender.army.ground));
  const defAir = Math.max(0, safeNum(defender.army.air));
  const defNavy = Math.max(0, safeNum(defender.army.navy));
  const defDefense = Math.max(0, safeNum(defender.army.defense));

  // Attacker technology & morale multipliers
  let atkTech = 1.0;
  if (hasTech(attacker, 'tactical_drones')) atkTech *= 1.18;
  if (hasTech(attacker, 'precision_artillery')) atkTech *= 1.16;
  if (hasTech(attacker, 'joint_doctrine')) atkTech *= 1.22;

  const atkStab = clamp(0.78 + (safeNum(attacker.stability, 70) / 100) * 0.26, 0.75, 1.05);
  const atkCrisis = attacker.internalCrisisActive ? 0.8 : 1.0;

  // Defender technology, terrain, hybrid warfare debuffs & morale
  const airDefDisabled = safeNum(defender.airDefenseDisabledUntilTurn, -1) >= state.turn;
  const sabotaged = safeNum(defender.sabotagedUntilTurn, -1) >= state.turn;

  let defTech = safeNum(defender.terrainDefense, 1.12);
  if (hasTech(defender, 'integrated_air_defense') && !airDefDisabled) defTech *= 1.26;
  if (hasTech(defender, 'precision_artillery')) defTech *= 1.14;
  if (hasTech(defender, 'joint_doctrine')) defTech *= 1.15;
  if (hasTech(attacker, 'cyber_warfare')) defTech *= 0.85;
  if (sabotaged) defTech *= 0.72;
  if (defender.internalCrisisActive) defTech *= 0.78;

  const defStab = clamp(0.75 + (safeNum(defender.stability, 70) / 100) * 0.28, 0.72, 1.05);
  const effectiveDefUnits = sabotaged ? defDefense * 0.65 : defDefense;
  const fortBonus = 1 + clamp((effectiveDefUnits / Math.max(50, defGround + 60)) * 0.48, 0.05, 0.58);

  const rawAirAdvantage = atkAir / Math.max(10, defAir + 10);

  let attackerPower = 10;
  let defenderPower = 10;

  if (mode === 'air_raid') {
    const airDefFactor = airDefDisabled ? 0.45 : hasTech(defender, 'integrated_air_defense') ? 1.35 : 1.0;
    attackerPower = Math.max(
      5,
      atkAir * 1.55 * atkTech * atkStab * atkCrisis * Math.max(0.72, distFactor)
    );
    defenderPower = Math.max(
      5,
      (defAir * 1.15 + effectiveDefUnits * 0.7) * airDefFactor * defStab * (defender.internalCrisisActive ? 0.82 : 1.0)
    );
  } else if (mode === 'naval_blockade') {
    const amphBoost = hasTech(attacker, 'amphibious_projection') ? 1.2 : 1.0;
    attackerPower = Math.max(
      5,
      (atkNavy * 1.45 + atkAir * 0.45) * atkTech * amphBoost * atkStab * atkCrisis * distFactor
    );
    defenderPower = Math.max(
      5,
      (defNavy * 1.3 + defAir * 0.4 + effectiveDefUnits * 0.35) * defStab * (sabotaged ? 0.8 : 1.0)
    );
  } else if (mode === 'amphibious') {
    const amphBoost = hasTech(attacker, 'amphibious_projection') ? 1.28 : 0.84;
    const airBonus = 1 + clamp((rawAirAdvantage - 0.5) * 0.2, -0.05, airDefDisabled ? 0.32 : 0.22);
    attackerPower = Math.max(
      5,
      (atkGround * 1.0 + atkNavy * 0.85 + atkAir * 0.5) *
        atkTech *
        amphBoost *
        airBonus *
        atkStab *
        atkCrisis *
        distFactor
    );
    defenderPower = Math.max(
      5,
      (defGround * 1.1 + defNavy * 0.65 + defAir * 0.45 + effectiveDefUnits * 0.85) *
        defTech *
        fortBonus *
        defStab
    );
  } else if (mode === 'combined') {
    const hasLand = hasLandBorder(state, attacker.id, defender.id);
    const jointSynergy = 1.28;
    const airBonus = 1 + clamp((rawAirAdvantage - 0.45) * 0.25, 0, airDefDisabled ? 0.36 : 0.26);
    attackerPower = Math.max(
      5,
      (atkGround * 1.2 + atkAir * 0.85 + atkNavy * (hasLand ? 0.35 : 0.7)) *
        atkTech *
        jointSynergy *
        airBonus *
        atkStab *
        atkCrisis *
        distFactor
    );
    defenderPower = Math.max(
      5,
      (defGround * 1.08 + defAir * 0.58 + effectiveDefUnits * 0.78) * defTech * fortBonus * defStab
    );
  } else {
    // ground offensive
    const airBonus = 1 + clamp((rawAirAdvantage - 0.55) * 0.16, -0.05, airDefDisabled ? 0.24 : 0.16);
    attackerPower = Math.max(
      5,
      (atkGround * 1.18 + atkAir * 0.3) * atkTech * airBonus * atkStab * atkCrisis * distFactor
    );
    defenderPower = Math.max(
      5,
      (defGround * 1.12 + defAir * 0.48 + effectiveDefUnits * 0.82) * defTech * fortBonus * defStab
    );
  }

  // Realistic superpower gap amplification: when attacker is vastly outmatched (<0.6x), defender dominance scales sharply
  const rawRatio = attackerPower / Math.max(1, defenderPower);
  if (rawRatio < 0.62) {
    defenderPower *= 1.18;
  }

  return {
    attackerPower: round1(attackerPower),
    defenderPower: round1(defenderPower),
    distanceKm,
    logisticsLabel,
    attackerAirRatio: rawAirAdvantage,
  };
}

export function estimateCombatPreview(
  state: GameState,
  attackerId: string,
  defenderId: string,
  allocationPercent: number,
  mode: AttackMode
): CombatPreview {
  const attacker = state.nations[attackerId];
  const defender = state.nations[defenderId];

  const { attackerPower, defenderPower, distanceKm, logisticsLabel } = computeDomainForces(
    state,
    attacker,
    defender,
    allocationPercent,
    mode
  );

  const ratio = attackerPower / Math.max(1, defenderPower);
  let oddsLabel = 'Scontro Equilibrato';
  let oddsTone: 'favorable' | 'balanced' | 'risky' = 'balanced';

  if (ratio >= 1.45) {
    oddsLabel = 'Vantaggio Decisivo';
    oddsTone = 'favorable';
  } else if (ratio >= 1.1) {
    oddsLabel = 'Vantaggio Tattico';
    oddsTone = 'favorable';
  } else if (ratio < 0.65) {
    oddsLabel = 'Quasi Impossibile (Divario Enorme)';
    oddsTone = 'risky';
  } else if (ratio < 0.88) {
    oddsLabel = 'Offensiva Rischiosa';
    oddsTone = 'risky';
  }

  let expectedEffect = '';
  if (mode === 'air_raid') {
    expectedEffect =
      ratio >= 1.0
        ? 'Danni a Difese, Fondi e infrastrutture (0 perdite fanteria)'
        : 'Difesa aerea nemica intensa: perdite Aviazione elevate';
  } else if (mode === 'naval_blockade') {
    expectedEffect =
      ratio >= 0.95
        ? 'Impone Blocco Navale (-28% PIL nemico/mese per 4 turni)'
        : 'Flotta nemica superiore: blocco difficile da imporre';
  } else if (ratio >= 1.45) {
    expectedEffect = mode === 'combined' ? '+26% / +42% controllo' : '+20% / +35% controllo';
  } else if (ratio >= 1.1) {
    expectedEffect = mode === 'combined' ? '+16% / +26% controllo' : '+11% / +20% controllo';
  } else if (ratio >= 0.82) {
    expectedEffect = '+3% / +9% controllo';
  } else {
    expectedEffect = '0% avanzata · alte perdite';
  }

  return {
    mode,
    attackerPower,
    defenderPower,
    ratio: round1(ratio),
    distanceKm,
    logisticsLabel,
    oddsLabel,
    oddsTone,
    expectedEffect,
  };
}

export interface OffensiveExecutionResult {
  attackerArmy: ArmyBranches;
  defenderArmy: ArmyBranches;
  defenderFundsDelta: number;
  defenderStabilityDelta: number;
  disableAirDefTurns: number;
  imposeBlockadeTurns: number;
  establishBeachhead: boolean;
  newControl: number;
  annexed: boolean;
  report: BattleReport;
}

export function resolveOffensive(
  state: GameState,
  war: War,
  attackerId: string,
  defenderId: string,
  allocationPercent: number,
  mode: AttackMode = 'ground'
): OffensiveExecutionResult {
  const attacker = state.nations[attackerId];
  const defender = state.nations[defenderId];

  const { attackerPower, defenderPower, distanceKm, attackerAirRatio } = computeDomainForces(
    state,
    attacker,
    defender,
    allocationPercent,
    mode
  );

  const variance = 0.93 + Math.random() * 0.14;
  const effAttacker = round1(attackerPower * variance);
  const effDefender = round1(defenderPower);
  const ratio = effAttacker / Math.max(1, effDefender);

  const isOriginalAttacker = war.attackerId === attackerId;
  const controlBefore = clamp(
    isOriginalAttacker ? war.attackerControl : war.defenderControl,
    0,
    100
  );

  const frac = clamp(allocationPercent, 15, 90) / 100;
  const airProtection = clamp(1 - Math.min(0.24, attackerAirRatio * 0.12), 0.76, 1.0);
  const droneProtection = hasTech(attacker, 'tactical_drones') ? 0.88 : 1.0;
  const combinedProtection = mode === 'combined' ? 0.75 : 1.0;
  const logisticsBonus = hasTech(attacker, 'modern_logistics') ? 1.12 : 1.0;

  let outcome: BattleReport['outcome'] = 'stalemate';
  if (ratio >= 1.45) outcome = 'decisive_victory';
  else if (ratio >= 1.08) outcome = 'victory';
  else if (ratio >= 0.82) outcome = 'stalemate';
  else outcome = 'defeat';

  let controlGain = 0;
  let defenderFundsDelta = 0;
  let defenderStabilityDelta = 0;
  let disableAirDefTurns = 0;
  let imposeBlockadeTurns = 0;
  let establishBeachhead = false;

  const atkLossRate = clamp(
    (0.145 / Math.max(0.45, ratio)) * airProtection * droneProtection * combinedProtection,
    0.03,
    0.36
  );
  const defLossRate = clamp(0.115 * Math.min(2.2, ratio), 0.03, 0.34);

  const attackerLosses: ArmyBranches = { ground: 0, air: 0, navy: 0, defense: 0 };
  const defenderLosses: ArmyBranches = { ground: 0, air: 0, navy: 0, defense: 0 };

  if (mode === 'air_raid') {
    // Air Raid: zero ground losses for attacker, hits enemy defenses, air, and treasury
    attackerLosses.air = Math.min(
      roundInt(attacker.army.air),
      Math.max(1, roundInt(attacker.army.air * frac * atkLossRate * 0.85))
    );
    defenderLosses.air = Math.min(
      roundInt(defender.army.air),
      roundInt(defender.army.air * defLossRate * 0.65)
    );
    defenderLosses.defense = Math.min(
      roundInt(defender.army.defense),
      Math.max(1, roundInt(defender.army.defense * defLossRate * 1.15))
    );
    defenderLosses.ground = Math.min(
      roundInt(defender.army.ground),
      roundInt(defender.army.ground * defLossRate * 0.35)
    );

    if (ratio >= 0.85) {
      defenderFundsDelta = -round1(clamp(defender.gdpIncome * (ratio >= 1.2 ? 0.55 : 0.32), 6, 45));
      defenderStabilityDelta = ratio >= 1.3 ? -4 : -2;
      if (ratio >= 1.15) disableAirDefTurns = 2;
    }
  } else if (mode === 'naval_blockade') {
    // Naval Blockade: fleet clash, imposes economic blockade on victory/stalemate
    attackerLosses.navy = Math.min(
      roundInt(attacker.army.navy),
      Math.max(1, roundInt(attacker.army.navy * frac * atkLossRate * 0.7))
    );
    attackerLosses.air = Math.min(
      roundInt(attacker.army.air),
      roundInt(attacker.army.air * frac * atkLossRate * 0.25)
    );
    defenderLosses.navy = Math.min(
      roundInt(defender.army.navy),
      roundInt(defender.army.navy * defLossRate * 0.85)
    );
    if (ratio >= 0.92) {
      imposeBlockadeTurns = 4;
      defenderFundsDelta = -round1(clamp(defender.gdpIncome * 0.25, 4, 24));
    }
  } else {
    // Ground, Amphibious, or Combined: advances Territorial Control
    const modeAdvanceBonus = mode === 'combined' ? 1.2 : mode === 'amphibious' ? 0.92 : 1.0;
    if (ratio >= 1.45) {
      controlGain = Math.round(clamp(20 + (ratio - 1.4) * 18, 20, 42) * logisticsBonus * modeAdvanceBonus);
    } else if (ratio >= 1.08) {
      controlGain = Math.round(clamp(11 + (ratio - 1.08) * 24, 11, 24) * logisticsBonus * modeAdvanceBonus);
    } else if (ratio >= 0.82) {
      controlGain = Math.round(clamp(3 + (ratio - 0.82) * 22, 3, 10) * logisticsBonus * modeAdvanceBonus);
    } else {
      controlGain = 0;
    }

    if (mode === 'amphibious' && controlGain > 0) {
      establishBeachhead = true;
    }

    attackerLosses.ground = Math.min(
      roundInt(attacker.army.ground),
      Math.max(1, roundInt(attacker.army.ground * frac * atkLossRate * (mode === 'ground' ? 1.12 : 0.95)))
    );
    attackerLosses.air =
      mode === 'ground'
        ? Math.min(roundInt(attacker.army.air), roundInt(attacker.army.air * frac * atkLossRate * 0.35))
        : Math.min(roundInt(attacker.army.air), roundInt(attacker.army.air * frac * atkLossRate * 0.65));
    attackerLosses.navy =
      mode === 'amphibious' || mode === 'combined'
        ? Math.min(roundInt(attacker.army.navy), roundInt(attacker.army.navy * frac * atkLossRate * 0.5))
        : 0;

    defenderLosses.ground = Math.min(
      roundInt(defender.army.ground),
      Math.max(1, roundInt(defender.army.ground * defLossRate))
    );
    defenderLosses.air = Math.min(
      roundInt(defender.army.air),
      roundInt(defender.army.air * defLossRate * 0.65)
    );
    defenderLosses.navy =
      mode === 'amphibious' || mode === 'combined'
        ? Math.min(roundInt(defender.army.navy), roundInt(defender.army.navy * defLossRate * 0.55))
        : 0;
    defenderLosses.defense = Math.min(
      roundInt(defender.army.defense),
      roundInt(defender.army.defense * defLossRate * (mode === 'combined' ? 1.0 : 0.72))
    );
  }

  const newControl = clamp(controlBefore + controlGain, 0, 100);
  const annexed = newControl >= 100;

  const attackerArmy: ArmyBranches = {
    ground: Math.max(0, roundInt(attacker.army.ground - attackerLosses.ground)),
    air: Math.max(0, roundInt(attacker.army.air - attackerLosses.air)),
    navy: Math.max(0, roundInt(attacker.army.navy - attackerLosses.navy)),
    defense: Math.max(0, roundInt(attacker.army.defense)),
  };

  const defenderArmy: ArmyBranches = {
    ground: Math.max(0, roundInt(defender.army.ground - defenderLosses.ground)),
    air: Math.max(0, roundInt(defender.army.air - defenderLosses.air)),
    navy: Math.max(0, roundInt(defender.army.navy - defenderLosses.navy)),
    defense: Math.max(0, roundInt(defender.army.defense - defenderLosses.defense)),
  };

  let summary = '';
  if (annexed) {
    summary = `Le forze di ${attacker.name} hanno travolto le ultime difese e annesso ${defender.name}.`;
  } else if (mode === 'air_raid') {
    summary =
      ratio >= 0.85
        ? `Raid aereo di ${attacker.name} a segno: colpite difese e infrastrutture di ${defender.name} (${defenderFundsDelta} B$ danni, zero perdite terrestri).`
        : `La difesa aerea di ${defender.name} ha intercettato l’incursione di ${attacker.name} infliggendo perdite all’Aviazione.`;
  } else if (mode === 'naval_blockade') {
    summary =
      imposeBlockadeTurns > 0
        ? `Blocco navale imposto da ${attacker.name} sulle coste di ${defender.name}: le entrate nemiche calano del 28% per 4 mesi.`
        : `La marina di ${defender.name} ha respinto il tentativo di blocco navale di ${attacker.name}.`;
  } else if (outcome === 'decisive_victory') {
    summary = `Sfondamento ${mode === 'combined' ? 'combinato' : mode === 'amphibious' ? 'anfibio' : 'terrestre'} decisivo di ${attacker.name}: controllo su ${defender.name} al ${newControl}%.`;
  } else if (outcome === 'victory') {
    summary = `Avanzata riuscita di ${attacker.name} (${newControl}% controllo)${establishBeachhead ? ' con testa di ponte costiera stabilita.' : '.'}`;
  } else if (outcome === 'stalemate') {
    summary = `Combattimenti logoranti su ${defender.name}: lievi guadagni (${newControl}%) con perdite su entrambi i lati.`;
  } else {
    summary = `Offensiva respinta dalla superiorità difensiva di ${defender.name}: nessuna avanzata e perdite elevate per ${attacker.name}.`;
  }

  const report: BattleReport = {
    id: `battle_${state.turn}_${attackerId}_${defenderId}_${Date.now()}`,
    turn: state.turn,
    dateLabel: formatTurnDate(state.turn, state.scenarioId),
    attackMode: mode,
    attackerId,
    attackerName: attacker.name,
    defenderId,
    defenderName: defender.name,
    isNavalAssault: mode === 'amphibious' || mode === 'naval_blockade',
    distanceKm,
    allocationPercent: roundInt(allocationPercent),
    attackerEffectivePower: effAttacker,
    defenderEffectivePower: effDefender,
    attackerLosses,
    defenderLosses,
    fundsDamaged: defenderFundsDelta < 0 ? Math.abs(defenderFundsDelta) : undefined,
    blockadeImposed: imposeBlockadeTurns > 0,
    controlBefore,
    controlAfter: newControl,
    outcome,
    annexed,
    summary,
  };

  return {
    attackerArmy,
    defenderArmy,
    defenderFundsDelta,
    defenderStabilityDelta,
    disableAirDefTurns,
    imposeBlockadeTurns,
    establishBeachhead,
    newControl,
    annexed,
    report,
  };
}
