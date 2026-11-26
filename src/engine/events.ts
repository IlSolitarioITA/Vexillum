import {
  GameEvent,
  GameState,
  NationState,
  NewsCategory,
  NewsEvent,
} from '../types/game';
import {
  areAllied,
  areAtWar,
  clamp,
  formatTurnDate,
  getBudgetPolicy,
  getMonthlyEconomy,
  getRelation,
  hasLandBorder,
  isSovereign,
  pairKey,
  round1,
  round2,
  roundInt,
  sanctionKey,
} from './helpers';

function createEventNews(
  state: GameState,
  category: NewsCategory,
  headline: string,
  detail: string,
  nationIds?: string[]
): NewsEvent {
  return {
    id: `news_${state.turn}_${Math.random().toString(36).slice(2, 9)}`,
    turn: state.turn,
    dateLabel: formatTurnDate(state.turn, state.scenarioId),
    category,
    headline,
    detail,
    nationIds,
  };
}

function adjustRel(state: GameState, a: string, b: string, delta: number): void {
  if (a === b) return;
  const cur = getRelation(state, a, b);
  state.relations[pairKey(a, b)] = clamp(Math.round(cur + delta), -100, 100);
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates dynamic, world-aware news every turn so the Chronicle stays alive even in peacetime.
 * Also introduces mild, authentic bilateral/global shifts based on real active nations.
 */
export function generatePeacetimeWorldNews(state: GameState): NewsEvent {
  const sovereigns = Object.values(state.nations).filter(isSovereign);
  const majorPowers = sovereigns.filter((n) => n.gdpIncome >= 14);
  const pool = majorPowers.length >= 4 ? majorPowers : sovereigns;

  // Build candidate rival border pairs for authentic tension news
  const rivalPairs: Array<[NationState, NationState]> = [];
  const friendlyPairs: Array<[NationState, NationState]> = [];

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i];
      const b = pool[j];
      if (areAtWar(state, a.id, b.id)) continue;
      const rel = getRelation(state, a.id, b.id);
      if (rel <= -18 && !a.strictNeutral && !b.strictNeutral) {
        if (hasLandBorder(state, a.id, b.id) || (a.gdpIncome >= 22 && b.gdpIncome >= 22)) {
          rivalPairs.push([a, b]);
        }
      } else if (rel >= 20) {
        friendlyPairs.push([a, b]);
      }
    }
  }

  const roll = Math.random();

  // 1. Border military exercise / friction between rivals
  if (roll < 0.28 && rivalPairs.length > 0) {
    const pair = pickRandom(rivalPairs)!;
    const [a, b] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
    adjustRel(state, a.id, b.id, -6);
    state.geopoliticalFriction = clamp(roundInt(state.geopoliticalFriction + 3), 0, 100);
    state.globalTension = clamp(roundInt(state.globalTension + 1), 0, 100);
    const hasBorder = hasLandBorder(state, a.id, b.id);
    return createEventNews(
      state,
      'global',
      hasBorder
        ? `Esercitazioni di ${a.name} lungo il confine con ${b.name}`
        : `Tensione diplomatica e manovre tra ${a.name} e ${b.name}`,
      hasBorder
        ? `${a.name} dispiega unità corazzate e radar alla frontiera, suscitando la protesta formale di ${b.name} (Relazioni -6).`
        : `Incroci ravvicinati di pattuglie aeree e navali raffreddano ulteriormente i rapporti tra ${a.name} e ${b.name} (Relazioni -6).`,
      [a.id, b.id]
    );
  }

  // 2. Trade / industrial agreement between partners
  if (roll < 0.52 && friendlyPairs.length > 0) {
    const [a, b] = pickRandom(friendlyPairs)!;
    adjustRel(state, a.id, b.id, 5);
    a.funds = round1(a.funds + Math.min(8, Math.max(2, a.gdpIncome * 0.12)));
    b.funds = round1(b.funds + Math.min(8, Math.max(2, b.gdpIncome * 0.12)));
    return createEventNews(
      state,
      'economy',
      `Accordo commerciale strategico tra ${a.name} e ${b.name}`,
      `Le due economie siglano un corridoio energetico e industriale comune, rafforzando la cooperazione bilaterale (+5 relazioni).`,
      [a.id, b.id]
    );
  }

  // 3. Arms buildup / defense modernization by a sovereign AI power
  if (roll < 0.74) {
    const aiPowers = pool.filter((n) => n.id !== state.playerId && !n.strictNeutral);
    const actor = pickRandom(aiPowers) ?? pickRandom(sovereigns)!;
    actor.army.defense = roundInt(actor.army.defense + 4);
    actor.army.ground = roundInt(actor.army.ground + 4);
    state.geopoliticalFriction = clamp(roundInt(state.geopoliticalFriction + 2), 0, 100);
    return createEventNews(
      state,
      'global',
      `Riarmo e modernizzazione militare in ${actor.name}`,
      `Il governo di ${actor.name} approva un nuovo piano pluriennale per la difesa e l’industria bellica, segnalando una postura più assertiva.`,
      [actor.id]
    );
  }

  // 4. Global economic / commodity / financial market shift
  if (roll < 0.88) {
    const economyPower = pickRandom(pool)!;
    const isBoom = Math.random() < 0.52;
    if (isBoom) {
      economyPower.gdpIncome = round1(economyPower.gdpIncome * 1.015);
      return createEventNews(
        state,
        'economy',
        `Espansione manifatturiera e surplus export in ${economyPower.name}`,
        `I mercati premiano la solidità produttiva di ${economyPower.name}: le entrate fiscali registrano un leggero miglioramento strutturale.`,
        [economyPower.id]
      );
    } else {
      state.globalTension = clamp(roundInt(state.globalTension + 1), 0, 100);
      return createEventNews(
        state,
        'economy',
        `Volatilità sui mercati energetici e delle materie prime`,
        `L’incertezza geopolitica e le rotte marittime congestionate spingono al rialzo i costi industriali nelle principali capitali.`,
        [economyPower.id]
      );
    }
  }

  // 5. Diplomatic crisis / summit note
  const pair = pickRandom(rivalPairs) ?? pickRandom(friendlyPairs);
  if (pair) {
    const [a, b] = pair;
    const rel = getRelation(state, a.id, b.id);
    if (rel < 0) {
      adjustRel(state, a.id, b.id, -5);
      return createEventNews(
        state,
        'diplomacy',
        `Richiamo degli ambasciatori tra ${a.name} e ${b.name}`,
        `Dure dichiarazioni incrociate sui dossier di sicurezza regionale incrinano i canali diplomatici tra ${a.name} e ${b.name}.`,
        [a.id, b.id]
      );
    }
    adjustRel(state, a.id, b.id, 4);
    return createEventNews(
      state,
      'diplomacy',
      `Vertice bilaterale di distensione tra ${a.name} e ${b.name}`,
      `I ministri degli Esteri confermano linee di dialogo aperte per la sicurezza regionale e la stabilità commerciale.`,
      [a.id, b.id]
    );
  }

  const fallback = state.nations[state.playerId];
  return createEventNews(
    state,
    'global',
    `Osservatorio Geopolitico · ${formatTurnDate(state.turn, state.scenarioId)}`,
    `Le cancellerie internazionali monitorano l’equilibrio militare globale mentre ${fallback?.name ?? 'il governo'} aggiorna le proprie priorità strategiche.`,
    fallback ? [fallback.id] : undefined
  );
}

