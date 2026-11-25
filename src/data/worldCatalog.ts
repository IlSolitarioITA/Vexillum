import { geoCentroid } from 'd3-geo';
import { feature, neighbors as topoNeighbors } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-110m.json';
import { BlocId, FlagSpec, NationSeed, RegionId } from '../types/game';
import { NATION_SEED_MAP } from './nations';

/** Excluded uninhabited polar regions not rendered as playable states */
export const EXCLUDED_TERRITORY_IDS = new Set<string>(['010', '260']);

/** Deterministic ID resolver for every geometry in world-atlas/countries-110m.json */
export function resolveAtlasNationId(rawId: unknown, rawName?: string): string {
  if (rawId !== undefined && rawId !== null && String(rawId).trim() !== '') {
    return String(rawId).padStart(3, '0');
  }
  const n = (rawName ?? '').trim().toLowerCase();
  if (n.includes('kosovo')) return 'XKX';
  if (n.includes('cyprus')) return 'NCY';
  if (n.includes('somaliland')) return 'SML';
  return `UNK_${n.replace(/[^a-z0-9]/g, '').slice(0, 6) || '000'}`;
}

interface ExtraCountryMeta {
  name: string;
  region: RegionId;
  bloc: BlocId;
  /** Economic/military scale 1 (micro/small) to 6 (regional mid-power) */
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  coastal: boolean;
  strictNeutral?: boolean;
  terrainDefense?: number;
  flag: FlagSpec;
  summary?: string;
}

