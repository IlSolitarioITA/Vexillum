import {
  ArmyBranches,
  BlocId,
  CovertOpType,
  FlagSpec,
  NationSeed,
  ScenarioId,
  TechDefinition,
  TechId,
} from '../types/game';
import { BLOC_META } from './nations';
import { TECHNOLOGIES } from './technologies';
import { ALL_NATION_SEEDS } from './worldCatalog';

export interface ScenarioBlocMeta {
  name: string;
  shortName: string;
  color: string;
  description: string;
}

export interface CovertOpSpec {
  id: CovertOpType;
  name: string;
  shortEffect: string;
  description: string;
  cost: number;
  falseFlagExtraCost: number;
  supportsFalseFlag: boolean;
  baseDetectionRisk: number;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  shortName: string;
  eraTag: string;
  startYear: number;
  startMonthIndex: number; // 0-indexed (0 = Gennaio, 6 = Luglio, 8 = Settembre)
  startDateLabel: string;
  accentColor: string;
  summary: string;
  highlights: string[];
  initialTension: number;
  defaultPlayerId: string;
  recommendedIds: string[];
  blocs: Record<BlocId, ScenarioBlocMeta>;
}

export interface HistoricalNationOverride {
  name?: string;
  bloc?: BlocId;
  gdpIncome?: number;
  startingFunds?: number;
  manpower?: number;
  manpowerGrowth?: number;
  stability?: number;
  strictNeutral?: boolean;
  terrainDefense?: number;
  army?: ArmyBranches;
  flag?: FlagSpec;
  recommended?: boolean;
  summary?: string;
}

export interface InitialWarSpec {
  attackerId: string;
  defenderId: string;
  attackerControl?: number;
}

export const SCENARIO_ORDER: ScenarioId[] = ['2026', '1914', '1939'];

export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  '2026': {
    id: '2026',
    title: 'Mondo Attuale',
    shortName: '2026 · Attuale',
    eraTag: 'Gennaio 2026',
    startYear: 2026,
    startMonthIndex: 0,
    startDateLabel: 'Gennaio 2026',
    accentColor: '#22D3EE',
    summary:
      'Geopolitica contemporanea con blocchi moderni, droni tattici, guerra cibernetica, difesa missilistica e 175 nazioni giocabili.',
    highlights: [
      'Blocchi attuali e neutrali attaccabili',
      'Droni, Cyberattacchi e Difesa Aerea Integrata',
      'Equilibrio economico e militare contemporaneo',
    ],
    initialTension: 36,
    defaultPlayerId: '380',
    recommendedIds: ['380', '840', '250', '276', '643', '156', '804', '356', '792', '392'],
    blocs: BLOC_META,
  },
  '1914': {
    id: '1914',
    title: 'Prima Guerra Mondiale',
    shortName: '1914 · WWI',
    eraTag: 'Luglio 1914',
    startYear: 1914,
    startMonthIndex: 6,
    startDateLabel: 'Luglio 1914',
    accentColor: '#F59E0B',
    summary:
      'Grandi imperi europei e coloniali sull’orlo della Grande Guerra: Triplice Intesa contro Imperi Centrali, guerre di trincea, corazzate Dreadnought e aviazione agli albori.',
    highlights: [
      'Triplice Intesa vs Imperi Centrali + Italia e USA inizialmente neutrali',
      'Fanteria di massa e grandi flotte; aviazione ridotta a biplani',
      'Imperi storici accorpati (Austro-Ungarico, Ottomano, Russo, Britannico)',
    ],
    initialTension: 72,
    defaultPlayerId: '380',
    recommendedIds: ['380', '276', '040', '826', '250', '643', '792', '840', '392', '688'],
    blocs: {
      euro_atlantic: {
        name: 'Triplice Intesa',
        shortName: 'Intesa',
        color: '#38BDF8',
        description:
          'Coalizione di Regno Unito, Terza Repubblica Francese, Impero Russo e alleati balcanici.',
      },
      eastern_pact: {
        name: 'Imperi Centrali',
        shortName: 'Imperi Centrali',
        color: '#F43F5E',
        description:
          'Asse imperiale guidato da Impero Tedesco, Impero Austro-Ungarico e Impero Ottomano.',
      },
      indo_pacific: {
        name: 'Domini dell’Impero',
        shortName: 'Domini',
        color: '#A78BFA',
        description:
          'Domini oltremare legati alla Corona Britannica pronti a mobilitare corpi di spedizione.',
      },
      arab_league: {
        name: 'Stati Regionali',
        shortName: 'Regionale',
        color: '#F59E0B',
        description: 'Regni e potenze regionali d’Asia e Africa con diplomazia autonoma.',
      },
      non_aligned: {
        name: 'Potenze Neutrali',
        shortName: 'Neutrale',
        color: '#94A3B8',
        description:
          'Stati inizialmente neutrali o indecisi (Italia, Stati Uniti, Spagna, Svizzera) arbitri del conflitto.',
      },
    },
  },
  '1939': {
    id: '1939',
    title: 'Seconda Guerra Mondiale',
    shortName: '1939 · WWII',
    eraTag: 'Settembre 1939',
    startYear: 1939,
    startMonthIndex: 8,
    startDateLabel: 'Settembre 1939',
    accentColor: '#F43F5E',
    summary:
      'Settembre 1939: la guerra esplode in Europa con l’offensiva in Polonia. Guerra lampo, bombardieri pesanti, sottomarini, Patto Germania–URSS e colosso industriale statunitense.',
    highlights: [
      'Alleati vs Asse + URSS con Patto di non aggressione iniziale',
      'USA inizialmente neutrali con enorme potenziale industriale',
      'Dottrina Blitzkrieg, Radar, Portaerei, Sottomarini e Bombardieri',
    ],
    initialTension: 82,
    defaultPlayerId: '380',
    recommendedIds: ['380', '276', '826', '250', '643', '840', '392', '616', '156', '724'],
    blocs: {
      euro_atlantic: {
        name: 'Alleati',
        shortName: 'Alleati',
        color: '#38BDF8',
        description:
          'Coalizione guidata da Regno Unito, Francia, Polonia e Commonwealth contro l’espansione dell’Asse.',
      },
      eastern_pact: {
        name: 'Potenze dell’Asse',
        shortName: 'Asse',
        color: '#F43F5E',
        description:
          'Alleanza militare tra Germania, Regno d’Italia e Impero Giapponese basata su offensiva rapida.',
      },
      indo_pacific: {
        name: 'Unione Sovietica & Comintern',
        shortName: 'URSS',
        color: '#A78BFA',
        description:
          'Blocco sovietico dotato di immense riserve umane e industria pesante oltre gli Urali.',
      },
      arab_league: {
        name: 'Fronte Asiatico',
        shortName: 'Fronte Asia',
        color: '#F59E0B',
        description: 'Nazioni impegnate nella difesa del continente asiatico e delle rotte regionali.',
      },
      non_aligned: {
        name: 'Potenze Neutrali',
        shortName: 'Neutrale',
        color: '#94A3B8',
        description:
          'Stati inizialmente neutrali (Stati Uniti, Spagna, Svezia, Turchia, Svizzera, America Latina).',
      },
    },
  },
};

export function getScenarioDefinition(scenarioId?: ScenarioId): ScenarioDefinition {
  if (scenarioId && SCENARIOS[scenarioId]) return SCENARIOS[scenarioId];
  return SCENARIOS['2026'];
}