/**
 * Periodically triggers an interactive National Crisis or World Council Summit event
 * (every 2-4 turns, or earlier if public debt, welfare cuts, or global tension spike).
 */
export function maybeTriggerInteractiveEvent(state: GameState): GameEvent | null {
  if (state.status !== 'playing' || state.pendingEvent) return null;
  const player = state.nations[state.playerId];
  if (!player || !isSovereign(player)) return null;

  const turnsSinceLast = state.turn - state.lastEventTurn;
  if (state.turn < 2 || turnsSinceLast < 2) return null;

  const eco = getMonthlyEconomy(state, player.id);
  const policy = getBudgetPolicy(player);

  const isDebtCrisis = eco.debtToGdpPercent >= 105;
  const isWelfareCrisis = policy.welfare === 'cut' && player.stability <= 68;
  const isUrgent = isDebtCrisis || isWelfareCrisis || state.globalTension >= 48;

  // Cadence: 2-4 turns normally; urgent triggers have higher chance at 2+ turns
  if (!isUrgent && turnsSinceLast < 3) return null;
  if (turnsSinceLast === 2 && Math.random() > 0.55) return null;
  if (turnsSinceLast === 3 && Math.random() > 0.72) return null;
  // At turnsSinceLast >= 4, guarantee an event triggers

  const dateLabel = formatTurnDate(state.turn, state.scenarioId);
  const sovereigns = Object.values(state.nations).filter(
    (n) => isSovereign(n) && n.id !== player.id
  );

  // Priority 1: Sovereign Debt Crisis if Debt/GDP is critical
  if (isDebtCrisis && Math.random() < 0.6) {
    const emergencyLoan = round1(Math.max(40, Math.min(90, eco.baseGdp * 2.2)));
    const rescueCost = round1(Math.max(25, Math.min(60, eco.baseGdp * 1.4)));
    return {
      id: `evt_${state.turn}_debt_crisis`,
      templateId: 'debt_crisis',
      turn: state.turn,
      dateLabel,
      kind: 'national',
      title: 'Allarme Spread & Crisi del Debito Sovrano',
      subtitle: `Debito/PIL al ${eco.debtToGdpPercent}% · Mercati in forte tensione`,
      description: `I creditori internazionali chiedono garanzie sul debito pubblico di ${player.name} (${eco.publicDebt} B$). Senza una manovra credibile, il costo degli interessi rischia di paralizzare il bilancio statale.`,
      choices: [
        {
          id: 'debt_austerity',
          label: 'Piano di Austerità e Rientro',
          description: 'Taglia temporaneamente i servizi e avvia un rimborso straordinario per calmare i mercati.',
          pros: `Debito -${rescueCost} B$, fiducia dei mercati`,
          cons: `Stabilità -8%, Fondi -${Math.min(round1(player.funds), round1(rescueCost * 0.4))} B$`,
          tone: 'economic',
        },
        {
          id: 'debt_monetize',
          label: 'Emissione Straordinaria di Emergenza',
          description: 'Rifinanziamento d’urgenza per garantire la spesa corrente e gli stipendi militari.',
          pros: `Liquidità immediata +${emergencyLoan} B$`,
          cons: `Debito +${round1(emergencyLoan * 1.25)} B$, Stabilità -4%`,
          tone: 'aggressive',
        },
        {
          id: 'debt_renegotiate',
          label: 'Rinegoziazione Diplomatica con i Partner',
          description: 'Chiedi una moratoria sugli interessi ai paesi amici in cambio di concessioni politiche.',
          pros: 'Debito -25 B$, Stabilità +2%',
          cons: 'Relazioni -6 con le principali potenze creditrici',
          tone: 'diplomatic',
        },
      ],
    };
  }

  // Priority 2: Welfare Protests if welfare is cut
  if (isWelfareCrisis && Math.random() < 0.6) {
    const reliefCost = round1(Math.max(16, Math.min(45, eco.grossIncome * 0.65)));
    return {
      id: `evt_${state.turn}_welfare_protests`,
      templateId: 'welfare_protests',
      turn: state.turn,
      dateLabel,
      kind: 'national',
      title: 'Sciopero Generale contro i Tagli al Welfare',
      subtitle: 'Piazze mobilitate in tutto il Paese',
      description: `I tagli a Sanità & Welfare hanno innescato proteste diffuse nelle principali città di ${player.name}. I sindacati minacciano il blocco dei trasporti e della produzione industriale.`,
      choices: [
        {
          id: 'welfare_concede',
          label: 'Ripristina Fondi e Sussidi Straordinari',
          description: 'Riporta Sanità & Welfare a livello Normale e stanzia un fondo di emergenza sociale.',
          pros: 'Stabilità +10%, Welfare torna a Normale',
          cons: `Fondi -${reliefCost} B$`,
          tone: 'diplomatic',
        },
        {
          id: 'welfare_mediate',
          label: 'Tavolo di Mediazione con i Sindacati',
          description: 'Concedi bonus selettivi mantenendo l’impianto generale del bilancio.',
          pros: 'Stabilità +4%, nessun cambio automatico di bilancio',
          cons: `Fondi -${round1(reliefCost * 0.45)} B$`,
          tone: 'neutral',
        },
        {
          id: 'welfare_crackdown',
          label: 'Linea Dura per l’Ordine Pubblico',
          description: 'Mantieni i tagli per preservare il budget bellico e reprimi gli scioperi.',
          pros: 'Nessun costo immediato, +5 Unità Difesa',
          cons: 'Stabilità -9%, Relazioni -6 con i paesi democratici',
          tone: 'aggressive',
        },
      ],
    };
  }

  // Alternate between World Council Summits (55%) and National Decisions (45%)
  const pickCouncil = Math.random() < 0.56;

  if (pickCouncil) {
    const councilRoll = Math.random();

    // Council A: Sanctions Vote against an Aggressor / Rival
    const aggressors = sovereigns
      .filter(
        (n) =>
          n.aggressiveness >= 12 ||
          state.wars.some((w) => w.attackerId === n.id) ||
          getRelation(state, player.id, n.id) <= -25
      )
      .sort((a, b) => b.aggressiveness - a.aggressiveness);

    if (councilRoll < 0.32 && aggressors.length > 0) {
      const target = aggressors[0];
      return {
        id: `evt_${state.turn}_council_sanctions`,
        templateId: 'council_sanctions',
        turn: state.turn,
        dateLabel,
        kind: 'world_council',
        title: `Consiglio Mondiale: Risoluzione di Sanzioni su ${target.name}`,
        subtitle: 'Votazione straordinaria dell’Assemblea Internazionale',
        description: `Una coalizione diplomatica propone un pacchetto coordinato di sanzioni economiche contro ${target.name} per frenarne le ambizioni militari. Il voto di ${player.name} influenzerà gli equilibri tra i blocchi.`,
        involvedNationId: target.id,
        choices: [
          {
            id: 'sanctions_yes',
            label: `Vota SÌ · Imponi Sanzioni a ${target.name}`,
            description: 'Aderisci al fronte sanzionatorio internazionale.',
            pros: `Sanzioni attive su ${target.name}, +8 relazioni con i suoi rivali`,
            cons: `Relazioni -28 con ${target.name}, Tensione Globale +4%`,
            tone: 'aggressive',
          },
          {
            id: 'sanctions_abstain',
            label: 'Astieniti e Proponi Mediazione',
            description: 'Mantieni aperti i canali commerciali evitando uno scontro frontale.',
            pros: 'Tensione Globale -3%, Stabilità +2%',
            cons: 'Relazioni -4 con i promotori della risoluzione',
            tone: 'neutral',
          },
          {
            id: 'sanctions_veto',
            label: `Vota NO · Difendi gli Scambi con ${target.name}`,
            description: 'Blocca le sanzioni e approfitta degli accordi commerciali preferenziali.',
            pros: `Relazioni +18 con ${target.name}, Fondi +18 B$`,
            cons: `Relazioni -12 con i rivali di ${target.name}, Tensione +2%`,
            tone: 'economic',
          },
        ],
      };
    }

    // Council B: Arms Limitation Treaty
    if (councilRoll < 0.58) {
      return {
        id: `evt_${state.turn}_council_arms`,
        templateId: 'council_arms',
        turn: state.turn,
        dateLabel,
        kind: 'world_council',
        title: 'Consiglio Mondiale: Trattato di Limitazione Armamenti',
        subtitle: 'Vertice globale sul disarmo e la distensione',
        description: `Le principali capitali discutono un protocollo per contenere la corsa agli armamenti e ridurre il rischio di guerra su larga scala. Aderire riduce le tensioni ma rallenta il potenziamento bellico.`,
        choices: [
          {
            id: 'arms_sign',
            label: 'Ratifica il Trattato di Distensione',
            description: 'Riduci leggermente gli arsenali offensivi in cambio di stabilità e dividendi di pace.',
            pros: 'Tensione Globale -8%, Stabilità +6%, Fondi +20 B$, Relazioni +6 globali',
            cons: 'Forze Terrestri -6, Aviazione -4',
            tone: 'diplomatic',
          },
          {
            id: 'arms_reject',
            label: 'Respingi · Priorità alla Sicurezza Nazionale',
            description: 'Rivendica piena libertà di riarmo per dissuadere i rivali.',
            pros: 'Forze Terrestri +10, Difesa +8, Manodopera +15k',
            cons: 'Tensione Globale +6%, Relazioni -6 con paesi neutrali',
            tone: 'aggressive',
          },
          {
            id: 'arms_conditional',
            label: 'Firma con Clausola di Ricerca Tecnologica',
            description: 'Accetta i limiti sui vecchi arsenali ma proteggi gli investimenti in R&S.',
            pros: 'Tensione Globale -4%, progresso ricerca +1 mese (o +12 B$)',
            cons: 'Fondi -10 B$',
            tone: 'neutral',
          },
        ],
      };
    }

    // Council C: Global Energy Crisis Summit
    if (councilRoll < 0.8) {
      const reserveCost = round1(Math.max(15, Math.min(35, eco.grossIncome * 0.5)));
      return {
        id: `evt_${state.turn}_council_energy`,
        templateId: 'council_energy',
        turn: state.turn,
        dateLabel,
        kind: 'world_council',
        title: 'Vertice Internazionale: Crisi Energetica Globale',
        subtitle: 'Impennata dei prezzi di gas, petrolio e materie critiche',
        description: `Colli di bottiglia lungo le rotte marittime e tensioni tra produttori fanno schizzare il costo dell’energia. Il Consiglio Mondiale discute una risposta coordinata per evitare la recessione.`,
        choices: [
          {
            id: 'energy_pool',
            label: 'Partecipa al Fondo Comune di Emergenza',
            description: 'Condividi scorte strategiche con i paesi partner per stabilizzare i prezzi.',
            pros: 'PIL base +2%, Stabilità +4%, Relazioni +8 con il tuo blocco',
            cons: `Fondi -${reserveCost} B$`,
            tone: 'diplomatic',
          },
          {
            id: 'energy_national',
            label: 'Scorte Nazionali & Sussidi Interni',
            description: 'Proteggi l’economia domestica emettendo debito a breve termine.',
            pros: 'Stabilità +5%, PIL protetto',
            cons: `Debito Pubblico +${round1(reserveCost * 1.3)} B$, Relazioni -4`,
            tone: 'economic',
          },
          {
            id: 'energy_export',
            label: 'Sfrutta la Speculazione sui Mercati',
            description: 'Aumenta tariffe e dazi di transito per incassare liquidità immediata.',
            pros: `Fondi +${round1(reserveCost * 1.1)} B$`,
            cons: 'Stabilità -5%, Tensione Globale +4%, Relazioni -8',
            tone: 'aggressive',
          },
        ],
      };
    }

    // Council D: International Humanitarian Aid Mission
    const crisisTarget =
      sovereigns.find((n) => n.stability < 55 || n.internalCrisisActive) ??
      pickRandom(sovereigns);
    const aidCost = round1(Math.max(14, Math.min(30, eco.grossIncome * 0.45)));
    return {
      id: `evt_${state.turn}_council_aid`,
      templateId: 'council_aid',
      turn: state.turn,
      dateLabel,
      kind: 'world_council',
      title: 'Consiglio Mondiale: Missione di Aiuti Umanitari',
      subtitle: crisisTarget
        ? `Emergenza civile e logistica in ${crisisTarget.name}`
        : 'Piano straordinario di cooperazione internazionale',
      description: `Il Consiglio Mondiale richiede contributi finanziari e logistici per stabilizzare le aree colpite da crisi alimentare e sfollati${crisisTarget ? ` in ${crisisTarget.name}` : ''}.`,
      involvedNationId: crisisTarget?.id,
      choices: [
        {
          id: 'aid_lead',
          label: 'Guida la Missione Umanitaria',
          description: 'Finanzia e coordina i corridoi logistici guadagnando enorme prestigio internazionale.',
          pros: `Relazioni +12 globale${crisisTarget ? ` (+22 con ${crisisTarget.name})` : ''}, Tensione -5%, Stabilità +3%`,
          cons: `Fondi -${aidCost} B$`,
          tone: 'diplomatic',
        },
        {
          id: 'aid_minimal',
          label: 'Contributo Simbolico',
          description: 'Invia una piccola delegazione per mantenere una buona immagine diplomatica.',
          pros: 'Relazioni +4, Tensione -2%',
          cons: `Fondi -${round1(aidCost * 0.35)} B$`,
          tone: 'neutral',
        },
        {
          id: 'aid_decline',
          label: 'Rifiuta · Concentra le Risorse in Patria',
          description: 'Dichiara priorità assoluta al bilancio nazionale.',
          pros: 'Nessuna spesa, Fondi +8 B$ da risparmio cooperazione',
          cons: 'Relazioni -6 con i paesi partner, Tensione +2%',
          tone: 'economic',
        },
      ],
    };
  }

  // National Events (Non-crisis or situational)
  const natRoll = Math.random();

  // National A: Industrial & Infrastructure Reform
  if (natRoll < 0.38) {
    const investCost = round1(Math.max(18, Math.min(48, eco.grossIncome * 0.7)));
    return {
      id: `evt_${state.turn}_nat_industrial`,
      templateId: 'nat_industrial',
      turn: state.turn,
      dateLabel,
      kind: 'national',
      title: 'Piano Nazionale di Riforma Industriale',
      subtitle: 'Scelta strategica del Consiglio dei Ministri',
      description: `I distretti produttivi di ${player.name} propongono un grande piano di riconversione. Puoi puntare sulla crescita civile a lungo termine, sulla produzione bellica immediata o sull’autofinanziamento a debito.`,
      choices: [
        {
          id: 'ind_civil',
          label: 'Riforma Civile & Tecnologica',
          description: 'Modernizza fabbriche, reti energetiche e centri di ricerca.',
          pros: 'PIL base +4%, progresso ricerca +1 mese',
          cons: `Fondi -${investCost} B$`,
          tone: 'economic',
        },
        {
          id: 'ind_defense',
          label: 'Riconversione all’Industria Bellica',
          description: 'Accelera le linee di produzione di mezzi corazzati e sistemi di difesa.',
          pros: 'Terrestri +12, Aviazione +6, Difesa +8',
          cons: `Fondi -${round1(investCost * 0.75)} B$, Stabilità -3%`,
          tone: 'aggressive',
        },
        {
          id: 'ind_bonds',
          label: 'Finanzia la Riforma con Titoli di Stato',
          description: 'Avvia la modernizzazione senza intaccare le riserve liquide.',
          pros: 'PIL base +3%, Stabilità +2%',
          cons: `Debito Pubblico +${round1(investCost * 1.2)} B$`,
          tone: 'neutral',
        },
      ],
    };
  }

  // National B: Ministerial Scandal / Corruption Investigation
  if (natRoll < 0.7) {
    return {
      id: `evt_${state.turn}_nat_scandal`,
      templateId: 'nat_scandal',
      turn: state.turn,
      dateLabel,
      kind: 'national',
      title: 'Scandalo sugli Appalti della Difesa',
      subtitle: 'Inchiesta giornalistica scuote il governo',
      description: `Un’inchiesta indipendente rivela sovrafatturazioni e sprechi nei contratti pubblici di ${player.name}. La gestione della crisi definirà la credibilità delle istituzioni.`,
      choices: [
        {
          id: 'scandal_purge',
          label: 'Trasparenza Totale e Rimpasto',
          description: 'Rimuovi i responsabili, recupera i fondi illeciti e rafforza i controlli.',
          pros: 'Stabilità +6%, Fondi recuperati +14 B$',
          cons: 'Difesa -4 unità per ritardi nelle forniture',
          tone: 'diplomatic',
        },
        {
          id: 'scandal_cover',
          label: 'Insabbia per Proteggere i Vertici Militari',
          description: 'Evita scossoni negli stati maggiori e accelera gli ordini bellici.',
          pros: 'Nessuna perdita militare, +5 unità Difesa',
          cons: 'Stabilità -8%, Tensione interna in aumento',
          tone: 'aggressive',
        },
        {
          id: 'scandal_fine',
          label: 'Multa alle Aziende e Compromesso',
          description: 'Chiudi il caso con una sanzione amministrativa senza rimpasto.',
          pros: 'Fondi +20 B$',
          cons: 'Stabilità -4%',
          tone: 'economic',
        },
      ],
    };
  }

  // National C: Domestic Energy Emergency / Tech Breakthrough
  const fixCost = round1(Math.max(14, Math.min(36, eco.grossIncome * 0.55)));
  return {
    id: `evt_${state.turn}_nat_energy`,
    templateId: 'nat_energy',
    turn: state.turn,
    dateLabel,
    kind: 'national',
    title: 'Emergenza Rete Elettrica e Logistica',
    subtitle: 'Picco di domanda industriale e guasti critici',
    description: `Un’ondata climatica estrema e il sovraccarico industriale mettono sotto pressione la rete energetica di ${player.name}. Serve una decisione immediata per evitare blackout e calo produttivo.`,
    choices: [
      {
        id: 'nat_energy_upgrade',
        label: 'Investimento Rapido nelle Infrastrutture',
        description: 'Ripara e potenzia la rete nazionale aumentando l’efficienza futura.',
        pros: 'PIL base +3%, Stabilità +4%',
        cons: `Fondi -${fixCost} B$`,
        tone: 'economic',
      },
      {
        id: 'nat_energy_ration',
        label: 'Razionamento Civile · Priorità Militare',
        description: 'Garantisci energia alle basi e alle fabbriche d’armi limitando i consumi civili.',
        pros: 'Nessun costo immediato, +8 Manodopera',
        cons: 'Stabilità -7%',
        tone: 'aggressive',
      },
      {
        id: 'nat_energy_debt',
        label: 'Decreto Emergenza Finanziato a Debito',
        description: 'Copri immediatamente i costi straordinari emettendo titoli di stato.',
        pros: 'Stabilità +3%, continuità produttiva garantita',
        cons: `Debito Pubblico +${round1(fixCost * 1.25)} B$`,
        tone: 'neutral',
      },
    ],
  };
}

