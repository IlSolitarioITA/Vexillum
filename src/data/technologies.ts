import { TechDefinition, TechId } from '../types/game';

export const TECHNOLOGIES: TechDefinition[] = [
  {
    id: 'tactical_drones',
    name: 'Droni Tattici',
    shortBonus: '+18% attacco terrestre · -12% perdite in offensiva',
    description:
      'Sistemi autonomi di ricognizione e attacco a basso costo che moltiplicano la letalità delle brigate meccanizzate.',
    cost: 45,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'integrated_air_defense',
    name: 'Difesa Aerea Integrata',
    shortBonus: '+25% difesa territoriale · dimezza impatto aereo nemico',
    description:
      'Rete radar multistrato e batterie antimissile che neutralizzano la superiorità aerea avversaria sul suolo nazionale.',
    cost: 50,
    turns: 3,
    category: 'defense',
  },
  {
    id: 'war_industry',
    name: 'Industria Bellica',
    shortBonus: '+20% entrate PIL · -15% costo reclutamento',
    description:
      'Riconversione industriale modulare e linee di produzione automatizzate per sostenere conflitti prolungati.',
    cost: 55,
    turns: 4,
    category: 'economy',
  },
  {
    id: 'modern_logistics',
    name: 'Logistica Moderna',
    shortBonus: '-20% mantenimento esercito · +12% avanzata territoriale',
    description:
      'Corridoi di rifornimento digitalizzati e catene di approvvigionamento resilienti che accelerano le offensive.',
    cost: 40,
    turns: 3,
    category: 'economy',
  },
  {
    id: 'cyber_warfare',
    name: 'Guerra Cibernetica',
    shortBonus: '-15% efficacia difensiva nemica · +15% stabilità interna',
    description:
      'Operazioni elettroniche e contro-intelligence per disorientare i comandi avversari prima di ogni offensiva.',
    cost: 60,
    turns: 4,
    category: 'doctrine',
  },
  {
    id: 'joint_doctrine',
    name: 'Dottrina Congiunta',
    shortBonus: '+22% forza combinata terra-aria-mare',
    description:
      'Coordinamento in tempo reale tra forze terrestri, aviazione e marina per sfondamenti rapidi e decisivi.',
    cost: 75,
    turns: 5,
    category: 'doctrine',
  },
  {
    id: 'amphibious_projection',
    name: 'Proiezione Anfibia',
    shortBonus: '+30% forza sbarchi navali · requisiti navali ridotti',
    description:
      'Gruppi navali di spedizione e mezzi da sbarco pesanti per condurre campagne oltremare senza penalità.',
    cost: 50,
    turns: 3,
    category: 'offense',
  },
  {
    id: 'precision_artillery',
    name: 'Artiglieria di Precisione',
    shortBonus: '+16% potenza di fuoco · +14% difesa dei confini',
    description:
      'Munizionamento guidato satellitare a lungo raggio capace di logorare le linee nemiche prima del contatto.',
    cost: 48,
    turns: 3,
    category: 'defense',
  },
];

export const TECH_MAP: Record<TechId, TechDefinition> = TECHNOLOGIES.reduce(
  (acc, tech) => {
    acc[tech.id] = tech;
    return acc;
  },
  {} as Record<TechId, TechDefinition>
);

export const BRANCH_INFO = {
  ground: {
    name: 'Forze Terrestri',
    role: 'Conquista e controllo dei confini',
    description: 'Fanteria meccanizzata e divisioni corazzate: il nucleo indispensabile per occupare e difendere il territorio.',
    costFundsPer10: 14,
    costManpowerPer10: 12,
    upkeepPerUnit: 0.045,
  },
  air: {
    name: 'Aviazione',
    role: 'Supporto aereo e riduzione perdite',
    description: 'Caccia multiruolo e bombardieri strategici che amplificano la forza offensiva e riducono le tue perdite.',
    costFundsPer10: 22,
    costManpowerPer10: 6,
    upkeepPerUnit: 0.065,
  },
  navy: {
    name: 'Marina',
    role: 'Proiezione di forza e sbarchi oltremare',
    description: 'Flotte d’altura indispensabili per attaccare nazioni costiere non confinanti e bloccare le coste nemiche.',
    costFundsPer10: 24,
    costManpowerPer10: 7,
    upkeepPerUnit: 0.07,
  },
  defense: {
    name: 'Difesa & Fortificazioni',
    role: 'Protezione del territorio nazionale',
    description: 'Sistemi antiaerei, bunker e linee fortificate che moltiplicano la resistenza quando vieni attaccato.',
    costFundsPer10: 16,
    costManpowerPer10: 5,
    upkeepPerUnit: 0.035,
  },
} as const;