export function getScenarioBlocs(scenarioId?: ScenarioId): Record<BlocId, ScenarioBlocMeta> {
  return getScenarioDefinition(scenarioId).blocs;
}

// =====================================================================
// ERA-ADAPTED TECHNOLOGY TREES (mapped cleanly onto the 8 TechId keys)
// =====================================================================

const TECHNOLOGIES_2026: TechDefinition[] = TECHNOLOGIES.map((t) => {
  if (t.id === 'modern_logistics') {
    return {
      ...t,
      name: 'Logistica Satellitare',
      description:
        'Corridoi di rifornimento digitalizzati e tracciamento satellitare che tagliano il mantenimento e accelerano le offensive.',
    };
  }
  if (t.id === 'precision_artillery') {
    return {
      ...t,
      name: 'Missili di Precisione',
      description:
        'Munizionamento guidato e missili tattici a lungo raggio capaci di logorare le difese nemiche prima del contatto.',
    };
  }
  return t;
});

const TECHNOLOGIES_1914: TechDefinition[] = [
  {
    id: 'integrated_air_defense',
    name: 'Guerra di Trincea',
    shortBonus: '+25% difesa territoriale · dimezza impatto raid nemici',
    description:
      'Reti di trincee profonde, filo spinato, casematte e nidi di mitragliatrici che trasformano il fronte in una fortezza.',
    cost: 42,
    turns: 3,
    category: 'defense',
  },
  {
    id: 'precision_artillery',
    name: 'Artiglieria Pesante',
    shortBonus: '+16% potenza di fuoco · +14% difesa dei confini',
    description:
      'Obici d’assedio e sbarramenti mobili d’artiglieria per frantumare le linee fortificate avversarie.',
    cost: 45,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'tactical_drones',
    name: 'Biplani da Caccia',
    shortBonus: '+18% supporto offensivo · -12% perdite in attacco',
    description:
      'Squadriglie di ricognizione aerea e primi biplani armati per guidare il tiro d’artiglieria e dominare i cieli.',
    cost: 44,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'amphibious_projection',
    name: 'Corazzate Dreadnought',
    shortBonus: '+30% forza navale e sbarchi · requisiti navali ridotti',
    description:
      'Grandi navi da battaglia monocalibro e incrociatori da battaglia per imporre blocchi navali e proiezione marittima.',
    cost: 52,
    turns: 4,
    category: 'offense',
  },
  {
    id: 'cyber_warfare',
    name: 'Gas & Maschere Antigas',
    shortBonus: '-15% efficacia difensiva nemica · +15% resilienza truppe',
    description:
      'Equipaggiamenti protettivi avanzati e dottrina chimica tattica per aprire brecce nelle linee trincerate.',
    cost: 48,
    turns: 3,
    category: 'doctrine',
  },
  {
    id: 'modern_logistics',
    name: 'Logistica Ferroviaria',
    shortBonus: '-20% mantenimento esercito · +12% avanzata territoriale',
    description:
      'Piani di mobilitazione su rotaia e linee ferroviarie strategiche per spostare intere armate tra i fronti.',
    cost: 38,
    turns: 3,
    category: 'economy',
  },
  {
    id: 'war_industry',
    name: 'Economia di Guerra',
    shortBonus: '+20% entrate PIL · -15% costo reclutamento',
    description:
      'Conversione delle acciaierie e mobilitazione industriale totale per produrre milioni di proiettili e fucili.',
    cost: 54,
    turns: 4,
    category: 'economy',
  },
  {
    id: 'joint_doctrine',
    name: 'Primi Carri Armati & Arditi',
    shortBonus: '+22% forza combinata terra-aria-mare',
    description:
      'Mezzi blindati cingolati e reparti d’assalto coordinati con artiglieria e ricognizione per spezzare lo stallo.',
    cost: 70,
    turns: 5,
    category: 'doctrine',
  },
];

const TECHNOLOGIES_1939: TechDefinition[] = [
  {
    id: 'joint_doctrine',
    name: 'Dottrina Blitzkrieg',
    shortBonus: '+22% forza combinata terra-aria-mare',
    description:
      'Guerra lampo basata su divisioni corazzate veloci, fanteria motorizzata e appoggio aereo ravvicinato.',
    cost: 68,
    turns: 4,
    category: 'doctrine',
  },
  {
    id: 'integrated_air_defense',
    name: 'Rete Radar & Intercettori',
    shortBonus: '+25% difesa territoriale · dimezza impatto aereo nemico',
    description:
      'Stazioni radar costiere e comando caccia centralizzato per respingere le incursioni dei bombardieri.',
    cost: 48,
    turns: 3,
    category: 'defense',
  },
  {
    id: 'amphibious_projection',
    name: 'Portaerei & Flotte Anfibie',
    shortBonus: '+30% forza sbarchi navali · requisiti navali ridotti',
    description:
      'Gruppi aeronavali d’altura e mezzi da sbarco per controllare gli oceani e aprire nuovi fronti oltremare.',
    cost: 54,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'precision_artillery',
    name: 'Sottomarini & Artiglieria',
    shortBonus: '+16% potenza di fuoco · +14% difesa dei confini',
    description:
      'Flottiglie di sommergibili oceanici per strangolare i convogli nemici e artiglieria campale pesante.',
    cost: 46,
    turns: 3,
    category: 'defense',
  },
  {
    id: 'tactical_drones',
    name: 'Bombardieri Pesanti',
    shortBonus: '+18% attacco offensivo · -12% perdite in attacco',
    description:
      'Quadrimotori strategici e cacciabombardieri a lungo raggio per colpire fabbriche, ferrovie e difese nemiche.',
    cost: 50,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'war_industry',
    name: 'Industria Bellica Totale',
    shortBonus: '+20% entrate PIL · -15% costo reclutamento',
    description:
      'Catene di montaggio di massa per sfornare carri armati, velivoli e navi mercantili a ritmo continuo.',
    cost: 56,
    turns: 4,
    category: 'economy',
  },
  {
    id: 'cyber_warfare',
    name: 'Crittografia & Intercettazioni',
    shortBonus: '-15% efficacia difensiva nemica · +15% stabilità interna',
    description:
      'Decrittazione dei codici radio avversari e controspionaggio per anticipare ogni manovra nemica.',
    cost: 52,
    turns: 4,
    category: 'doctrine',
  },
  {
    id: 'modern_logistics',
    name: 'Logistica Motorizzata',
    shortBonus: '-20% mantenimento esercito · +12% avanzata territoriale',
    description:
      'Colonne di autocarri, oleodotti da campo e convogli scortati per alimentare offensive a migliaia di chilometri.',
    cost: 42,
    turns: 3,
    category: 'economy',
  },
];

export function getScenarioTechnologies(scenarioId?: ScenarioId): TechDefinition[] {
  if (scenarioId === '1914') return TECHNOLOGIES_1914;
  if (scenarioId === '1939') return TECHNOLOGIES_1939;
  return TECHNOLOGIES_2026;
}

export function getScenarioTech(scenarioId: ScenarioId | undefined, techId: TechId): TechDefinition {
  const list = getScenarioTechnologies(scenarioId);
  return list.find((t) => t.id === techId) ?? TECHNOLOGIES_2026[0];
}

// =====================================================================
// ERA-ADAPTED COVERT OPERATIONS (Cyber -> Intercettazione/Crittografia in 1914/1939)
// =====================================================================