/**
 * Resolves the player's choice on `state.pendingEvent`, mutating the already-cloned state in-place.
 */
export function applyEventChoiceToState(
  state: GameState,
  choiceId: string
): { message: string; error?: string } {
  const evt = state.pendingEvent;
  if (!evt) return { message: '', error: 'Nessun evento attivo da risolvere.' };
  const player = state.nations[state.playerId];
  if (!player) return { message: '', error: 'Nazione giocatore non trovata.' };

  const choice = evt.choices.find((c) => c.id === choiceId);
  if (!choice) return { message: '', error: 'Scelta non valida.' };

  const eco = getMonthlyEconomy(state, player.id);
  const sovereigns = Object.values(state.nations).filter(
    (n) => isSovereign(n) && n.id !== player.id
  );
  const target = evt.involvedNationId ? state.nations[evt.involvedNationId] : undefined;

  let summary = `${player.name} sceglie: "${choice.label}".`;

  switch (choiceId) {
    // --- DEBT CRISIS ---
    case 'debt_austerity': {
      const rescue = round1(Math.max(25, Math.min(60, eco.baseGdp * 1.4)));
      const cashHit = Math.min(player.funds, round1(rescue * 0.4));
      player.funds = round1(Math.max(0, player.funds - cashHit));
      player.publicDebt = round1(Math.max(0, player.publicDebt - rescue));
      player.stability = clamp(roundInt(player.stability - 8), 5, 100);
      summary = `Piano di austerità avviato: debito ridotto di ${rescue} B$, ma la stabilità cala (-8%).`;
      break;
    }
    case 'debt_monetize': {
      const loan = round1(Math.max(40, Math.min(90, eco.baseGdp * 2.2)));
      player.funds = round1(player.funds + loan);
      player.publicDebt = round1(player.publicDebt + loan * 1.25);
      player.stability = clamp(roundInt(player.stability - 4), 5, 100);
      summary = `Emissione straordinaria: +${loan} B$ in cassa, debito pubblico salito a ${player.publicDebt} B$.`;
      break;
    }
    case 'debt_renegotiate': {
      player.publicDebt = round1(Math.max(0, player.publicDebt - 25));
      player.stability = clamp(roundInt(player.stability + 2), 5, 100);
      for (const n of sovereigns.filter((s) => s.gdpIncome >= 20)) {
        adjustRel(state, player.id, n.id, -6);
      }
      summary = `Rinegoziazione completata: debito ridotto di 25 B$ e stabilità +2%, ma freddezza dai mercati esteri.`;
      break;
    }

    // --- WELFARE PROTESTS ---
    case 'welfare_concede': {
      const reliefCost = round1(Math.max(16, Math.min(45, eco.grossIncome * 0.65)));
      if (player.funds >= reliefCost) {
        player.funds = round1(player.funds - reliefCost);
      } else {
        const shortfall = round1(reliefCost - player.funds);
        player.funds = 0;
        player.publicDebt = round1(player.publicDebt + shortfall);
      }
      player.budgetPolicy = { ...getBudgetPolicy(player), welfare: 'normal' };
      player.stability = clamp(roundInt(player.stability + 10), 5, 100);
      if (player.stability >= 40) player.internalCrisisActive = false;
      summary = `Fondi sociali ripristinati (-${reliefCost} B$): Sanità & Welfare torna a Normale e la stabilità sale (+10%).`;
      break;
    }
    case 'welfare_mediate': {
      const cost = round1(Math.max(7, Math.min(20, eco.grossIncome * 0.3)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      player.stability = clamp(roundInt(player.stability + 4), 5, 100);
      summary = `Accordo parziale con i sindacati (-${cost} B$): la tensione in piazza cala (+4% stabilità).`;
      break;
    }
    case 'welfare_crackdown': {
      player.stability = clamp(roundInt(player.stability - 9), 5, 100);
      player.army.defense = roundInt(player.army.defense + 5);
      for (const n of sovereigns.filter((s) => s.bloc === 'euro_atlantic' || s.bloc === 'indo_pacific')) {
        adjustRel(state, player.id, n.id, -6);
      }
      summary = `Repressione degli scioperi: tagli mantenuti (+5 Difesa), ma la stabilità scende al ${player.stability}%.`;
      break;
    }

    // --- WORLD COUNCIL: SANCTIONS ---
    case 'sanctions_yes': {
      if (target && isSovereign(target)) {
        state.sanctions[sanctionKey(player.id, target.id)] = true;
        adjustRel(state, player.id, target.id, -28);
        for (const n of sovereigns) {
          if (n.id === target.id) continue;
          if (getRelation(state, n.id, target.id) <= -15) {
            adjustRel(state, player.id, n.id, 8);
          } else if (areAllied(state, n.id, target.id)) {
            adjustRel(state, player.id, n.id, -8);
          }
        }
        summary = `${player.name} vota a favore delle sanzioni contro ${target.name}: cresce il consenso con il blocco opposto, ma i rapporti con ${target.name} crollano.`;
      }
      state.globalTension = clamp(roundInt(state.globalTension + 4), 0, 100);
      break;
    }
    case 'sanctions_abstain': {
      state.globalTension = clamp(roundInt(state.globalTension - 3), 0, 100);
      player.stability = clamp(roundInt(player.stability + 2), 5, 100);
      for (const n of sovereigns.slice(0, 6)) {
        adjustRel(state, player.id, n.id, -3);
      }
      summary = `${player.name} si astiene al Consiglio Mondiale promuovendo il dialogo (Tensione Globale -3%, Stabilità +2%).`;
      break;
    }
    case 'sanctions_veto': {
      player.funds = round1(player.funds + 18);
      state.globalTension = clamp(roundInt(state.globalTension + 2), 0, 100);
      if (target && isSovereign(target)) {
        adjustRel(state, player.id, target.id, 18);
        for (const n of sovereigns) {
          if (n.id !== target.id && getRelation(state, n.id, target.id) <= -15) {
            adjustRel(state, player.id, n.id, -10);
          }
        }
        summary = `${player.name} respinge le sanzioni verso ${target.name} (+18 B$ scambi, +18 relazioni), creando attrito con i suoi rivali.`;
      }
      break;
    }

    // --- WORLD COUNCIL: ARMS LIMITATION ---
    case 'arms_sign': {
      state.globalTension = clamp(roundInt(state.globalTension - 8), 0, 100);
      player.stability = clamp(roundInt(player.stability + 6), 5, 100);
      player.funds = round1(player.funds + 20);
      player.army.ground = Math.max(4, roundInt(player.army.ground - 6));
      player.army.air = Math.max(0, roundInt(player.army.air - 4));
      for (const n of sovereigns) {
        adjustRel(state, player.id, n.id, 6);
      }
      summary = `Trattato sugli armamenti ratificato: Tensione -8%, Stabilità +6%, +20 B$ dividendi di pace.`;
      break;
    }
    case 'arms_reject': {
      state.globalTension = clamp(roundInt(state.globalTension + 6), 0, 100);
      player.army.ground = roundInt(player.army.ground + 10);
      player.army.defense = roundInt(player.army.defense + 8);
      player.manpower = roundInt(player.manpower + 15);
      for (const n of sovereigns.filter((s) => s.bloc === 'non_aligned' || s.strictNeutral)) {
        adjustRel(state, player.id, n.id, -6);
      }
      summary = `${player.name} respinge il trattato e potenzia le forze armate (+10 Terrestri, +8 Difesa, Tensione +6%).`;
      break;
    }
    case 'arms_conditional': {
      const cost = 10;
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      state.globalTension = clamp(roundInt(state.globalTension - 4), 0, 100);
      if (player.activeResearch) {
        player.activeResearch.turnsRemaining = round2(
          Math.max(0.2, player.activeResearch.turnsRemaining - 1)
        );
        summary = `Accordo condizionato firmato: Tensione -4% e ricerca attiva accelerata di 1 mese.`;
      } else {
        player.funds = round1(player.funds + 12);
        summary = `Accordo condizionato firmato: Tensione -4% e contributi tecnologici netti (+2 B$).`;
      }
      break;
    }

    // --- WORLD COUNCIL: ENERGY ---
    case 'energy_pool': {
      const cost = round1(Math.max(15, Math.min(35, eco.grossIncome * 0.5)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      player.gdpIncome = round1(player.gdpIncome * 1.02);
      player.stability = clamp(roundInt(player.stability + 4), 5, 100);
      for (const n of sovereigns.filter((s) => s.bloc === player.bloc)) {
        adjustRel(state, player.id, n.id, 8);
      }
      summary = `Fondo energetico comune approvato (-${cost} B$): PIL base +2%, Stabilità +4% e legami di blocco rafforzati.`;
      break;
    }
    case 'energy_national': {
      const cost = round1(Math.max(15, Math.min(35, eco.grossIncome * 0.5)));
      player.publicDebt = round1(player.publicDebt + cost * 1.3);
      player.stability = clamp(roundInt(player.stability + 5), 5, 100);
      for (const n of sovereigns.slice(0, 8)) {
        adjustRel(state, player.id, n.id, -4);
      }
      summary = `Scorte nazionali finanziate a debito (+${round1(cost * 1.3)} B$ debito): Stabilità interna +5%.`;
      break;
    }
    case 'energy_export': {
      const gain = round1(Math.max(16, Math.min(38, eco.grossIncome * 0.55)));
      player.funds = round1(player.funds + gain);
      player.stability = clamp(roundInt(player.stability - 5), 5, 100);
      state.globalTension = clamp(roundInt(state.globalTension + 4), 0, 100);
      for (const n of sovereigns.slice(0, 10)) {
        adjustRel(state, player.id, n.id, -8);
      }
      summary = `Dazi e tariffe di transito incassati (+${gain} B$), ma aumentano malcontento interno (-5%) e tensione internazionale.`;
      break;
    }

    // --- WORLD COUNCIL: HUMANITARIAN AID ---
    case 'aid_lead': {
      const cost = round1(Math.max(14, Math.min(30, eco.grossIncome * 0.45)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      state.globalTension = clamp(roundInt(state.globalTension - 5), 0, 100);
      player.stability = clamp(roundInt(player.stability + 3), 5, 100);
      for (const n of sovereigns) {
        adjustRel(state, player.id, n.id, 6);
      }
      if (target && isSovereign(target)) {
        adjustRel(state, player.id, target.id, 16);
        target.stability = clamp(roundInt(target.stability + 8), 5, 100);
      }
      summary = `${player.name} guida la missione umanitaria (-${cost} B$): prestigio globale in rialzo e Tensione -5%.`;
      break;
    }
    case 'aid_minimal': {
      const cost = round1(Math.max(5, Math.min(11, eco.grossIncome * 0.16)));
      player.funds = round1(Math.max(0, player.funds - cost));
      state.globalTension = clamp(roundInt(state.globalTension - 2), 0, 100);
      for (const n of sovereigns.slice(0, 10)) {
        adjustRel(state, player.id, n.id, 4);
      }
      summary = `Contributo umanitario moderato (-${cost} B$): Tensione Globale -2% e rapporti distesi.`;
      break;
    }
    case 'aid_decline': {
      player.funds = round1(player.funds + 8);
      state.globalTension = clamp(roundInt(state.globalTension + 2), 0, 100);
      for (const n of sovereigns.filter((s) => s.bloc === player.bloc || s.bloc === 'non_aligned')) {
        adjustRel(state, player.id, n.id, -6);
      }
      summary = `${player.name} declina la missione (+8 B$ risparmiati), attirando critiche diplomatiche.`;
      break;
    }

    // --- NATIONAL: INDUSTRIAL REFORM ---
    case 'ind_civil': {
      const cost = round1(Math.max(18, Math.min(48, eco.grossIncome * 0.7)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      player.gdpIncome = round1(player.gdpIncome * 1.04);
      if (player.activeResearch) {
        player.activeResearch.turnsRemaining = round2(
          Math.max(0.2, player.activeResearch.turnsRemaining - 1)
        );
      }
      summary = `Riforma industriale varata (-${cost} B$): PIL base +4% e accelerazione tecnologica.`;
      break;
    }
    case 'ind_defense': {
      const cost = round1(Math.max(14, Math.min(36, eco.grossIncome * 0.52)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      player.army.ground = roundInt(player.army.ground + 12);
      player.army.air = roundInt(player.army.air + 6);
      player.army.defense = roundInt(player.army.defense + 8);
      player.stability = clamp(roundInt(player.stability - 3), 5, 100);
      summary = `Riconversione bellica completata: +12 Terrestri, +6 Aviazione, +8 Difesa (Stabilità -3%).`;
      break;
    }
    case 'ind_bonds': {
      const debtAdd = round1(Math.max(22, Math.min(58, eco.grossIncome * 0.85)));
      player.publicDebt = round1(player.publicDebt + debtAdd);
      player.gdpIncome = round1(player.gdpIncome * 1.03);
      player.stability = clamp(roundInt(player.stability + 2), 5, 100);
      summary = `Riforma finanziata con Titoli di Stato (+${debtAdd} B$ debito): PIL base +3%, Stabilità +2%.`;
      break;
    }

    // --- NATIONAL: SCANDAL ---
    case 'scandal_purge': {
      player.stability = clamp(roundInt(player.stability + 6), 5, 100);
      player.funds = round1(player.funds + 14);
      player.army.defense = Math.max(0, roundInt(player.army.defense - 4));
      summary = `Rimpasto e operazione trasparenza: +6% Stabilità e +14 B$ recuperati (-4 unità Difesa).`;
      break;
    }
    case 'scandal_cover': {
      player.stability = clamp(roundInt(player.stability - 8), 5, 100);
      player.army.defense = roundInt(player.army.defense + 5);
      summary = `Inchiesta archiviata: apparato militare intatto (+5 Difesa), ma forte malcontento (-8% Stabilità).`;
      break;
    }
    case 'scandal_fine': {
      player.funds = round1(player.funds + 20);
      player.stability = clamp(roundInt(player.stability - 4), 5, 100);
      summary = `Sanzioni amministrative incassate (+20 B$), lieve calo di fiducia (-4% Stabilità).`;
      break;
    }

    // --- NATIONAL: ENERGY EMERGENCY ---
    case 'nat_energy_upgrade': {
      const cost = round1(Math.max(14, Math.min(36, eco.grossIncome * 0.55)));
      if (player.funds >= cost) {
        player.funds = round1(player.funds - cost);
      } else {
        player.publicDebt = round1(player.publicDebt + (cost - player.funds));
        player.funds = 0;
      }
      player.gdpIncome = round1(player.gdpIncome * 1.03);
      player.stability = clamp(roundInt(player.stability + 4), 5, 100);
      summary = `Rete elettrica potenziata (-${cost} B$): PIL base +3% e Stabilità +4%.`;
      break;
    }
    case 'nat_energy_ration': {
      player.manpower = roundInt(player.manpower + 8);
      player.stability = clamp(roundInt(player.stability - 7), 5, 100);
      summary = `Razionamento energetico civile applicato: priorità militare mantenuta, Stabilità -7%.`;
      break;
    }
    case 'nat_energy_debt': {
      const debtAdd = round1(Math.max(18, Math.min(45, eco.grossIncome * 0.68)));
      player.publicDebt = round1(player.publicDebt + debtAdd);
      player.stability = clamp(roundInt(player.stability + 3), 5, 100);
      summary = `Decreto energia finanziato a debito (+${debtAdd} B$): continuità garantita e Stabilità +3%.`;
      break;
    }
  }

  if (player.stability < 28) {
    player.internalCrisisActive = true;
  } else if (player.stability >= 42) {
    player.internalCrisisActive = false;
  }

  state.news.unshift(
    createEventNews(
      state,
      evt.kind === 'world_council' ? 'diplomacy' : 'economy',
      `${evt.kind === 'world_council' ? 'Consiglio Mondiale' : 'Decisione di Governo'}: ${choice.label}`,
      summary,
      evt.involvedNationId ? [player.id, evt.involvedNationId] : [player.id]
    )
  );

  state.lastEventTurn = state.turn;
  state.pendingEvent = null;

  return { message: summary };
}