/** Complete Italian localization, flags, and proportional geopolitical stats for every remaining country on Earth */
const EXTRA_COUNTRIES: Record<string, ExtraCountryMeta> = {
  // ===== EUROPA =====
  '008': { name: 'Albania', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: true, terrainDefense: 1.2, flag: { pattern: 'solid_emblem', colors: ['#E41E20', '#111827'] } },
  '051': { name: 'Armenia', region: 'Europa', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.26, flag: { pattern: 'horizontal3', colors: ['#D90012', '#0033A0', '#F2A800'] } },
  '031': { name: 'Azerbaigian', region: 'Europa', bloc: 'non_aligned', tier: 4, coastal: false, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#00B5E2', '#EF3340', '#509E2F'], accent: '#F8FAFC' } },
  '056': { name: 'Belgio', region: 'Europa', bloc: 'euro_atlantic', tier: 5, coastal: true, terrainDefense: 1.06, flag: { pattern: 'vertical3', colors: ['#111827', '#FDDA24', '#EF3340'] } },
  '070': { name: 'Bosnia ed Erzegovina', region: 'Europa', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.22, flag: { pattern: 'diagonal', colors: ['#002395', '#FECB00', '#002395'], accent: '#F8FAFC' } },
  '100': { name: 'Bulgaria', region: 'Europa', bloc: 'euro_atlantic', tier: 3, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#F8FAFC', '#00966E', '#D62612'] } },
  '191': { name: 'Croazia', region: 'Europa', bloc: 'euro_atlantic', tier: 3, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#FF0000', '#F8FAFC', '#171796'], accent: '#FF0000' } },
  '196': { name: 'Cipro', region: 'Europa', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.18, flag: { pattern: 'circle', colors: ['#F8FAFC', '#D57800'] } },
  NCY: { name: 'Cipro del Nord', region: 'Europa', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#E30A17', '#F8FAFC', '#E30A17'], accent: '#E30A17' } },
  '203': { name: 'Repubblica Ceca', region: 'Europa', bloc: 'euro_atlantic', tier: 4, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal2', colors: ['#F8FAFC', '#D7141A'], accent: '#11457E' } },
  '208': { name: 'Danimarca', region: 'Europa', bloc: 'euro_atlantic', tier: 4, coastal: true, terrainDefense: 1.12, flag: { pattern: 'nordic', colors: ['#C60C30', '#F8FAFC'] } },
  '233': { name: 'Estonia', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#0072CE', '#111827', '#F8FAFC'] } },
  '268': { name: 'Georgia', region: 'Europa', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.24, flag: { pattern: 'cross', colors: ['#F8FAFC', '#FF0000', '#F8FAFC'] } },
  '304': { name: 'Groenlandia', region: 'Americhe', bloc: 'euro_atlantic', tier: 1, coastal: true, terrainDefense: 1.3, flag: { pattern: 'horizontal2', colors: ['#F8FAFC', '#D00C33'] } },
  '348': { name: 'Ungheria', region: 'Europa', bloc: 'euro_atlantic', tier: 4, coastal: false, terrainDefense: 1.08, flag: { pattern: 'horizontal3', colors: ['#CE2939', '#F8FAFC', '#477050'] } },
  '352': { name: 'Islanda', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: true, strictNeutral: false, terrainDefense: 1.26, flag: { pattern: 'nordic', colors: ['#02529C', '#DC1E35', '#F8FAFC'] } },
  '372': { name: 'Irlanda', region: 'Europa', bloc: 'non_aligned', tier: 4, coastal: true, strictNeutral: true, terrainDefense: 1.16, flag: { pattern: 'vertical3', colors: ['#169B62', '#F8FAFC', '#FF883E'] } },
  XKX: { name: 'Kosovo', region: 'Europa', bloc: 'non_aligned', tier: 1, coastal: false, terrainDefense: 1.2, flag: { pattern: 'solid_emblem', colors: ['#244AA5', '#D0A650'] } },
  '428': { name: 'Lettonia', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: true, terrainDefense: 1.1, flag: { pattern: 'horizontal3', colors: ['#9E3039', '#F8FAFC', '#9E3039'] } },
  '440': { name: 'Lituania', region: 'Europa', bloc: 'euro_atlantic', tier: 3, coastal: true, terrainDefense: 1.1, flag: { pattern: 'horizontal3', colors: ['#FDB913', '#006A44', '#C1272D'] } },
  '442': { name: 'Lussemburgo', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: false, terrainDefense: 1.1, flag: { pattern: 'horizontal3', colors: ['#EA141D', '#F8FAFC', '#51ADDA'] } },
  '807': { name: 'Macedonia del Nord', region: 'Europa', bloc: 'euro_atlantic', tier: 2, coastal: false, terrainDefense: 1.18, flag: { pattern: 'circle', colors: ['#D20000', '#FFE600'] } },
  '498': { name: 'Moldavia', region: 'Europa', bloc: 'non_aligned', tier: 2, coastal: false, strictNeutral: true, terrainDefense: 1.1, flag: { pattern: 'vertical3', colors: ['#0046AE', '#FFD200', '#CC092F'] } },
  '499': { name: 'Montenegro', region: 'Europa', bloc: 'euro_atlantic', tier: 1, coastal: true, terrainDefense: 1.24, flag: { pattern: 'solid_emblem', colors: ['#C40308', '#D4AF37'] } },
  '703': { name: 'Slovacchia', region: 'Europa', bloc: 'euro_atlantic', tier: 3, coastal: false, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#F8FAFC', '#0B4EA2', '#EE1C25'] } },
  '705': { name: 'Slovenia', region: 'Europa', bloc: 'euro_atlantic', tier: 3, coastal: true, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#F8FAFC', '#005DA4', '#ED1C24'] } },

  // ===== MEDIO ORIENTE & NORD AFRICA =====
  '400': { name: 'Giordania', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 3, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#111827', '#F8FAFC', '#007A3D'], accent: '#CE1126' } },
  '414': { name: 'Kuwait', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 4, coastal: true, terrainDefense: 1.08, flag: { pattern: 'horizontal3', colors: ['#007A3D', '#F8FAFC', '#CE1126'], accent: '#111827' } },
  '422': { name: 'Libano', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 2, coastal: true, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#ED1C24', '#F8FAFC', '#ED1C24'], accent: '#00A651' } },
  '434': { name: 'Libia', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 3, coastal: true, terrainDefense: 1.12, flag: { pattern: 'horizontal3', colors: ['#E70013', '#111827', '#239E46'], accent: '#F8FAFC' } },
  '512': { name: 'Oman', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 4, coastal: true, strictNeutral: true, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#F8FAFC', '#DB161B', '#008000'] } },
  '275': { name: 'Palestina', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#111827', '#F8FAFC', '#007A3D'], accent: '#CE1126' } },
  '634': { name: 'Qatar', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 4, coastal: true, terrainDefense: 1.1, flag: { pattern: 'vertical3', colors: ['#F8FAFC', '#8A1538', '#8A1538'] } },
  '788': { name: 'Tunisia', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 3, coastal: true, terrainDefense: 1.12, flag: { pattern: 'circle', colors: ['#E70013', '#F8FAFC'], accent: '#E70013' } },
  '732': { name: 'Sahara Occidentale', region: 'Medio Oriente e Nord Africa', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#111827', '#F8FAFC', '#007A3D'], accent: '#C4111B' } },
  '887': { name: 'Yemen', region: 'Medio Oriente e Nord Africa', bloc: 'arab_league', tier: 2, coastal: true, terrainDefense: 1.24, flag: { pattern: 'horizontal3', colors: ['#CE1126', '#F8FAFC', '#111827'] } },

  // ===== ASIA & OCEANIA =====
  '004': { name: 'Afghanistan', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.34, flag: { pattern: 'horizontal3', colors: ['#111827', '#F8FAFC', '#111827'] } },
  '050': { name: 'Bangladesh', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 4, coastal: true, terrainDefense: 1.12, flag: { pattern: 'circle', colors: ['#006A4E', '#F42A41'] } },
  '064': { name: 'Bhutan', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 1, coastal: false, strictNeutral: true, terrainDefense: 1.32, flag: { pattern: 'diagonal', colors: ['#FFD520', '#FF4E12', '#F8FAFC'] } },
  '096': { name: 'Brunei', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.12, flag: { pattern: 'horizontal3', colors: ['#F7E017', '#F8FAFC', '#111827'], accent: '#CF1126' } },
  '116': { name: 'Cambogia', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#032EA1', '#E00025', '#032EA1'], accent: '#F8FAFC' } },
  '242': { name: 'Figi', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'canton', colors: ['#002868', '#68BFE5', '#CF142B'] } },
  '417': { name: 'Kirghizistan', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.26, flag: { pattern: 'circle', colors: ['#E8112D', '#FFEF00'] } },
  '418': { name: 'Laos', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.22, flag: { pattern: 'horizontal3', colors: ['#CE1126', '#002868', '#CE1126'], accent: '#F8FAFC' } },
  '458': { name: 'Malesia', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 5, coastal: true, terrainDefense: 1.16, flag: { pattern: 'canton', colors: ['#010066', '#CC0001', '#F8FAFC'], accent: '#FFCC00' } },
  '496': { name: 'Mongolia', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: false, strictNeutral: true, terrainDefense: 1.2, flag: { pattern: 'vertical3', colors: ['#DA2032', '#0066B3', '#DA2032'], accent: '#FFD900' } },
  '104': { name: 'Myanmar', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.22, flag: { pattern: 'horizontal3', colors: ['#FECB00', '#34B233', '#EA2839'], accent: '#F8FAFC' } },
  '524': { name: 'Nepal', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: false, strictNeutral: true, terrainDefense: 1.32, flag: { pattern: 'solid_emblem', colors: ['#DC143C', '#F8FAFC'] } },
  '540': { name: 'Nuova Caledonia', region: 'Asia e Oceania', bloc: 'euro_atlantic', tier: 1, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#0035AD', '#ED4135', '#009543'], accent: '#FAE600' } },
  '598': { name: 'Papua Nuova Guinea', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.26, flag: { pattern: 'diagonal', colors: ['#111827', '#CE1126', '#FCD116'] } },
  '090': { name: 'Isole Salomone', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'diagonal', colors: ['#0051BA', '#215B33', '#FCD116'] } },
  '144': { name: 'Sri Lanka', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.18, flag: { pattern: 'vertical3', colors: ['#00534E', '#EB7400', '#8D153A'], accent: '#FFBE29' } },
  '762': { name: 'Tagikistan', region: 'Asia e Oceania', bloc: 'eastern_pact', tier: 2, coastal: false, terrainDefense: 1.28, flag: { pattern: 'horizontal3', colors: ['#CC0000', '#F8FAFC', '#006600'], accent: '#F8C300' } },
  '626': { name: 'Timor Est', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'horizontal2', colors: ['#DC241F', '#DC241F'], accent: '#111827' } },
  '795': { name: 'Turkmenistan', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 3, coastal: false, strictNeutral: true, terrainDefense: 1.16, flag: { pattern: 'solid_emblem', colors: ['#00843D', '#F8FAFC'] } },
  '860': { name: 'Uzbekistan', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 4, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#0099B5', '#F8FAFC', '#1EB53A'] } },
  '548': { name: 'Vanuatu', region: 'Asia e Oceania', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal2', colors: ['#D21034', '#009543'], accent: '#111827' } },

  // ===== AMERICHE =====
  '044': { name: 'Bahamas', region: 'Americhe', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#00778B', '#FFC72C', '#00778B'], accent: '#111827' } },
  '084': { name: 'Belize', region: 'Americhe', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#D90F19', '#171696', '#D90F19'], accent: '#F8FAFC' } },
  '068': { name: 'Bolivia', region: 'Americhe', bloc: 'non_aligned', tier: 3, coastal: false, terrainDefense: 1.26, flag: { pattern: 'horizontal3', colors: ['#DA291C', '#F4E400', '#007A33'] } },
  '188': { name: 'Costa Rica', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, strictNeutral: true, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#002B7F', '#CE1126', '#002B7F'], accent: '#F8FAFC' } },
  '192': { name: 'Cuba', region: 'Americhe', bloc: 'eastern_pact', tier: 3, coastal: true, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#002A8F', '#F8FAFC', '#002A8F'], accent: '#CF142B' } },
  '214': { name: 'Repubblica Dominicana', region: 'Americhe', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.14, flag: { pattern: 'cross', colors: ['#002D62', '#F8FAFC', '#CE1126'] } },
  '218': { name: 'Ecuador', region: 'Americhe', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#FFD100', '#0033A0', '#EF3340'] } },
  '222': { name: 'El Salvador', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#0F47AF', '#F8FAFC', '#0F47AF'] } },
  '238': { name: 'Isole Falkland', region: 'Americhe', bloc: 'euro_atlantic', tier: 1, coastal: true, terrainDefense: 1.22, flag: { pattern: 'canton', colors: ['#012169', '#012169', '#C8102E'] } },
  '320': { name: 'Guatemala', region: 'Americhe', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.18, flag: { pattern: 'vertical3', colors: ['#4997D0', '#F8FAFC', '#4997D0'] } },
  '328': { name: 'Guyana', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.18, flag: { pattern: 'diagonal', colors: ['#009E49', '#FCD116', '#CE1126'] } },
  '332': { name: 'Haiti', region: 'Americhe', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal2', colors: ['#00209F', '#D21034'] } },
  '340': { name: 'Honduras', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#00BCE4', '#F8FAFC', '#00BCE4'] } },
  '388': { name: 'Giamaica', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'diagonal', colors: ['#009B3A', '#FED100', '#111827'] } },
  '558': { name: 'Nicaragua', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#0067C6', '#F8FAFC', '#0067C6'] } },
  '591': { name: 'Panama', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, strictNeutral: true, terrainDefense: 1.16, flag: { pattern: 'cross', colors: ['#F8FAFC', '#072357', '#DA121A'] } },
  '600': { name: 'Paraguay', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.12, flag: { pattern: 'horizontal3', colors: ['#D52B1E', '#F8FAFC', '#0038A8'] } },
  '630': { name: 'Porto Rico', region: 'Americhe', bloc: 'euro_atlantic', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#ED0000', '#F8FAFC', '#ED0000'], accent: '#0050F0' } },
  '740': { name: 'Suriname', region: 'Americhe', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.18, flag: { pattern: 'horizontal3', colors: ['#377E3F', '#B40A2D', '#377E3F'], accent: '#ECC81D' } },
  '780': { name: 'Trinidad e Tobago', region: 'Americhe', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'diagonal', colors: ['#DA1A35', '#111827', '#F8FAFC'] } },
  '858': { name: 'Uruguay', region: 'Americhe', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.1, flag: { pattern: 'canton', colors: ['#F8FAFC', '#0038A8', '#F8FAFC'], accent: '#FCD116' } },

  // ===== AFRICA SUBSAHARIANA =====
  '024': { name: 'Angola', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 4, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal2', colors: ['#CC092F', '#111827'], accent: '#FFCB00' } },
  '204': { name: 'Benin', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.08, flag: { pattern: 'horizontal2', colors: ['#FCD116', '#E8112D'], accent: '#008751' } },
  '072': { name: 'Botswana', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#75AADB', '#111827', '#75AADB'] } },
  '854': { name: 'Burkina Faso', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.1, flag: { pattern: 'horizontal2', colors: ['#EF2B2D', '#009E49'], accent: '#FCD116' } },
  '108': { name: 'Burundi', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: false, terrainDefense: 1.18, flag: { pattern: 'diagonal', colors: ['#CE1126', '#1EB53A', '#F8FAFC'] } },
  '120': { name: 'Camerun', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.16, flag: { pattern: 'vertical3', colors: ['#007A5E', '#CE1126', '#FCD116'], accent: '#FCD116' } },
  '140': { name: 'Rep. Centrafricana', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#003082', '#289728', '#FFCE00'], accent: '#D21034' } },
  '148': { name: 'Ciad', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.16, flag: { pattern: 'vertical3', colors: ['#002664', '#FECB00', '#C60C30'] } },
  '178': { name: 'Rep. del Congo', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'diagonal', colors: ['#009543', '#FBDE4A', '#DC241F'] } },
  '180': { name: 'RD del Congo', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 4, coastal: true, terrainDefense: 1.22, flag: { pattern: 'diagonal', colors: ['#007FFF', '#CE1021', '#F7D618'] } },
  '384': { name: 'Costa d’Avorio', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.1, flag: { pattern: 'vertical3', colors: ['#F77F00', '#F8FAFC', '#009E60'] } },
  '262': { name: 'Gibuti', region: 'Africa Subsahariana', bloc: 'arab_league', tier: 1, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal2', colors: ['#6AB2E7', '#12AD2B'], accent: '#F8FAFC' } },
  '226': { name: 'Guinea Equatoriale', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#3E9A00', '#F8FAFC', '#E32118'], accent: '#0073CE' } },
  '232': { name: 'Eritrea', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.2, flag: { pattern: 'horizontal2', colors: ['#12AD2B', '#4189DD'], accent: '#EA0437' } },
  '748': { name: 'Eswatini', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: false, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#3E5EB9', '#B10C0C', '#3E5EB9'], accent: '#FFD900' } },
  '266': { name: 'Gabon', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#009E60', '#FCD116', '#3A75C4'] } },
  '270': { name: 'Gambia', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.08, flag: { pattern: 'horizontal3', colors: ['#CE1126', '#0C1C8C', '#3A7728'] } },
  '288': { name: 'Ghana', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.1, flag: { pattern: 'horizontal3', colors: ['#CF0921', '#FCD20F', '#006B3D'], accent: '#111827' } },
  '324': { name: 'Guinea', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'vertical3', colors: ['#CE1126', '#FCD116', '#009460'] } },
  '624': { name: 'Guinea-Bissau', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.12, flag: { pattern: 'horizontal2', colors: ['#FCD116', '#009E49'], accent: '#CE1126' } },
  '426': { name: 'Lesotho', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: false, terrainDefense: 1.24, flag: { pattern: 'horizontal3', colors: ['#00209F', '#F8FAFC', '#009543'] } },
  '430': { name: 'Liberia', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.12, flag: { pattern: 'canton', colors: ['#002868', '#BF0A30', '#F8FAFC'] } },
  '450': { name: 'Madagascar', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.18, flag: { pattern: 'horizontal2', colors: ['#FC3D32', '#007E3A'], accent: '#F8FAFC' } },
  '454': { name: 'Malawi', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#111827', '#CE1126', '#339E35'] } },
  '466': { name: 'Mali', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'vertical3', colors: ['#14B53A', '#FCD116', '#CE1126'] } },
  '478': { name: 'Mauritania', region: 'Africa Subsahariana', bloc: 'arab_league', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'solid_emblem', colors: ['#00A95C', '#FFD700'] } },
  '508': { name: 'Mozambico', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#007168', '#111827', '#FCE100'], accent: '#D21034' } },
  '516': { name: 'Namibia', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: true, terrainDefense: 1.16, flag: { pattern: 'diagonal', colors: ['#003580', '#D21034', '#009543'], accent: '#FFCE00' } },
  '562': { name: 'Niger', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#E05206', '#F8FAFC', '#0DB02B'], accent: '#E05206' } },
  '646': { name: 'Ruanda', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.2, flag: { pattern: 'horizontal3', colors: ['#00A1DE', '#FAD201', '#20603D'] } },
  '686': { name: 'Senegal', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.1, flag: { pattern: 'vertical3', colors: ['#00853F', '#FDEF42', '#E31B23'], accent: '#00853F' } },
  '694': { name: 'Sierra Leone', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.12, flag: { pattern: 'horizontal3', colors: ['#1EB53A', '#F8FAFC', '#0072C6'] } },
  '706': { name: 'Somalia', region: 'Africa Subsahariana', bloc: 'arab_league', tier: 2, coastal: true, terrainDefense: 1.14, flag: { pattern: 'solid_emblem', colors: ['#4189DD', '#F8FAFC'] } },
  SML: { name: 'Somaliland', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#006D21', '#F8FAFC', '#D31C23'] } },
  '728': { name: 'Sud Sudan', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#111827', '#DA121A', '#078930'], accent: '#0F47AF' } },
  '729': { name: 'Sudan', region: 'Africa Subsahariana', bloc: 'arab_league', tier: 3, coastal: true, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#D21034', '#F8FAFC', '#111827'], accent: '#007229' } },
  '834': { name: 'Tanzania', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: true, terrainDefense: 1.16, flag: { pattern: 'diagonal', colors: ['#1EB53A', '#111827', '#00A3DD'], accent: '#FCD116' } },
  '768': { name: 'Togo', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 1, coastal: true, terrainDefense: 1.1, flag: { pattern: 'canton', colors: ['#D21034', '#006A4E', '#FFCE00'] } },
  '800': { name: 'Uganda', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 3, coastal: false, terrainDefense: 1.16, flag: { pattern: 'horizontal3', colors: ['#111827', '#FCDC04', '#D90000'] } },
  '894': { name: 'Zambia', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.12, flag: { pattern: 'solid_emblem', colors: ['#198A00', '#EF7D00'] } },
  '716': { name: 'Zimbabwe', region: 'Africa Subsahariana', bloc: 'non_aligned', tier: 2, coastal: false, terrainDefense: 1.14, flag: { pattern: 'horizontal3', colors: ['#006400', '#FFD200', '#D40000'], accent: '#F8FAFC' } },
};

const TIER_STATS: Record<
  1 | 2 | 3 | 4 | 5 | 6,
  {
    gdp: number;
    funds: number;
    manpower: number;
    manpowerGrowth: number;
    stability: number;
    ground: number;
    air: number;
    navy: number;
    defense: number;
  }
> = {
  1: { gdp: 7, funds: 24, manpower: 48, manpowerGrowth: 3, stability: 70, ground: 24, air: 10, navy: 10, defense: 26 },
  2: { gdp: 11, funds: 34, manpower: 85, manpowerGrowth: 5, stability: 72, ground: 42, air: 18, navy: 18, defense: 38 },
  3: { gdp: 16, funds: 48, manpower: 145, manpowerGrowth: 9, stability: 74, ground: 66, air: 30, navy: 28, defense: 52 },
  4: { gdp: 23, funds: 68, manpower: 190, manpowerGrowth: 11, stability: 77, ground: 88, air: 48, navy: 42, defense: 68 },
  5: { gdp: 32, funds: 92, manpower: 220, manpowerGrowth: 13, stability: 81, ground: 105, air: 62, navy: 58, defense: 80 },
  6: { gdp: 42, funds: 118, manpower: 280, manpowerGrowth: 16, stability: 82, ground: 132, air: 78, navy: 72, defense: 96 },
};

function buildAllNationSeeds(): NationSeed[] {
  const topo = worldAtlas as unknown as Topology<{ countries: GeometryCollection }>;
  const geometries = topo.objects.countries.geometries;
  const fc = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry>;
  const adjIndexes = topoNeighbors(geometries as unknown as Parameters<typeof topoNeighbors>[0]);

  // Map geometry index -> resolved nation ID
  const indexToId: string[] = geometries.map((g) => {
    const rawName = String((g.properties as { name?: string } | null)?.name ?? '');
    return resolveAtlasNationId(g.id, rawName);
  });

  // Build deduplicated exact real-world land border graph across all non-excluded geometries
  const realNeighbors = new Map<string, Set<string>>();
  for (let i = 0; i < geometries.length; i++) {
    const id = indexToId[i];
    if (EXCLUDED_TERRITORY_IDS.has(id)) continue;
    if (!realNeighbors.has(id)) realNeighbors.set(id, new Set());
    for (const nIdx of adjIndexes[i] ?? []) {
      const nId = indexToId[nIdx];
      if (!nId || nId === id || EXCLUDED_TERRITORY_IDS.has(nId)) continue;
      realNeighbors.get(id)!.add(nId);
    }
  }

  // Build seed for every unique non-excluded territory in world-atlas
  const seen = new Set<string>();
  const seeds: NationSeed[] = [];

  for (let i = 0; i < geometries.length; i++) {
    const id = indexToId[i];
    if (EXCLUDED_TERRITORY_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);

    const feat = fc.features[i] as Feature<Geometry>;
    const rawName = String((geometries[i].properties as { name?: string } | null)?.name ?? id);
    const computedNeighbors = Array.from(realNeighbors.get(id) ?? []);

    const handcrafted = NATION_SEED_MAP[id];
    if (handcrafted) {
      // Merge exact topology neighbors with handcrafted neighbors so all adjacent states (major & minor) connect accurately
      const merged = new Set<string>(computedNeighbors);
      for (const nb of handcrafted.neighbors) {
        if (!EXCLUDED_TERRITORY_IDS.has(nb)) merged.add(nb);
      }
      const isStrictNeutral = id === '756' || id === '040';
      seeds.push({
        ...handcrafted,
        strictNeutral: isStrictNeutral,
        neighbors: Array.from(merged),
      });
      continue;
    }

    const extra = EXTRA_COUNTRIES[id];
    const centroid = geoCentroid(feat);
    const capitalCoords: [number, number] =
      Number.isFinite(centroid[0]) && Number.isFinite(centroid[1]) ? [centroid[0], centroid[1]] : [0, 20];

    if (extra) {
      const t = TIER_STATS[extra.tier];
      const neutralNote = extra.strictNeutral
        ? 'Stato a neutralità consolidata: violarne la sovranità scatena una forte condanna internazionale.'
        : extra.coastal
          ? 'Nazione costiera con accesso alle rotte marittime regionali e potenziale di espansione.'
          : 'Stato continentale difeso dai propri confini terrestri e dalla diplomazia regionale.';

      seeds.push({
        id,
        name: extra.name,
        region: extra.region,
        bloc: extra.bloc,
        capitalCoords,
        gdpIncome: t.gdp,
        startingFunds: t.funds,
        manpower: t.manpower,
        manpowerGrowth: t.manpowerGrowth,
        stability: extra.strictNeutral ? Math.min(92, t.stability + 10) : t.stability,
        coastal: extra.coastal,
        strictNeutral: Boolean(extra.strictNeutral),
        terrainDefense: extra.terrainDefense ?? 1.14,
        army: {
          ground: t.ground,
          air: t.air,
          navy: extra.coastal ? t.navy : 0,
          defense: t.defense,
        },
        neighbors: computedNeighbors,
        flag: extra.flag,
        summary: extra.summary ?? neutralNote,
      });
    } else {
      // Fallback for any unexpected geometry so ZERO territories on the map are ever unclickable
      const t = TIER_STATS[1];
      seeds.push({
        id,
        name: rawName,
        region: 'Europa',
        bloc: 'non_aligned',
        capitalCoords,
        gdpIncome: t.gdp,
        startingFunds: t.funds,
        manpower: t.manpower,
        manpowerGrowth: t.manpowerGrowth,
        stability: 72,
        coastal: true,
        strictNeutral: false,
        terrainDefense: 1.12,
        army: { ground: t.ground, air: t.air, navy: t.navy, defense: t.defense },
        neighbors: computedNeighbors,
        flag: { pattern: 'horizontal3', colors: ['#334155', '#94A3B8', '#1E293B'] },
        summary: 'Territorio sovrano autonomo con politica estera neutrale.',
      });
    }
  }

  // Guarantee symmetry across all neighbor lists
  const seedMap = new Map(seeds.map((s) => [s.id, s]));
  for (const s of seeds) {
    s.neighbors = s.neighbors.filter((nbId) => nbId !== s.id && seedMap.has(nbId));
    for (const nbId of s.neighbors) {
      const nb = seedMap.get(nbId);
      if (nb && !nb.neighbors.includes(s.id)) {
        nb.neighbors.push(s.id);
      }
    }
  }

  // Sort alphabetically in Italian (with recommended nations still discoverable easily)
  seeds.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return seeds;
}

export const ALL_NATION_SEEDS: NationSeed[] = buildAllNationSeeds();

export const ALL_NATION_SEED_MAP: Record<string, NationSeed> = ALL_NATION_SEEDS.reduce(
  (acc, nation) => {
    acc[nation.id] = nation;
    return acc;
  },
  {} as Record<string, NationSeed>
);