const COVERT_OPS_2026: Record<CovertOpType, CovertOpSpec> = {
  propaganda: {
    id: 'propaganda',
    name: 'Propaganda & Disinformazione',
    shortEffect: '-10% / -14% Stabilità bersaglio',
    description:
      'Campagne mediatiche e disinformazione per erodere la coesione interna del paese bersaglio e alimentare tensioni sociali.',
    cost: 12,
    falseFlagExtraCost: 0,
    supportsFalseFlag: false,
    baseDetectionRisk: 22,
  },
  cyber: {
    id: 'cyber',
    name: 'Cyberattacco',
    shortEffect: '-20% PIL (3 turni) · Disattiva difese aeree · Drena fondi',
    description:
      'Colpisce reti elettriche, banche e radar militari. Supporta copertura False Flag per far ricadere la colpa su una nazione terza.',
    cost: 18,
    falseFlagExtraCost: 8,
    supportsFalseFlag: true,
    baseDetectionRisk: 30,
  },
  sabotage: {
    id: 'sabotage',
    name: 'Sabotaggio Infrastrutture',
    shortEffect: '-30% bonus difensivo (3 turni) · Danneggia difese',
    description:
      'Infiltrati colpiscono depositi, ponti e basi difensive. Può essere mascherato sotto False Flag per innescare crisi tra terzi.',
    cost: 22,
    falseFlagExtraCost: 8,
    supportsFalseFlag: true,
    baseDetectionRisk: 34,
  },
  rebels: {
    id: 'rebels',
    name: 'Finanzia Opposizione / Ribelli',
    shortEffect: '-14% / -18% Stabilità · Sotto il 30% scatena Rivolta Interna',
    description:
      'Fornisce fondi e armi a fazioni dissidenti. Se la Stabilità crolla sotto il 30%, esplode una crisi interna che indebolisce pesantemente economia ed esercito.',
    cost: 24,
    falseFlagExtraCost: 0,
    supportsFalseFlag: false,
    baseDetectionRisk: 36,
  },
};

const COVERT_OPS_HISTORICAL: Record<CovertOpType, CovertOpSpec> = {
  propaganda: {
    id: 'propaganda',
    name: 'Propaganda & Sovversione',
    shortEffect: '-10% / -14% Stabilità bersaglio',
    description:
      'Stampa clandestina, volantinaggio e agitatori politici per fiaccare il morale del fronte interno avversario.',
    cost: 12,
    falseFlagExtraCost: 0,
    supportsFalseFlag: false,
    baseDetectionRisk: 22,
  },
  cyber: {
    id: 'cyber',
    name: 'Intercettazione & Sabotaggio Comunicazioni',
    shortEffect: '-20% PIL (3 turni) · Acceca ricognizione/difesa aerea · Drena fondi',
    description:
      'Decrittazione di dispacci, taglio di cavi telegrafici/radio e telegrammi falsificati. Supporta copertura False Flag per incolpare una potenza terza.',
    cost: 18,
    falseFlagExtraCost: 8,
    supportsFalseFlag: true,
    baseDetectionRisk: 28,
  },
  sabotage: {
    id: 'sabotage',
    name: 'Sabotaggio Ferrovie & Incidenti di Confine',
    shortEffect: '-30% bonus difensivo (3 turni) · Danneggia fortificazioni',
    description:
      'Agenti infiltrati colpiscono snodi ferroviari, arsenali e avamposti. Mascherabile sotto False Flag per provocare una guerra tra terzi.',
    cost: 22,
    falseFlagExtraCost: 8,
    supportsFalseFlag: true,
    baseDetectionRisk: 32,
  },
  rebels: {
    id: 'rebels',
    name: 'Finanzia Opposizione / Rivoltosi',
    shortEffect: '-14% / -18% Stabilità · Sotto il 30% scatena Rivolta Interna',
    description:
      'Arma movimenti indipendentisti e rivoluzionari interni. Sotto il 30% di Stabilità scoppia una rivolta che paralizza economia ed esercito.',
    cost: 24,
    falseFlagExtraCost: 0,
    supportsFalseFlag: false,
    baseDetectionRisk: 34,
  },
};

export function getScenarioCovertOps(scenarioId?: ScenarioId): Record<CovertOpType, CovertOpSpec> {
  if (scenarioId === '1914' || scenarioId === '1939') {
    return COVERT_OPS_HISTORICAL;
  }
  return COVERT_OPS_2026;
}

// =====================================================================
// HISTORICAL EMPIRE TERRITORY MAPPINGS (territoryId -> sovereignOwnerId)
// =====================================================================

const TERRITORY_OWNERS_1914: Record<string, string> = {
  // Impero Tedesco (276)
  '516': '276', // Namibia (Africa Tedesca del Sud-Ovest)
  '834': '276', // Tanzania (Africa Orientale Tedesca)
  '120': '276', // Camerun
  '768': '276', // Togo
  '598': '276', // Nuova Guinea Tedesca

  // Impero Austro-Ungarico (040)
  '348': '040', // Ungheria
  '203': '040', // Boemia / Rep. Ceca
  '703': '040', // Slovacchia
  '191': '040', // Croazia
  '705': '040', // Slovenia
  '070': '040', // Bosnia-Erzegovina

  // Impero Ottomano (792)
  '760': '792', // Siria
  '368': '792', // Mesopotamia / Iraq
  '400': '792', // Transgiordania
  '422': '792', // Libano
  '376': '792', // Palestina
  '275': '792', // Palestina

  // Impero Russo (643)
  '804': '643', // Ucraina
  '112': '643', // Bielorussia
  '616': '643', // Polonia del Congresso
  '246': '643', // Granducato di Finlandia
  '233': '643', // Estonia
  '428': '643', // Lettonia
  '440': '643', // Lituania
  '498': '643', // Bessarabia / Moldavia
  '398': '643', // Kazakistan
  '860': '643', // Uzbekistan
  '795': '643', // Turkmenistan
  '417': '643', // Kirghizistan
  '762': '643', // Tagikistan
  '268': '643', // Georgia
  '051': '643', // Armenia
  '031': '643', // Azerbaigian

  // Impero Britannico (826)
  '372': '826', // Irlanda
  '356': '826', // Raj Britannico (India)
  '586': '826', // Pakistan
  '050': '826', // Bangladesh
  '104': '826', // Birmania
  '144': '826', // Ceylon
  '458': '826', // Malesia Britannica
  '096': '826', // Brunei
  '818': '826', // Egitto (Protettorato)
  '729': '826', // Sudan Anglo-Egiziano
  '728': '826', // Sud Sudan
  '404': '826', // Africa Orientale Britannica (Kenya)
  '800': '826', // Uganda
  '566': '826', // Nigeria
  '288': '826', // Costa d'Oro (Ghana)
  '694': '826', // Sierra Leone
  '270': '826', // Gambia
  '894': '826', // Rhodesia Settentrionale
  '716': '826', // Rhodesia Meridionale
  '072': '826', // Bechuanaland
  '454': '826', // Nyasaland
  '426': '826', // Basutoland
  '748': '826', // Swaziland
  '887': '826', // Aden / Yemen
  '512': '826', // Oman
  '414': '826', // Kuwait
  '784': '826', // Stati della Tregua
  '634': '826', // Qatar
  '196': '826', // Cipro
  'NCY': '826', // Cipro Nord
  '328': '826', // Guyana Britannica
  '084': '826', // Honduras Britannico
  '388': '826', // Giamaica
  '044': '826', // Bahamas
  '780': '826', // Trinidad
  '238': '826', // Falkland
  '090': '826', // Isole Salomone
  '242': '826', // Figi
  'SML': '826', // Somaliland Britannico

  // Terza Repubblica Francese (250)
  '012': '250', // Algeria
  '788': '250', // Tunisia
  '504': '250', // Marocco Francese
  '478': '250', // Mauritania
  '466': '250', // Sudan Francese (Mali)
  '562': '250', // Niger
  '148': '250', // Ciad
  '686': '250', // Senegal
  '324': '250', // Guinea Francese
  '384': '250', // Costa d'Avorio
  '854': '250', // Alto Volta
  '204': '250', // Dahomey
  '140': '250', // Ubangi-Sciari
  '178': '250', // Congo Francese
  '266': '250', // Gabon
  '450': '250', // Madagascar
  '262': '250', // Somalia Francese (Gibuti)
  '704': '250', // Indocina (Vietnam)
  '418': '250', // Laos
  '116': '250', // Cambogia
  '540': '250', // Nuova Caledonia
  '548': '250', // Nuove Ebridi

  // Regno d'Italia (380)
  '434': '380', // Libia Italiana
  '232': '380', // Eritrea Italiana
  '706': '380', // Somalia Italiana

  // Impero Giapponese (392)
  '410': '392', // Corea
  '408': '392', // Corea Nord
  '158': '392', // Formosa / Taiwan

  // Altri Imperi Coloniali
  '180': '056', // Congo Belga -> Belgio
  '646': '276', // Ruanda -> Africa Orientale Tedesca
  '108': '276', // Burundi -> Africa Orientale Tedesca
  '360': '528', // Indie Orientali Olandesi -> Paesi Bassi
  '740': '528', // Suriname -> Paesi Bassi
  '024': '620', // Angola -> Portogallo
  '508': '620', // Mozambico -> Portogallo
  '624': '620', // Guinea-Bissau -> Portogallo
  '626': '620', // Timor Est -> Portogallo
  '226': '724', // Guinea Spagnola -> Spagna
  '732': '724', // Sahara Spagnolo -> Spagna
  '608': '840', // Filippine -> USA
  '630': '840', // Porto Rico -> USA
  '304': '208', // Groenlandia -> Danimarca
  '352': '208', // Islanda -> Danimarca (unione 1914)
  '807': '688', // Macedonia -> Serbia
  'XKX': '688', // Kosovo -> Serbia
};

