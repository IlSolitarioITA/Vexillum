import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Clock,
  FolderOpen,
  Globe,
  Play,
  Scale,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  getScenarioBlocs,
  getScenarioDefinition,
  getScenarioNationSeeds,
  getScenarioPlayableSeeds,
  SCENARIO_ORDER,
  SCENARIOS,
} from '../data/scenarios';
import { getDifficultyBadge, getMilitaryRating } from '../engine/helpers';
import { RegionId, SaveSlotId, SaveSlotSummary, ScenarioId } from '../types/game';
import { FlagBanner } from './FlagBanner';
import { PWAInstallButton } from './PWAInstallButton';

interface NationSelectScreenProps {
  saveSlots: SaveSlotSummary[];
  defaultSlotId: SaveSlotId;
  onStartGame: (nationId: string, slotId: SaveSlotId, scenarioId: ScenarioId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onOpenPrivacy: () => void;
}

const REGIONS: Array<'Consigliate' | 'Tutte' | RegionId> = [
  'Consigliate',
  'Tutte',
  'Europa',
  'Americhe',
  'Asia e Oceania',
  'Medio Oriente e Nord Africa',
  'Africa Subsahariana',
];

function formatSavedTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const NationSelectScreen: React.FC<NationSelectScreenProps> = ({
  saveSlots,
  defaultSlotId,
  onStartGame,
  onLoadSlot,
  onDeleteSlot,
  onOpenPrivacy,
}) => {
  const occupiedCount = saveSlots.filter((s) => s.meta !== null).length;
  const [view, setView] = useState<'new' | 'saves'>('new');
  const [scenarioId, setScenarioId] = useState<ScenarioId>('2026');
  const [regionFilter, setRegionFilter] = useState<'Consigliate' | 'Tutte' | RegionId>('Consigliate');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('380'); // Italia default
  const [targetSlot, setTargetSlot] = useState<SaveSlotId>(defaultSlotId);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotId | null>(null);

  const activeScenario = getScenarioDefinition(scenarioId);
  const scenarioBlocs = getScenarioBlocs(scenarioId);

  const playableNations = useMemo(() => getScenarioPlayableSeeds(scenarioId), [scenarioId]);

  const playableMap = useMemo(() => {
    const map: Record<string, (typeof playableNations)[number]> = {};
    for (const n of playableNations) map[n.id] = n;
    return map;
  }, [playableNations]);

  const handleSelectScenario = (nextScenario: ScenarioId) => {
    setScenarioId(nextScenario);
    setQuery('');
    setRegionFilter('Consigliate');
    const nextPlayable = getScenarioPlayableSeeds(nextScenario);
    const keepCurrent = nextPlayable.some((n) => n.id === selectedId);
    if (!keepCurrent) {
      setSelectedId(SCENARIOS[nextScenario].defaultPlayerId);
    }
  };

  const filteredNations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return playableNations.filter((n) => {
      if (q) {
        return (
          n.name.toLowerCase().includes(q) ||
          n.region.toLowerCase().includes(q) ||
          scenarioBlocs[n.bloc].name.toLowerCase().includes(q)
        );
      }
      if (regionFilter === 'Consigliate') return Boolean(n.recommended);
      if (regionFilter === 'Tutte') return true;
      return n.region === regionFilter;
    });
  }, [playableNations, regionFilter, query, scenarioBlocs]);

  const selectedNation =
    playableMap[selectedId] ?? playableMap[activeScenario.defaultPlayerId] ?? playableNations[0];
  const selectedDifficulty = getDifficultyBadge(selectedNation);
  const targetSlotSummary = saveSlots.find((s) => s.slotId === targetSlot);

  return (
    <div className="h-[100dvh] w-screen overflow-y-auto bg-[#070D17] text-slate-100 flex flex-col safe-top safe-bottom">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(8,145,178,0.14),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.08),transparent_42%)]"
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex-1 flex flex-col gap-5">
        {/* Top Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="text-xs font-medium text-cyan-400 tracking-wide whitespace-normal">
              Sala Operativa Geopolitica · {activeScenario.title} ({activeScenario.eraTag}) ·{' '}
              {playableNations.length} Potenze Sovrane
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-wider text-slate-50 mt-1 leading-none">
              VEXILLUM
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed whitespace-normal">
              Seleziona uno scenario storico o moderno (1914, 1939 o 2026), scegli la tua nazione e
              guida diplomazia, guerra multi-dominio, tecnologie d’epoca e operazioni coperte su una
              mappa globale a 360°.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex p-1 rounded-lg bg-[#0D1524] border border-slate-800">
              <button
                type="button"
                onClick={() => setView('new')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  view === 'new'
                    ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Nuova Partita</span>
              </button>
              <button
                type="button"
                onClick={() => setView('saves')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  view === 'saves'
                    ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Partite Salvate ({occupiedCount}/5)</span>
              </button>
            </div>

            <PWAInstallButton />

            <button
              type="button"
              onClick={onOpenPrivacy}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-[#0D1524] hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy & Note Legali</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: SAVED GAMES (5 INDEPENDENT SLOTS) */}
        {view === 'saves' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-100">
                  Slot di Salvataggio Locali
                </h2>
                <p className="text-xs text-slate-400 whitespace-normal">
                  Ogni slot salva in modo indipendente lo scenario (2026, 1914 o 1939) e tutti i
                  progressi della campagna nel tuo browser.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {saveSlots.map((slot) => {
                const slotScenario = slot.meta ? getScenarioDefinition(slot.meta.scenarioId) : null;
                const slotSeeds = slot.meta ? getScenarioNationSeeds(slot.meta.scenarioId) : [];
                const seed = slot.meta
                  ? slotSeeds.find((n) => n.id === slot.meta?.playerId) ?? null
                  : null;
                return (
                  <div
                    key={slot.slotId}
                    className="rounded-xl bg-[#0D1524] border border-slate-800 p-4 flex flex-col justify-between gap-4"
                  >
                    {slot.meta && seed && slotScenario ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <FlagBanner flag={seed.flag} name={slot.meta.playerName} size="md" className="mt-0.5" />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                                <span className="font-mono-num text-cyan-300">{slot.label}</span>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span
                                  className="font-semibold"
                                  style={{ color: slotScenario.accentColor }}
                                >
                                  {slot.meta.scenarioShortName}
                                </span>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span className="font-mono-num text-slate-400">
                                  {formatSavedTime(slot.meta.savedAt)}
                                </span>
                              </div>
                              <h3 className="font-display text-2xl font-bold text-slate-50 leading-tight mt-0.5 whitespace-normal">
                                {slot.meta.playerName}
                              </h3>
                              <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                                {slot.meta.dateLabel} ·{' '}
                                <span className="font-mono-num text-slate-200">
                                  {slot.meta.territoriesCount}/{slot.meta.totalTerritories}
                                </span>{' '}
                                territori ·{' '}
                                <span className="font-mono-num text-amber-300">
                                  {slot.meta.funds} B$
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {confirmDeleteSlot === slot.slotId ? (
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                            <span className="text-xs text-rose-300">Eliminare {slot.label}?</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteSlot(null);
                                  onDeleteSlot(slot.slotId);
                                }}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                              >
                                Elimina
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSlot(null)}
                                className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-200 cursor-pointer"
                              >
                                Annulla
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => onLoadSlot(slot.slotId)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Continua Campagna</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSlot(slot.slotId)}
                              aria-label={`Elimina ${slot.label}`}
                              className="p-2.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 border border-slate-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3 py-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-300">{slot.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Slot vuoto disponibile</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetSlot(slot.slotId);
                            setView('new');
                          }}
                          className="px-3 py-2 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Nuova Partita qui
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* VIEW 2: STEP 1 SCENARIO SELECTOR + STEP 2 NATION SELECTOR */
          <div className="space-y-5">
            {/* Step 1: Historical & Modern Scenario Selector */}
            <section aria-label="Scelta dello scenario" className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>1. Scegli lo Scenario Storico o Moderno</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SCENARIO_ORDER.map((id) => {
                  const sc = SCENARIOS[id];
                  const active = scenarioId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectScenario(id)}
                      className={`text-left rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between gap-2.5 ${
                        active
                          ? 'bg-[#0F1B2E] border-amber-400/75 shadow-lg'
                          : 'bg-[#0D1524]/85 hover:bg-slate-900 border-slate-800/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="font-mono-num text-[11px] font-semibold uppercase tracking-wide"
                            style={{ color: sc.accentColor }}
                          >
                            {sc.eraTag}
                          </span>
                          {active && (
                            <span className="text-[11px] font-semibold text-amber-300">
                              Selezionato
                            </span>
                          )}
                        </div>
                        <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 mt-0.5 leading-tight whitespace-normal">
                          {sc.title}
                        </h2>
                        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed whitespace-normal">
                          {sc.summary}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        {sc.highlights.map((h) => (
                          <div
                            key={h}
                            className="text-[11px] text-slate-300 leading-snug whitespace-normal flex items-start gap-1.5"
                          >
                            <span style={{ color: sc.accentColor }} aria-hidden="true">
                              ·
                            </span>
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Nation Selector + Selected Nation Dossier */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Search, Regional Tabs, Nation List */}
              <div className="lg:col-span-8 space-y-3.5">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-200">
                  <span>
                    2. Scegli la Nazione ({activeScenario.shortName} · {playableNations.length}{' '}
                    potenze sovrane)
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Cerca tra le ${playableNations.length} potenze dello scenario ${activeScenario.title}...`}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0D1524] border border-slate-800 focus:border-cyan-500/60 focus:outline-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setRegionFilter(region);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        !query && regionFilter === region
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {region === 'Tutte' ? `Tutte (${playableNations.length})` : region}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[46vh] lg:max-h-[50vh] overflow-y-auto pr-1">
                  {filteredNations.map((nation) => {
                    const active = nation.id === selectedNation.id;
                    const diff = getDifficultyBadge(nation);
                    return (
                      <button
                        key={nation.id}
                        type="button"
                        onClick={() => setSelectedId(nation.id)}
                        className={`text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                          active
                            ? 'bg-cyan-950/45 border-cyan-400/70'
                            : 'bg-[#0D1524]/85 hover:bg-slate-900 border-slate-800/90'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FlagBanner flag={nation.flag} name={nation.name} size="sm" />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-100 leading-tight whitespace-normal">
                                {nation.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 whitespace-normal">
                                {nation.strictNeutral
                                  ? 'Neutrale'
                                  : scenarioBlocs[nation.bloc].shortName}{' '}
                                · <span className={diff.colorClass}>{diff.label}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono-num text-xs font-semibold text-amber-300">
                              +{nation.gdpIncome} B$
                            </div>
                            <div className="font-mono-num text-[10px] text-cyan-300">
                              Forza {getMilitaryRating(nation)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {filteredNations.length === 0 && (
                    <div className="col-span-full py-10 text-center text-xs text-slate-400">
                      Nessuna nazione trovata per &ldquo;{query}&rdquo;.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Selected Nation Dossier + Save Slot Assignment */}
              <div className="lg:col-span-4 rounded-xl bg-[#0D1524] border border-slate-700/80 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <FlagBanner flag={selectedNation.flag} name={selectedNation.name} size="lg" />
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-semibold font-mono-num"
                      style={{ color: activeScenario.accentColor }}
                    >
                      {activeScenario.shortName} · {activeScenario.eraTag}
                    </div>
                    <h2 className="font-display text-3xl font-bold tracking-wide text-slate-50 leading-none mt-0.5 whitespace-normal">
                      {selectedNation.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 whitespace-normal">
                      {selectedNation.region} ·{' '}
                      <span style={{ color: scenarioBlocs[selectedNation.bloc].color }}>
                        {scenarioBlocs[selectedNation.bloc].name}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed whitespace-normal">
                  {selectedNation.summary}
                </p>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-800 text-xs">
                  <div>
                    <div className="text-slate-400">Difficoltà</div>
                    <div className={`text-sm font-semibold mt-0.5 ${selectedDifficulty.colorClass}`}>
                      {selectedDifficulty.label}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Fondi / PIL Mese</div>
                    <div className="font-mono-num text-sm font-semibold text-amber-300 mt-0.5">
                      {selectedNation.startingFunds} B${' '}
                      <span className="text-emerald-400 text-[11px]">
                        (+{selectedNation.gdpIncome})
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Manodopera</div>
                    <div className="font-mono-num text-sm font-semibold text-cyan-300 mt-0.5">
                      {selectedNation.manpower}k
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Stabilità Iniziale</div>
                    <div className="font-mono-num text-sm font-semibold text-slate-100 mt-0.5">
                      {selectedNation.stability}%
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Forze Armate Iniziali ({activeScenario.id})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono-num text-[11px] text-slate-300">
                    <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                      <span>Terrestri</span>
                      <strong className="text-slate-100">{selectedNation.army.ground}</strong>
                    </div>
                    <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                      <span>{scenarioId === '1914' ? 'Biplani / Aria' : 'Aviazione'}</span>
                      <strong className="text-slate-100">{selectedNation.army.air}</strong>
                    </div>
                    <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                      <span>Marina</span>
                      <strong className="text-slate-100">{selectedNation.army.navy}</strong>
                    </div>
                    <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                      <span>Difesa</span>
                      <strong className="text-slate-100">{selectedNation.army.defense}</strong>
                    </div>
                  </div>
                </div>

                {/* Save slot picker for independent campaigns */}
                <div className="space-y-1.5 pt-1">
                  <label htmlFor="slot-select" className="block text-xs font-semibold text-slate-200">
                    Salva questa campagna su:
                  </label>
                  <select
                    id="slot-select"
                    value={targetSlot}
                    onChange={(e) => setTargetSlot(e.target.value as SaveSlotId)}
                    className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    {saveSlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId}>
                        {slot.label} —{' '}
                        {slot.meta
                          ? `Sovrascrivi ${slot.meta.playerName} (${slot.meta.scenarioShortName}, ${slot.meta.dateLabel})`
                          : 'Vuoto'}
                      </option>
                    ))}
                  </select>
                  {targetSlotSummary?.meta && (
                    <p className="text-[11px] text-amber-300/90 whitespace-normal">
                      Avviando qui verrà sovrascritta la partita di{' '}
                      {targetSlotSummary.meta.playerName} ({targetSlotSummary.meta.scenarioShortName}).
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 flex items-start gap-1.5 whitespace-normal">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    {selectedNation.coastal
                      ? 'Potenza costiera: puoi espanderti via terra e via mare verso qualsiasi continente.'
                      : 'Nazione interna: conquista un confine costiero per sbloccare la Marina.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onStartGame(selectedNation.id, targetSlot, scenarioId)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer shadow-md"
                >
                  <span>Inizia ({activeScenario.id}) con {selectedNation.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
