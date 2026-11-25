import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  FolderOpen,
  Globe,
  Play,
  Scale,
  Search,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BLOC_META } from '../data/nations';
import { ALL_NATION_SEED_MAP, ALL_NATION_SEEDS } from '../data/worldCatalog';
import { getDifficultyBadge, getMilitaryRating } from '../engine/helpers';
import { RegionId, SaveSlotId, SaveSlotSummary } from '../types/game';
import { FlagBanner } from './FlagBanner';

interface NationSelectScreenProps {
  saveSlots: SaveSlotSummary[];
  defaultSlotId: SaveSlotId;
  onStartGame: (nationId: string, slotId: SaveSlotId) => void;
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
  const [regionFilter, setRegionFilter] = useState<'Consigliate' | 'Tutte' | RegionId>('Consigliate');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('380'); // Italia default
  const [targetSlot, setTargetSlot] = useState<SaveSlotId>(defaultSlotId);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotId | null>(null);

  const filteredNations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_NATION_SEEDS.filter((n) => {
      if (q) {
        return (
          n.name.toLowerCase().includes(q) ||
          n.region.toLowerCase().includes(q) ||
          BLOC_META[n.bloc].name.toLowerCase().includes(q)
        );
      }
      if (regionFilter === 'Consigliate') return Boolean(n.recommended);
      if (regionFilter === 'Tutte') return true;
      return n.region === regionFilter;
    });
  }, [regionFilter, query]);

  const selectedNation = ALL_NATION_SEED_MAP[selectedId] ?? ALL_NATION_SEEDS[0];
  const selectedDifficulty = getDifficultyBadge(selectedNation);
  const targetSlotSummary = saveSlots.find((s) => s.slotId === targetSlot);

  return (
    <div className="h-screen w-screen overflow-y-auto bg-[#070D17] text-slate-100 flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(8,145,178,0.14),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.08),transparent_42%)]"
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 flex-1 flex flex-col gap-5">
        {/* Top Hero Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="text-xs font-medium text-cyan-400 tracking-wide">
              Sala Operativa Geopolitica · Scenario Gennaio 2026 · {ALL_NATION_SEEDS.length} Nazioni
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-wider text-slate-50 mt-1 leading-none">
              VEXILLUM
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed whitespace-normal">
              Scegli qualsiasi nazione del pianeta, naviga la mappa globale a 360°, gestisci
              diplomazia, ricerca e guerre a catena oppure punta alla conquista totale del mondo.
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
                  Ogni slot mantiene una campagna indipendente nel tuo browser (salvataggio
                  automatico attivo sullo slot in uso).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {saveSlots.map((slot) => {
                const seed = slot.meta ? ALL_NATION_SEED_MAP[slot.meta.playerId] : null;
                return (
                  <div
                    key={slot.slotId}
                    className="rounded-xl bg-[#0D1524] border border-slate-800 p-4 flex flex-col justify-between gap-4"
                  >
                    {slot.meta && seed ? (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <FlagBanner flag={seed.flag} name={seed.name} size="md" className="mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-[11px] font-mono-num text-cyan-300">
                                {slot.label} · Aggiornato {formatSavedTime(slot.meta.savedAt)}
                              </div>
                              <h3 className="font-display text-2xl font-bold text-slate-50 leading-tight">
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
          /* VIEW 2: NATION SELECTOR (ALL 175 COUNTRIES) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Search, Regional Tabs, Nation List */}
            <div className="lg:col-span-8 space-y-3.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Cerca tra tutte le ${ALL_NATION_SEEDS.length} nazioni del mondo (es. Italia, Svizzera, Brasile, Giappone)...`}
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
                    {region === 'Tutte' ? `Tutte (${ALL_NATION_SEEDS.length})` : region}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[48vh] lg:max-h-[54vh] overflow-y-auto pr-1">
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
                              {nation.strictNeutral ? 'Neutrale' : BLOC_META[nation.bloc].shortName} ·{' '}
                              <span className={diff.colorClass}>{diff.label}</span>
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
                  <h2 className="font-display text-3xl font-bold tracking-wide text-slate-50 leading-none">
                    {selectedNation.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 whitespace-normal">
                    {selectedNation.region} ·{' '}
                    <span style={{ color: BLOC_META[selectedNation.bloc].color }}>
                      {BLOC_META[selectedNation.bloc].name}
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
                    <span className="text-emerald-400 text-[11px]">(+{selectedNation.gdpIncome})</span>
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
                  <span>Forze Armate Iniziali</span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono-num text-[11px] text-slate-300">
                  <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                    <span>Terrestri</span>
                    <strong className="text-slate-100">{selectedNation.army.ground}</strong>
                  </div>
                  <div className="flex justify-between bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800">
                    <span>Aviazione</span>
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
                        ? `Sovrascrivi ${slot.meta.playerName} (${slot.meta.dateLabel})`
                        : 'Vuoto'}
                    </option>
                  ))}
                </select>
                {targetSlotSummary?.meta && (
                  <p className="text-[11px] text-amber-300/90 whitespace-normal">
                    Avviando qui verrà sovrascritta la partita di {targetSlotSummary.meta.playerName}.
                  </p>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-start gap-1.5 whitespace-normal">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {selectedNation.coastal
                    ? 'Nazione costiera: puoi espanderti via terra e via mare verso qualsiasi continente.'
                    : 'Nazione interna: conquista un confine costiero per sbloccare la Marina.'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onStartGame(selectedNation.id, targetSlot)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer shadow-md"
              >
                <span>Inizia con {selectedNation.name}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