const TERRITORY_OWNERS_1939: Record<string, string> = {
  // Germania (276) - post Anschluss & Protettorato di Boemia
  '040': '276', // Austria
  '203': '276', // Boemia e Moravia (Rep. Ceca)

  // Unione Sovietica (643) - Settembre 1939 (Baltici e Finlandia ancora indipendenti)
  '804': '643', // Ucraina
  '112': '643', // Bielorussia
  '398': '643', // Kazakistan
  '860': '643', // Uzbekistan
  '795': '643', // Turkmenistan
  '417': '643', // Kirghizistan
  '762': '643', // Tagikistan
  '268': '643', // Georgia
  '051': '643', // Armenia
  '031': '643', // Azerbaigian

  // Regno d'Italia (380)
  '434': '380', // Libia Italiana
  '008': '380', // Albania
  '231': '380', // Etiopia (Africa Orientale Italiana)
  '232': '380', // Eritrea
  '706': '380', // Somalia

  // Impero Giapponese (392)
  '410': '392', // Corea
  '408': '392', // Corea Nord
  '158': '392', // Taiwan

  // Regno Unito / Impero Britannico (826) - Irlanda e Iraq indipendenti nel 1939
  '356': '826', // India Britannica
  '586': '826', // Pakistan
  '050': '826', // Bangladesh
  '104': '826', // Birmania
  '144': '826', // Ceylon
  '458': '826', // Malesia Britannica
  '096': '826', // Brunei
  '818': '826', // Egitto
  '729': '826', // Sudan
  '728': '826', // Sud Sudan
  '404': '826', // Kenya
  '800': '826', // Uganda
  '834': '826', // Tanganica (Mandato Britannico)
  '566': '826', // Nigeria
  '288': '826', // Costa d'Oro
  '694': '826', // Sierra Leone
  '270': '826', // Gambia
  '894': '826', // Rhodesia Settentrionale
  '716': '826', // Rhodesia Meridionale
  '072': '826', // Bechuanaland
  '454': '826', // Nyasaland
  '426': '826', // Basutoland
  '748': '826', // Swaziland
  '400': '826', // Transgiordania
  '376': '826', // Palestina (Mandato)
  '275': '826', // Palestina
  '887': '826', // Aden
  '512': '826', // Oman
  '414': '826', // Kuwait
  '784': '826', // Stati della Tregua
  '634': '826', // Qatar
  '196': '826', // Cipro
  'NCY': '826', // Cipro Nord
  '328': '826', // Guyana Britannica
  '084': '826', // Honduras Britannico
  '388': '826', // Giamaica
  '044': '826', // Bahamas
  '780': '826', // Trinidad
  '238': '826', // Falkland
  '090': '826', // Isole Salomone
  '242': '826', // Figi
  'SML': '826', // Somaliland Britannico

  // Francia (250)
  '012': '250', // Algeria
  '788': '250', // Tunisia
  '504': '250', // Marocco
  '760': '250', // Siria (Mandato)
  '422': '250', // Libano (Mandato)
  '120': '250', // Camerun Francese
  '768': '250', // Togo Francese
  '478': '250', // Mauritania
  '466': '250', // Mali
  '562': '250', // Niger
  '148': '250', // Ciad
  '686': '250', // Senegal
  '324': '250', // Guinea
  '384': '250', // Costa d'Avorio
  '854': '250', // Alto Volta
  '204': '250', // Dahomey
  '140': '250', // Rep. Centrafricana
  '178': '250', // Congo Francese
  '266': '250', // Gabon
  '450': '250', // Madagascar
  '262': '250', // Gibuti
  '704': '250', // Indocina
  '418': '250', // Laos
  '116': '250', // Cambogia
  '540': '250', // Nuova Caledonia
  '548': '250', // Nuove Ebridi

  // Jugoslavia (688) nel 1939
  '191': '688', // Croazia
  '705': '688', // Slovenia
  '070': '688', // Bosnia
  '499': '688', // Montenegro
  '807': '688', // Macedonia
  'XKX': '688', // Kosovo

  // Altri domini 1939
  '516': '710', // Namibia -> Sudafrica
  '598': '036', // Papua Nuova Guinea -> Australia
  '180': '056', // Congo Belga -> Belgio
  '646': '056', // Ruanda-Urundi -> Belgio
  '108': '056', // Burundi -> Belgio
  '360': '528', // Indie Orientali Olandesi -> Paesi Bassi
  '740': '528', // Suriname -> Paesi Bassi
  '024': '620', // Angola -> Portogallo
  '508': '620', // Mozambico -> Portogallo
  '624': '620', // Guinea-Bissau -> Portogallo
  '626': '620', // Timor Est -> Portogallo
  '226': '724', // Guinea Spagnola -> Spagna
  '732': '724', // Sahara Spagnolo -> Spagna
  '608': '840', // Filippine -> USA
  '630': '840', // Porto Rico -> USA
  '304': '208', // Groenlandia -> Danimarca
  '498': '642', // Bessarabia -> Romania (1939)
};

export function getScenarioTerritoryOwners(scenarioId: ScenarioId): Record<string, string> {
  if (scenarioId === '1914') return TERRITORY_OWNERS_1914;
  if (scenarioId === '1939') return TERRITORY_OWNERS_1939;
  return {};
}

// =====================================================================
// HISTORICAL NATION OVERRIDES (1914 & 1939)
// =====================================================================

const OVERRIDES_1914: Record<string, HistoricalNationOverride> = {
  '276': {
    name: 'Impero Tedesco',
    bloc: 'eastern_pact',
    gdpIncome: 82,
    startingFunds: 190,
    manpower: 680,
    manpowerGrowth: 30,
    stability: 84,
    army: { ground: 390, air: 24, navy: 190, defense: 240 },
    flag: { pattern: 'horizontal3', colors: ['#111827', '#F8FAFC', '#DC2626'] },
    recommended: true,
    summary:
      'Prima potenza industriale e terrestre d’Europa, con potentissima flotta d’altura ma stretto tra due fronti.',
  },
  '040': {
    name: 'Impero Austro-Ungarico',
    bloc: 'eastern_pact',
    gdpIncome: 52,
    startingFunds: 130,
    manpower: 460,
    manpowerGrowth: 22,
    stability: 64,
    terrainDefense: 1.24,
    army: { ground: 270, air: 14, navy: 78, defense: 175 },
    flag: { pattern: 'horizontal2', colors: ['#111827', '#FACC15'] },
    recommended: true,
    summary:
      'Grande impero danubiano multietnico al centro della Crisi di Luglio, con forte esercito e tensioni interne.',
  },
  '792': {
    name: 'Impero Ottomano',
    bloc: 'eastern_pact',
    gdpIncome: 34,
    startingFunds: 90,
    manpower: 340,
    manpowerGrowth: 18,
    stability: 58,
    terrainDefense: 1.24,
    army: { ground: 205, air: 8, navy: 55, defense: 145 },
    flag: { pattern: 'solid_emblem', colors: ['#C8102E', '#F8FAFC'] },
    recommended: true,
    summary:
      'Impero degli Stretti tra Anatolia e Medio Oriente: difese naturali tenaci ma economia fragile.',
  },
  '643': {
    name: 'Impero Russo',
    bloc: 'euro_atlantic',
    gdpIncome: 62,
    startingFunds: 140,
    manpower: 980,
    manpowerGrowth: 42,
    stability: 59,
    terrainDefense: 1.25,
    army: { ground: 430, air: 18, navy: 105, defense: 210 },
    flag: { pattern: 'horizontal3', colors: ['#F8FAFC', '#0039A6', '#D52B1E'] },
    recommended: true,
    summary:
      'Il rullo compressore zarista: riserve umane quasi inesauribili ma logistica arretrata e rischio rivoluzione.',
  },
  '826': {
    name: 'Impero Britannico',
    bloc: 'euro_atlantic',
    gdpIncome: 96,
    startingFunds: 240,
    manpower: 560,
    manpowerGrowth: 26,
    stability: 85,
    terrainDefense: 1.24,
    army: { ground: 185, air: 20, navy: 280, defense: 165 },
    flag: { pattern: 'cross', colors: ['#012169', '#C8102E', '#F8FAFC'] },
    recommended: true,
    summary:
      'Signora dei mari con la Royal Navy dominante e un impero globale capace di strangolare i nemici col blocco navale.',
  },
  '250': {
    name: 'Terza Repubblica Francese',
    bloc: 'euro_atlantic',
    gdpIncome: 70,
    startingFunds: 175,
    manpower: 520,
    manpowerGrowth: 22,
    stability: 79,
    terrainDefense: 1.18,
    army: { ground: 340, air: 24, navy: 140, defense: 230 },
    flag: { pattern: 'vertical3', colors: ['#0055A4', '#F8FAFC', '#EF4135'] },
    recommended: true,
    summary:
      'Pilastro dell’Intesa sul fronte occidentale: esercito di leva enorme, artiglieria celebre e vasto impero coloniale.',
  },
  '380': {
    name: 'Regno d’Italia',
    bloc: 'non_aligned',
    gdpIncome: 44,
    startingFunds: 115,
    manpower: 350,
    manpowerGrowth: 17,
    stability: 72,
    terrainDefense: 1.22,
    army: { ground: 210, air: 12, navy: 112, defense: 145 },
    flag: { pattern: 'vertical3', colors: ['#009246', '#F8FAFC', '#CE2B37'] },
    recommended: true,
    summary:
      'Inizialmente neutrale e contesa tra Intesa e Imperi Centrali: puoi scegliere da che parte entrare nella Grande Guerra.',
  },
  '840': {
    name: 'Stati Uniti',
    bloc: 'non_aligned',
    gdpIncome: 112,
    startingFunds: 260,
    manpower: 720,
    manpowerGrowth: 32,
    stability: 88,
    strictNeutral: false,
    army: { ground: 115, air: 10, navy: 155, defense: 125 },
    flag: { pattern: 'canton', colors: ['#B22234', '#F8FAFC', '#3C3B6E'] },
    recommended: true,
    summary:
      'Colosso economico inizialmente isolazionista: esercito permanente ridotto ma capacità industriale senza rivali.',
  },
  '392': {
    name: 'Impero Giapponese',
    bloc: 'euro_atlantic',
    gdpIncome: 42,
    startingFunds: 110,
    manpower: 360,
    manpowerGrowth: 18,
    stability: 84,
    army: { ground: 195, air: 10, navy: 145, defense: 130 },
    flag: { pattern: 'circle', colors: ['#F8FAFC', '#BC002D'] },
    recommended: true,
    summary:
      'Potenza emergente del Pacifico, alleata della Gran Bretagna e pronta a espandersi nell’Estremo Oriente.',
  },
  '688': {
    name: 'Regno di Serbia',
    bloc: 'euro_atlantic',
    gdpIncome: 16,
    startingFunds: 48,
    manpower: 165,
    manpowerGrowth: 9,
    stability: 78,
    terrainDefense: 1.32,
    army: { ground: 128, air: 4, navy: 4, defense: 115 },
    recommended: true,
    summary:
      'Epicentro della crisi del 1914: terreno montuoso impervio ed esercito veterano delle guerre balcaniche.',
  },
  '056': {
    name: 'Regno del Belgio',
    bloc: 'euro_atlantic',
    gdpIncome: 30,
    startingFunds: 85,
    manpower: 145,
    manpowerGrowth: 8,
    stability: 82,
    army: { ground: 98, air: 6, navy: 22, defense: 125 },
    summary: 'Fortezze strategiche tra Germania e Francia, sostenuto dalle risorse del Congo Belga.',
  },
  '100': {
    name: 'Regno di Bulgaria',
    bloc: 'eastern_pact',
    gdpIncome: 16,
    startingFunds: 48,
    manpower: 145,
    manpowerGrowth: 8,
    stability: 73,
    army: { ground: 125, air: 5, navy: 14, defense: 95 },
    summary: 'Forte esercito balcanico orientato verso gli Imperi Centrali.',
  },
  '724': {
    name: 'Regno di Spagna',
    bloc: 'non_aligned',
    strictNeutral: true,
    gdpIncome: 30,
    startingFunds: 82,
    manpower: 210,
    manpowerGrowth: 11,
    stability: 74,
    army: { ground: 125, air: 6, navy: 55, defense: 95 },
    summary: 'Potenza neutrale dell’Europa occidentale, esterna ai blocchi del 1914.',
  },
  '642': {
    name: 'Regno di Romania',
    bloc: 'non_aligned',
    gdpIncome: 22,
    startingFunds: 60,
    manpower: 180,
    manpowerGrowth: 10,
    stability: 72,
    army: { ground: 135, air: 5, navy: 14, defense: 90 },
    summary: 'Nazione strategica nei Carpazi ricca di petrolio, inizialmente neutrale.',
  },
  '300': {
    name: 'Regno di Grecia',
    bloc: 'non_aligned',
    gdpIncome: 17,
    startingFunds: 52,
    manpower: 130,
    manpowerGrowth: 8,
    stability: 70,
    army: { ground: 95, air: 5, navy: 52, defense: 80 },
    summary: 'Potenza marittima dell’Egeo contesa diplomaticamente dai due blocchi.',
  },
  '124': {
    name: 'Dominio del Canada',
    bloc: 'indo_pacific',
    gdpIncome: 32,
    startingFunds: 85,
    manpower: 165,
    manpowerGrowth: 10,
    stability: 88,
    army: { ground: 82, air: 6, navy: 35, defense: 75 },
    summary: 'Dominio nordamericano pronto a inviare divisioni a fianco dell’Impero Britannico.',
  },
  '036': {
    name: 'Australia',
    bloc: 'indo_pacific',
    gdpIncome: 26,
    startingFunds: 75,
    manpower: 125,
    manpowerGrowth: 8,
    stability: 88,
    army: { ground: 74, air: 5, navy: 42, defense: 70 },
    summary: 'Dominio del Pacifico, nucleo del corpo di spedizione ANZAC.',
  },
  '554': {
    name: 'Nuova Zelanda',
    bloc: 'indo_pacific',
    gdpIncome: 14,
    startingFunds: 42,
    manpower: 62,
    manpowerGrowth: 4,
    stability: 90,
    army: { ground: 40, air: 3, navy: 22, defense: 45 },
    summary: 'Alleato del Pacifico fedele alla Corona Britannica.',
  },
  '710': {
    name: 'Unione Sudafricana',
    bloc: 'indo_pacific',
    gdpIncome: 22,
    startingFunds: 65,
    manpower: 115,
    manpowerGrowth: 7,
    stability: 74,
    army: { ground: 68, air: 4, navy: 24, defense: 60 },
    summary: 'Dominio africano strategico sulla rotta del Capo.',
  },
  '156': {
    name: 'Repubblica di Cina',
    bloc: 'non_aligned',
    gdpIncome: 34,
    startingFunds: 78,
    manpower: 880,
    manpowerGrowth: 36,
    stability: 48,
    army: { ground: 230, air: 4, navy: 22, defense: 135 },
    summary: 'Immensa repubblica nata da poco, ricchissima di manodopera ma instabile.',
  },
  '364': {
    name: 'Persia',
    bloc: 'arab_league',
    gdpIncome: 16,
    startingFunds: 46,
    manpower: 165,
    manpowerGrowth: 9,
    stability: 58,
    army: { ground: 78, air: 2, navy: 12, defense: 65 },
    summary: 'Antico regno crocevia petrolifero tra Impero Russo, Ottomano e Britannico.',
  },
};

const OVERRIDES_1939: Record<string, HistoricalNationOverride> = {
  '276': {
    name: 'Germania',
    bloc: 'eastern_pact',
    gdpIncome: 96,
    startingFunds: 210,
    manpower: 680,
    manpowerGrowth: 30,
    stability: 84,
    army: { ground: 410, air: 265, navy: 125, defense: 235 },
    flag: { pattern: 'horizontal3', colors: ['#111827', '#DC2626', '#F8FAFC'] },
    recommended: true,
    summary:
      'Wehrmacht meccanizzata, Luftwaffe dominante e dottrina Blitzkrieg: pronta a ridisegnare la mappa d’Europa.',
  },
  '380': {
    name: 'Regno d’Italia',
    bloc: 'eastern_pact',
    gdpIncome: 48,
    startingFunds: 118,
    manpower: 390,
    manpowerGrowth: 19,
    stability: 75,
    terrainDefense: 1.18,
    army: { ground: 235, air: 135, navy: 165, defense: 155 },
    flag: { pattern: 'vertical3', colors: ['#009246', '#F8FAFC', '#CE2B37'] },
    recommended: true,
    summary:
      'Potenza dell’Asse nel Mediterraneo con forte Regia Marina, basi in Africa e sfida logistica industriale.',
  },
  '392': {
    name: 'Impero Giapponese',
    bloc: 'eastern_pact',
    gdpIncome: 58,
    startingFunds: 145,
    manpower: 510,
    manpowerGrowth: 24,
    stability: 84,
    army: { ground: 295, air: 175, navy: 245, defense: 180 },
    flag: { pattern: 'circle', colors: ['#F8FAFC', '#BC002D'] },
    recommended: true,
    summary:
      'Flotta di portaerei d’élite ed esercito veterano già impegnato in Cina e pronto a sfidare il Pacifico.',
  },
  '826': {
    name: 'Regno Unito',
    bloc: 'euro_atlantic',
    gdpIncome: 94,
    startingFunds: 245,
    manpower: 540,
    manpowerGrowth: 24,
    stability: 86,
    terrainDefense: 1.26,
    army: { ground: 215, air: 215, navy: 295, defense: 210 },
    flag: { pattern: 'cross', colors: ['#012169', '#C8102E', '#F8FAFC'] },
    recommended: true,
    summary:
      'Royal Navy, RAF e risorse dell’Impero: fortezza insulare determinata a resistere e guidare gli Alleati.',
  },
  '250': {
    name: 'Francia',
    bloc: 'euro_atlantic',
    gdpIncome: 68,
    startingFunds: 170,
    manpower: 450,
    manpowerGrowth: 20,
    stability: 72,
    terrainDefense: 1.22,
    army: { ground: 310, air: 140, navy: 165, defense: 245 },
    flag: { pattern: 'vertical3', colors: ['#0055A4', '#F8FAFC', '#EF4135'] },
    recommended: true,
    summary:
      'Linea Maginot, vasto esercito metropolitano e impero coloniale: decisiva per fermare l’avanzata a ovest.',
  },
  '643': {
    name: 'Unione Sovietica',
    bloc: 'indo_pacific',
    gdpIncome: 98,
    startingFunds: 225,
    manpower: 1120,
    manpowerGrowth: 48,
    stability: 76,
    terrainDefense: 1.28,
    army: { ground: 485, air: 215, navy: 115, defense: 265 },
    flag: { pattern: 'solid_emblem', colors: ['#B91C1C', '#FACC15'] },
    recommended: true,
    summary:
      'Colosso industriale e demografico con patto iniziale di non aggressione con Berlino e immensa profondità strategica.',
  },
  '840': {
    name: 'Stati Uniti',
    bloc: 'non_aligned',
    gdpIncome: 145,
    startingFunds: 340,
    manpower: 920,
    manpowerGrowth: 40,
    stability: 90,
    strictNeutral: false,
    army: { ground: 185, air: 190, navy: 280, defense: 185 },
    flag: { pattern: 'canton', colors: ['#B22234', '#F8FAFC', '#3C3B6E'] },
    recommended: true,
    summary:
      'Arsenale della democrazia: inizialmente neutrale ma con una capacità economica e produttiva ineguagliabile.',
  },
  '616': {
    name: 'Polonia',
    bloc: 'euro_atlantic',
    gdpIncome: 28,
    startingFunds: 75,
    manpower: 280,
    manpowerGrowth: 14,
    stability: 78,
    terrainDefense: 1.12,
    army: { ground: 185, air: 62, navy: 20, defense: 125 },
    recommended: true,
    summary:
      'In prima linea nel Settembre 1939: sfida estrema per resistere all’offensiva in attesa del supporto alleato.',
  },
  '156': {
    name: 'Cina',
    bloc: 'arab_league',
    gdpIncome: 40,
    startingFunds: 95,
    manpower: 980,
    manpowerGrowth: 42,
    stability: 58,
    terrainDefense: 1.24,
    army: { ground: 310, air: 52, navy: 28, defense: 180 },
    flag: { pattern: 'canton', colors: ['#DE2910', '#0038A8', '#F8FAFC'] },
    recommended: true,
    summary:
      'Immensa resistenza continentale già in guerra contro l’Impero Giapponese, sorretta da riserve umane gigantesche.',
  },
  '724': {
    name: 'Spagna',
    bloc: 'non_aligned',
    strictNeutral: true,
    gdpIncome: 24,
    startingFunds: 60,
    manpower: 205,
    manpowerGrowth: 11,
    stability: 60,
    army: { ground: 145, air: 48, navy: 52, defense: 95 },
    recommended: true,
    summary: 'Uscita dalla guerra civile e ufficialmente neutrale ma in posizione chiave su Gibilterra.',
  },
  '124': {
    name: 'Canada',
    bloc: 'euro_atlantic',
    gdpIncome: 44,
    startingFunds: 115,
    manpower: 210,
    manpowerGrowth: 12,
    stability: 90,
    army: { ground: 112, air: 82, navy: 78, defense: 85 },
    summary: 'Base industriale nordamericana degli Alleati e scorta vitale dei convogli atlantici.',
  },
  '036': {
    name: 'Australia',
    bloc: 'euro_atlantic',
    gdpIncome: 34,
    startingFunds: 90,
    manpower: 155,
    manpowerGrowth: 9,
    stability: 89,
    army: { ground: 95, air: 65, navy: 68, defense: 80 },
    summary: 'Bastione alleato nel Pacifico meridionale.',
  },
  '554': {
    name: 'Nuova Zelanda',
    bloc: 'euro_atlantic',
    gdpIncome: 16,
    startingFunds: 48,
    manpower: 72,
    manpowerGrowth: 4,
    stability: 91,
    army: { ground: 52, air: 32, navy: 30, defense: 48 },
    summary: 'Alleato del Commonwealth nel Pacifico.',
  },
  '710': {
    name: 'Sudafrica',
    bloc: 'euro_atlantic',
    gdpIncome: 26,
    startingFunds: 72,
    manpower: 145,
    manpowerGrowth: 8,
    stability: 78,
    army: { ground: 82, air: 46, navy: 35, defense: 68 },
    summary: 'Alleato africano sulla rotta strategica tra Atlantico e Oceano Indiano.',
  },
  '348': {
    name: 'Ungheria',
    bloc: 'eastern_pact',
    gdpIncome: 20,
    startingFunds: 55,
    manpower: 145,
    manpowerGrowth: 8,
    stability: 74,
    army: { ground: 115, air: 42, navy: 0, defense: 82 },
    summary: 'Regno centro-europeo allineato con le Potenze dell’Asse.',
  },
  '703': {
    name: 'Slovacchia',
    bloc: 'eastern_pact',
    gdpIncome: 14,
    startingFunds: 38,
    manpower: 78,
    manpowerGrowth: 5,
    stability: 72,
    army: { ground: 68, air: 24, navy: 0, defense: 58 },
    summary: 'Stato alleato della Germania sul confine meridionale polacco.',
  },
  '688': {
    name: 'Regno di Jugoslavia',
    bloc: 'non_aligned',
    gdpIncome: 24,
    startingFunds: 66,
    manpower: 230,
    manpowerGrowth: 12,
    stability: 64,
    terrainDefense: 1.28,
    army: { ground: 155, air: 48, navy: 28, defense: 115 },
    summary: 'Regno balcanico unificato con terreno montuoso ideale per la difesa.',
  },
  '246': {
    name: 'Finlandia',
    bloc: 'non_aligned',
    gdpIncome: 20,
    startingFunds: 58,
    manpower: 125,
    manpowerGrowth: 6,
    stability: 88,
    terrainDefense: 1.35,
    army: { ground: 118, air: 38, navy: 22, defense: 145 },
    summary: 'Linea Mannerheim e tattiche invernali leggendarie sul confine nord-orientale.',
  },
  '792': {
    name: 'Turchia',
    bloc: 'non_aligned',
    strictNeutral: true,
    gdpIncome: 26,
    startingFunds: 72,
    manpower: 245,
    manpowerGrowth: 13,
    stability: 80,
    army: { ground: 155, air: 52, navy: 42, defense: 120 },
    summary: 'Repubblica neutrale custode strategica degli Stretti del Bosforo.',
  },
  '752': {
    name: 'Svezia',
    bloc: 'non_aligned',
    strictNeutral: true,
    gdpIncome: 30,
    startingFunds: 88,
    manpower: 115,
    manpowerGrowth: 6,
    stability: 91,
    army: { ground: 92, air: 62, navy: 58, defense: 105 },
    summary: 'Neutrale scandinava esportatrice di ferro strategico.',
  },
};

// =====================================================================
// SCENARIO SEED BUILDER (preserves all 175 map territories with era stats)
// =====================================================================

function buildSeedsForScenario(scenarioId: ScenarioId): NationSeed[] {
  if (scenarioId === '2026') {
    return ALL_NATION_SEEDS;
  }

  const overrides = scenarioId === '1914' ? OVERRIDES_1914 : OVERRIDES_1939;
  const owners = getScenarioTerritoryOwners(scenarioId);
  const recommendedSet = new Set(SCENARIOS[scenarioId].recommendedIds);

  return ALL_NATION_SEEDS.map((base) => {
    const ov = overrides[base.id];
    const isSubject = Boolean(owners[base.id]);

    // Era-appropriate default bloc for non-overridden nations
    let defaultBloc: BlocId = 'non_aligned';
    if (scenarioId === '1914') {
      if (base.id === '499') defaultBloc = 'euro_atlantic'; // Montenegro
      else defaultBloc = 'non_aligned';
    } else if (scenarioId === '1939') {
      if (base.id === '496') defaultBloc = 'indo_pacific'; // Mongolia
      else defaultBloc = 'non_aligned';
    }

    // Era-appropriate baseline military scaling for minor nations without explicit override
    const scaledArmy: ArmyBranches = ov?.army
      ? { ...ov.army }
      : scenarioId === '1914'
        ? {
            ground: Math.max(18, Math.round(base.army.ground * 1.15)),
            air: Math.max(2, Math.round(base.army.air * 0.14)), // Biplani/ricognizione molto ridotta nel 1914
            navy: base.coastal ? Math.max(6, Math.round(base.army.navy * 0.9)) : 0,
            defense: Math.max(18, Math.round(base.army.defense * 1.1)),
          }
        : {
            ground: Math.max(18, Math.round(base.army.ground * 1.05)),
            air: Math.max(8, Math.round(base.army.air * 0.78)),
            navy: base.coastal ? Math.max(6, Math.round(base.army.navy * 0.92)) : 0,
            defense: Math.max(16, Math.round(base.army.defense * 1.0)),
          };

    return {
      ...base,
      name: ov?.name ?? base.name,
      bloc: ov?.bloc ?? defaultBloc,
      gdpIncome: ov?.gdpIncome ?? Math.max(6, Math.round(base.gdpIncome * (scenarioId === '1914' ? 0.78 : 0.88))),
      startingFunds: ov?.startingFunds ?? Math.max(22, Math.round(base.startingFunds * 0.85)),
      manpower: ov?.manpower ?? Math.max(45, Math.round(base.manpower * (scenarioId === '1914' ? 1.05 : 1.0))),
      manpowerGrowth: ov?.manpowerGrowth ?? base.manpowerGrowth,
      stability: ov?.stability ?? base.stability,
      strictNeutral: ov?.strictNeutral !== undefined ? ov.strictNeutral : base.strictNeutral,
      terrainDefense: ov?.terrainDefense ?? base.terrainDefense,
      army: scaledArmy,
      flag: ov?.flag ?? base.flag,
      recommended: !isSubject && (ov?.recommended ?? recommendedSet.has(base.id)),
      summary: ov?.summary ?? base.summary,
    };
  });
}

const SCENARIO_SEEDS_CACHE: Partial<Record<ScenarioId, NationSeed[]>> = {};

export function getScenarioNationSeeds(scenarioId: ScenarioId): NationSeed[] {
  if (!SCENARIO_SEEDS_CACHE[scenarioId]) {
    SCENARIO_SEEDS_CACHE[scenarioId] = buildSeedsForScenario(scenarioId);
  }
  return SCENARIO_SEEDS_CACHE[scenarioId]!;
}

export function getScenarioPlayableSeeds(scenarioId: ScenarioId): NationSeed[] {
  const owners = getScenarioTerritoryOwners(scenarioId);
  return getScenarioNationSeeds(scenarioId).filter((seed) => !owners[seed.id]);
}

export function getScenarioInitialDiplomacy(scenarioId: ScenarioId): {
  alliances: Array<[string, string]>;
  nonAggressionPacts: Array<[string, string, number]>;
  relations: Array<[string, string, number]>;
  initialWars: InitialWarSpec[];
} {
  if (scenarioId === '1914') {
    return {
      alliances: [
        // Triplice Intesa + Alleati
        ['826', '250'], // Impero Britannico - Francia
        ['250', '643'], // Francia - Impero Russo
        ['826', '643'], // Impero Britannico - Impero Russo
        ['643', '688'], // Impero Russo - Serbia
        ['826', '056'], // Impero Britannico - Belgio
        ['250', '056'], // Francia - Belgio
        ['826', '392'], // Alleanza Anglo-Giapponese
        ['688', '499'], // Serbia - Montenegro
        // Domini dell'Impero Britannico
        ['826', '124'],
        ['826', '036'],
        ['826', '554'],
        ['826', '710'],
        // Imperi Centrali
        ['276', '040'], // Impero Tedesco - Austria-Ungheria
        ['276', '792'], // Impero Tedesco - Impero Ottomano
        ['040', '792'], // Austria-Ungheria - Impero Ottomano
        ['276', '100'], // Germania - Bulgaria
      ],
      nonAggressionPacts: [],
      relations: [
        ['040', '688', -95], // Crisi di Sarajevo: Austria-Ungheria vs Serbia
        ['276', '250', -88], // Germania vs Francia
        ['276', '643', -85], // Germania vs Russia
        ['276', '826', -78], // Corsa navale Germania vs UK
        ['040', '643', -86], // Austria-Ungheria vs Russia
        ['792', '643', -82], // Ottomani vs Russia
        ['380', '040', -28], // Italia vs Austria-Ungheria (terre irredente)
        ['380', '250', 22], // Italia indecisa verso Intesa
        ['380', '826', 32],
        ['380', '276', 10], // Vecchi legami Triplice
        ['840', '826', 38], // USA isolazionisti ma vicini a UK
        ['840', '250', 34],
        ['840', '276', -15],
      ],
      initialWars: [
        // Luglio 1914: la Crisi di Sarajevo sfocia nell'ultimatum e nell'apertura del fronte balcanico
        { attackerId: '040', defenderId: '688', attackerControl: 12 },
      ],
    };
  }

  if (scenarioId === '1939') {
    return {
      alliances: [
        // Alleati
        ['826', '250'], // Regno Unito - Francia
        ['826', '616'], // Garanzia anglo-polacca
        ['250', '616'], // Alleanza franco-polacca
        ['826', '124'], // Commonwealth
        ['826', '036'],
        ['826', '554'],
        ['826', '710'],
        // Potenze dell'Asse
        ['276', '380'], // Patto d'Acciaio Germania - Italia
        ['276', '392'], // Patto Anti-Comintern / Asse
        ['380', '392'],
        ['276', '348'], // Germania - Ungheria
        ['276', '703'], // Germania - Slovacchia
        // Blocco Sovietico
        ['643', '496'], // URSS - Mongolia
      ],
      nonAggressionPacts: [
        // Patto Molotov-Ribbentrop iniziale (18 mesi)
        ['276', '643', 18],
      ],
      relations: [
        ['276', '616', -100],
        ['276', '826', -96],
        ['276', '250', -96],
        ['392', '156', -98],
        ['276', '643', 14], // Patto Molotov-Ribbentrop temporaneo
        ['380', '826', -58],
        ['380', '250', -64],
        ['840', '826', 64], // USA neutrali ma favorevoli agli Alleati
        ['840', '250', 58],
        ['840', '276', -54],
        ['840', '392', -62],
        ['643', '246', -55], // Tensione URSS - Finlandia
        ['643', '616', -58],
      ],
      initialWars: [
        // Settembre 1939: Campagna di Polonia e guerra in Europa + fronte cinese
        { attackerId: '276', defenderId: '616', attackerControl: 18 },
        { attackerId: '826', defenderId: '276', attackerControl: 0 },
        { attackerId: '250', defenderId: '276', attackerControl: 0 },
        { attackerId: '392', defenderId: '156', attackerControl: 22 },
      ],
    };
  }

  // Scenario 2026 (moderno): lascia la logica standard esistente
  return {
    alliances: [
      ['380', '250'],
      ['380', '276'],
      ['380', '724'],
      ['380', '826'],
      ['380', '840'],
      ['250', '276'],
      ['250', '826'],
      ['250', '840'],
      ['276', '616'],
      ['276', '528'],
      ['276', '840'],
      ['826', '840'],
      ['826', '124'],
      ['840', '124'],
      ['840', '392'],
      ['840', '410'],
      ['840', '036'],
      ['840', '376'],
      ['392', '410'],
      ['392', '036'],
      ['752', '578'],
      ['752', '246'],
      ['616', '642'],
      ['300', '380'],
      ['643', '112'],
      ['643', '364'],
      ['643', '408'],
      ['643', '156'],
      ['156', '586'],
      ['156', '408'],
      ['682', '784'],
      ['682', '818'],
      ['076', '032'],
    ],
    nonAggressionPacts: [],
    relations: [
      ['643', '804', -92],
      ['804', '840', 68],
      ['804', '616', 74],
      ['804', '826', 68],
      ['804', '250', 62],
      ['804', '276', 62],
      ['804', '380', 60],
      ['156', '158', -88],
      ['158', '840', 76],
      ['158', '392', 70],
      ['376', '364', -95],
      ['410', '408', -96],
      ['356', '586', -74],
      ['356', '156', -42],
      ['300', '792', -38],
      ['840', '156', -56],
      ['840', '643', -78],
      ['276', '643', -68],
      ['616', '643', -82],
      ['682', '364', -45],
      ['818', '231', -44],
    ],
    initialWars: [],
  };
}
