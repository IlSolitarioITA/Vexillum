import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Download,
  RefreshCw,
  Save,
  Scale,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { getScenarioDefinition, getScenarioNationSeeds } from '../data/scenarios';
import { formatTurnDate, getControlledProvinces } from '../engine/helpers';
import { GameState, SaveSlotId, SaveSlotSummary } from '../types/game';
import { FlagBanner } from './FlagBanner';

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

interface SaveLoadModalProps {
  open: boolean;
  activeSlotId: SaveSlotId;
  saveSlots: SaveSlotSummary[];
  onClose: () => void;
  onSaveToSlot: (slotId: SaveSlotId) => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onDeleteSlot: (slotId: SaveSlotId) => void;
  onNewGame: () => void;
  onClearLocalData: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  open,
  activeSlotId,
  saveSlots,
  onClose,
  onSaveToSlot,
  onLoadSlot,
  onDeleteSlot,
  onNewGame,
  onClearLocalData,
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gestione Salvataggi Multi-Slot"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl h-[86dvh] sm:h-auto sm:max-h-[88dvh] bg-[#0D1524] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none">
              Salvataggi Locali (5 Slot)
            </h2>
            <p className="text-xs text-slate-400 mt-1 whitespace-normal">
              La partita corrente viene salvata automaticamente sullo slot attivo. Puoi mantenere fino
              a 5 campagne separate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 sm:bg-transparent text-slate-200 sm:text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-3 text-xs">
          {notice && (
            <div className="rounded-md bg-cyan-950/60 border border-cyan-500/40 px-3 py-2 text-cyan-100">
              {notice}
            </div>
          )}

          {saveSlots.map((slot) => {
            const isActive = slot.slotId === activeSlotId;
            const slotScenario = slot.meta ? getScenarioDefinition(slot.meta.scenarioId) : null;
            const seed = slot.meta
              ? getScenarioNationSeeds(slot.meta.scenarioId).find(
                  (n) => n.id === slot.meta?.playerId
                ) ?? null
              : null;
            return (
              <div
                key={slot.slotId}
                className={`rounded-lg p-3.5 border space-y-2.5 ${
                  isActive
                    ? 'bg-cyan-950/25 border-cyan-500/45'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {seed && slot.meta && (
                      <FlagBanner
                        flag={seed.flag}
                        name={slot.meta.playerName}
                        size="sm"
                        className="mt-0.5"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 flex flex-wrap items-center gap-1.5">
                        <span>{slot.label}</span>
                        {slot.meta && slotScenario && (
                          <span
                            className="text-[11px] font-semibold font-mono-num"
                            style={{ color: slotScenario.accentColor }}
                          >
                            · {slot.meta.scenarioShortName}
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[11px] font-medium text-cyan-300">
                            · Slot attivo
                          </span>
                        )}
                      </div>
                      {slot.meta ? (
                        <p className="text-slate-300 mt-0.5 whitespace-normal">
                          <strong>{slot.meta.playerName}</strong> · {slot.meta.dateLabel} ·{' '}
                          <span className="font-mono-num">
                            {slot.meta.territoriesCount}/{slot.meta.totalTerritories}
                          </span>{' '}
                          territori ·{' '}
                          <span className="text-slate-400">
                            {formatSavedTime(slot.meta.savedAt)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-slate-500 mt-0.5">Slot vuoto</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveToSlot(slot.slotId);
                      setNotice(`Partita salvata su ${slot.label}.`);
                    }}
                    className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{slot.meta ? 'Sovrascrivi' : 'Salva qui'}</span>
                  </button>

                  {slot.meta && (
                    <>
                      <button
                        type="button"
                        onClick={() => onLoadSlot(slot.slotId)}
                        className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Carica</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSlot(slot.slotId);
                          setNotice(`${slot.label} eliminato.`);
                        }}
                        className="ml-auto min-h-[40px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/50 border border-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Elimina</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Footer actions */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onNewGame}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nuova Partita (Menu Iniziale)</span>
            </button>

            {confirmClearAll ? (
              <div className="rounded-lg bg-rose-950/60 border border-rose-500/45 p-3 space-y-2">
                <div className="flex items-center gap-2 text-rose-200 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Eliminare definitivamente tutti e 5 gli slot locali?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmClearAll(false);
                      onClearLocalData();
                    }}
                    className="flex-1 min-h-[42px] py-2 rounded-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  >
                    Conferma Eliminazione
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="w-full min-h-[42px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina tutti i dati locali</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PrivacyLegalModalProps {
  open: boolean;
  onClose: () => void;
  onClearAllLocalData: () => void;
}

export const PrivacyLegalModal: React.FC<PrivacyLegalModalProps> = ({
  open,
  onClose,
  onClearAllLocalData,
}) => {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipedMessage, setWipedMessage] = useState(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy, GDPR e Note Legali"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl h-[86dvh] sm:h-auto sm:max-h-[88dvh] bg-[#0D1524] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Scale className="w-5 h-5 text-emerald-400 shrink-0" />
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none truncate">
              Privacy & Note Legali
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 sm:bg-transparent text-slate-200 sm:text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-8 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">
              Informativa Privacy & Conformità GDPR (Archiviazione Locale)
            </h3>
            <p className="whitespace-normal">
              <strong>Vexillum</strong> funziona interamente sul tuo dispositivo. Tutti i dati di
              gioco e gli slot di salvataggio sono memorizzati esclusivamente nel{' '}
              <code className="font-mono text-cyan-300">localStorage</code> del tuo browser.
            </p>
            <p className="whitespace-normal">
              L’applicazione <strong>non utilizza cookie di tracciamento</strong>, non integra
              circuiti pubblicitari, non raccoglie dati personali identificativi e non invia alcuna
              informazione a server esterni o terze parti.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">Disclaimer & Note Legali</h3>
            <p className="whitespace-normal">
              <strong>Vexillum</strong> è una simulazione geopolitica e strategica{' '}
              <strong>fittizia a esclusivo scopo ludico</strong>. Le statistiche nazionali, le
              alleanze, gli eventi generati e gli scenari di conflitto sono semplificazioni di gioco
              pensate per l’intrattenimento strategico.
            </p>
            <p className="whitespace-normal">
              Il progetto è rigorosamente <strong>apartitico e neutrale</strong>, non esprime giudizi
              politici reali e non è affiliato, patrocinato né collegato ad alcun governo, forza
              armata o istituzione internazionale reale. I confini geografici derivano dal dataset
              cartografico pubblico <em>Natural Earth / World Atlas</em>.
            </p>
          </section>

          <section className="rounded-lg bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-slate-100 text-xs sm:text-sm">
                Controllo dei Dati Locali
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 whitespace-normal">
                In conformità ai principi di minimizzazione e controllo dei dati, puoi cancellare in
                qualsiasi momento tutti gli slot di salvataggio salvati in questo browser.
              </p>
            </div>

            {wipedMessage && (
              <div className="rounded-md bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-200">
                Tutti i dati locali e gli slot di salvataggio sono stati eliminati dal browser.
              </div>
            )}

            {confirmWipe ? (
              <div className="rounded-lg bg-rose-950/60 border border-rose-500/45 p-3 space-y-2.5 text-xs">
                <div className="flex items-start gap-2 text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="whitespace-normal">
                    Questa operazione cancella definitivamente tutti i salvataggi in{' '}
                    <code>localStorage</code> e riporta l’app al menu iniziale. Procedere?
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmWipe(false);
                      setWipedMessage(true);
                      onClearAllLocalData();
                    }}
                    className="flex-1 min-h-[42px] py-2 px-3 rounded-lg font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                  >
                    Sì, elimina tutti i dati locali
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmWipe(false)}
                    className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setWipedMessage(false);
                  setConfirmWipe(true);
                }}
                className="min-h-[42px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/45 text-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina tutti i dati locali</span>
              </button>
            )}
          </section>
        </div>

        <div className="px-4 sm:px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Come si Gioca a Vexillum"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl h-[86dvh] sm:h-auto sm:max-h-[86dvh] bg-[#0D1524] border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="font-display text-2xl font-bold tracking-wide text-slate-50 leading-none truncate">
              Come si Gioca
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi guida"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800/80 sm:bg-transparent text-slate-200 sm:text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-8 space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">
              1. Scenari Storici & Moderni (2026, 1914, 1939)
            </h3>
            <p className="whitespace-normal">
              Dal menu iniziale puoi avviare campagne in 3 epoche distinte, ognuna con confini,
              alleanze, tecnologie e operazioni coperte coerenti con il periodo:
            </p>
            <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs leading-relaxed">
              <li className="whitespace-normal">
                <strong className="text-cyan-300">Mondo Attuale (Gennaio 2026):</strong> 175
                nazioni moderne, droni tattici, guerra cibernetica, difesa missilistica e blocchi
                contemporanei.
              </li>
              <li className="whitespace-normal">
                <strong className="text-amber-300">Prima Guerra Mondiale (Luglio 1914):</strong>{' '}
                Triplice Intesa contro Imperi Centrali (con imperi storici accorpati, Italia e USA
                inizialmente neutrali), enormi eserciti di fanteria, grandi flotte e aviazione
                iniziale ridotta a biplani; tecnologie come <em>Guerra di Trincea</em>,{' '}
                <em>Artiglieria Pesante</em> e <em>Corazzate Dreadnought</em>.
              </li>
              <li className="whitespace-normal">
                <strong className="text-rose-300">Seconda Guerra Mondiale (Settembre 1939):</strong>{' '}
                Alleati contro Potenze dell’Asse, guerra attiva in Polonia, Patto di non aggressione
                Germania–URSS e USA inizialmente neutrali ma colosso industriale; tecnologie come{' '}
                <em>Blitzkrieg</em>, <em>Radar</em>, <em>Portaerei</em> e <em>Bombardieri Pesanti</em>.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">
              2. Comando & Governo: Forze Armate, Spesa Pubblica & Debito
            </h3>
            <p className="whitespace-normal">
              Apri <strong className="text-cyan-300">Comando & Governo</strong> (<em>Governo</em> su
              mobile) per gestire l’intera macchina statale su 3 schede:
            </p>
            <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs leading-relaxed">
              <li className="whitespace-normal">
                <strong className="text-slate-100">Forze Armate & Tecnologie:</strong> seleziona una
                quantità unica (<code className="font-mono-num">+5 / +10 / +25 / +50</code>) per
                reclutare nei 4 rami (<em>Terra, Aria, Mare, Difesa</em>) controllando subito il
                mantenimento mensile, e ricerca tecnologie d’epoca.
              </li>
              <li className="whitespace-normal">
                <strong className="text-emerald-300">Spesa Pubblica (Bilancio al 100%):</strong>{' '}
                regola <em>Difesa & Armamenti</em>, <em>Istruzione & Ricerca</em>,{' '}
                <em>Sanità & Welfare</em> e <em>Infrastrutture & Economia</em> tra{' '}
                <em>Tagliato / Normale / Potenziato</em>. Tagliare i servizi libera fondi per le
                armi, ma frena la ricerca (65%), il PIL o la Stabilità interna.
              </li>
              <li className="whitespace-normal">
                <strong className="text-amber-300">Debito Pubblico & Titoli di Guerra:</strong> puoi
                emettere titoli (<code className="font-mono-num">+50 / +100 B$</code>) per ottenere
                subito liquidità bellica o rimborsarli. Superare{' '}
                <strong className="font-mono-num">100%</strong> e{' '}
                <strong className="font-mono-num">140%</strong> di Debito/PIL fa impennare gli
                interessi, crollare la Stabilità e attira attacchi opportunisti dai vicini ostili.
              </li>
              <li className="whitespace-normal">
                <strong className="text-cyan-300">Ricostruzione Post-Conquista:</strong> quando
                annetti uno stato, il suo PIL entra subito nel tuo bilancio al{' '}
                <strong className="font-mono-num">55–65%</strong> di resa (con costi amministrativi e
                quota di debito) e risale verso il <strong className="font-mono-num">100%</strong>{' '}
                consolidando Stabilità e Infrastrutture.
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">
              3. Le 4 Modalità di Attacco & Divario di Potenza
            </h3>
            <p className="whitespace-normal">
              Puoi dichiarare guerra a qualsiasi stato sovrano, ma la distanza geografica, la
              tecnologia e il divario reale di potenza pesano in modo decisivo: affrontare una
              superpotenza senza prima potenziare l’esercito, costruire alleanze o destabilizzarla è
              quasi impossibile. In guerra puoi scegliere come colpire:
            </p>
            <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs leading-relaxed">
              <li className="whitespace-normal">
                <strong className="text-slate-100">Offensiva Terrestre:</strong> richiede un confine
                terrestre o una testa di ponte anfibia; è il modo principale per far avanzare il{' '}
                <strong className="text-cyan-300">Controllo Territoriale</strong> fino al 100%
                (annessione), con maggiore consumo di manodopera.
              </li>
              <li className="whitespace-normal">
                <strong className="text-sky-300">Raid Aereo:</strong> colpisce a distanza difese,
                infrastrutture e casse nemiche senza rischiare fanteria; ideale per ammorbidire il
                nemico prima dell’invasione.
              </li>
              <li className="whitespace-normal">
                <strong className="text-indigo-300">Marina (Assalto Anfibio / Blocco Navale):</strong>{' '}
                lo sbarco anfibio apre una testa di ponte su nazioni costiere non confinanti; il
                blocco navale taglia le entrate PIL del bersaglio ogni turno (-28%).
              </li>
              <li className="whitespace-normal">
                <strong className="text-amber-300">Attacco Combinato (Terra + Aria + Mare):</strong>{' '}
                richiede un costo operativo extra, ma garantisce un forte bonus tattico (+28%) e
                riduce sensibilmente le perdite (-25%).
              </li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-100">
              4. Guerra Ibrida, Instabilità & Rivolte Interne
            </h3>
            <p className="whitespace-normal">
              Nella scheda <strong className="text-violet-300">Operazioni Coperte</strong> di ogni
              nazione estera (anche in tempo di pace) puoi logorare gli avversari prima ancora di
              scendere in campo:
            </p>
            <ul className="space-y-1 pl-4 list-disc text-slate-300 text-xs leading-relaxed">
              <li className="whitespace-normal">
                <strong className="text-slate-100">Propaganda & Disinformazione:</strong> riduce la
                Stabilità interna e aumenta i sospetti.
              </li>
              <li className="whitespace-normal">
                <strong className="text-slate-100">Cyberattacco:</strong> colpisce il PIL (-20% per
                3 turni), drena fondi e disattiva temporaneamente le difese aeree.
              </li>
              <li className="whitespace-normal">
                <strong className="text-slate-100">Sabotaggio Infrastrutture:</strong> danneggia le
                fortificazioni (-30% bonus difensivo per 3 turni) e la prontezza militare.
              </li>
              <li className="whitespace-normal">
                <strong className="text-rose-300">Finanzia Opposizione / Ribelli:</strong> se porta
                la Stabilità del bersaglio sotto il <strong className="font-mono-num">30%</strong>,
                esplode una <em>Rivolta / Crisi Interna</em> che indebolisce drasticamente economia
                ed esercito nemico.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold text-slate-100">
              5. Operazioni “False Flag” (Sotto Falsa Bandiera)
            </h3>
            <p className="whitespace-normal">
              Per <em>Cyberattacchi</em> (nel 2026) o <em>Intercettazione &amp; Sabotaggio Comunicazioni</em>{' '}
              (nel 1914 e 1939, come telegrammi cifrati falsi o incidenti di confine) e{' '}
              <em>Sabotaggi</em> puoi scegliere{' '}
              <strong className="text-violet-300">False Flag</strong> e far ricadere la colpa su una
              nazione terza. Se l’operazione non viene scoperta, la vittima accusa il paese
              incastrato: le loro relazioni crollano e può scoppiare una{' '}
              <strong className="text-rose-300">guerra reale tra loro</strong>. Ogni azione ha però
              un <strong>rischio di scoperta</strong> legato all’intelligence nemica: se vieni
              smascherato subisci un crollo diplomatico con entrambi gli stati, sanzioni e forte
              aumento della Tensione Globale.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-semibold text-slate-100">
              6. Cronache Vive, Consiglio Mondiale & Effetto Domino
            </h3>
            <p className="whitespace-normal">
              Ogni turno la <strong className="text-amber-300">Cronaca</strong> registra manovre di
              confine, accordi commerciali, riarmi e frizioni geopolitiche tra IA. Ogni 2–4 turni (o
              in caso di debito elevato e tagli sociali) si aprono{' '}
              <strong className="text-cyan-300">Decisioni di Governo</strong> e vertici del{' '}
              <strong className="text-cyan-300">Consiglio Mondiale</strong> (sanzioni, trattati sugli
              armamenti, crisi energetiche, aiuti umanitari) con Pro e Contro chiari. Attaccare
              membri di blocchi o alleati attiva l’<strong className="text-amber-300">Effetto Domino</strong>;
              dal menu puoi gestire fino a <strong className="text-cyan-300">5 slot</strong> di
              salvataggio indipendenti in locale.
            </p>
          </section>
        </div>

        <div className="px-4 sm:px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-2 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            Ho Capito
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  gameState: GameState;
  onNewGame: () => void;
  onContinueSandbox: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  onNewGame,
  onContinueSandbox,
}) => {
  if (gameState.status === 'playing') return null;

  const isVictory = gameState.status === 'victory';
  const player = gameState.nations[gameState.playerId];
  const owned = getControlledProvinces(gameState, gameState.playerId).length;
  const total = Object.keys(gameState.nations).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isVictory ? 'Vittoria Strategica' : 'Sconfitta'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md max-h-[88dvh] overflow-y-auto overscroll-contain bg-[#0D1524] border border-slate-700 rounded-xl shadow-2xl p-6 text-center space-y-4">
        <div className="flex justify-center">
          {isVictory ? (
            <Award className="w-12 h-12 text-amber-400" />
          ) : (
            <ShieldAlert className="w-12 h-12 text-rose-400" />
          )}
        </div>

        <div>
          <h2
            className={`font-display text-3xl font-bold tracking-wide ${
              isVictory ? 'text-amber-300' : 'text-rose-400'
            }`}
          >
            {gameState.worldConquestAchieved
              ? 'Conquista Totale'
              : isVictory
                ? 'Egemonia Raggiunta'
                : 'Comando Caduto'}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-normal">
            {gameState.endReason}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-xs">
          <div>
            <div className="text-slate-400">Data</div>
            <div className="font-mono-num font-semibold text-slate-100 mt-0.5">
              {formatTurnDate(gameState.turn, gameState.scenarioId)}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Territori</div>
            <div className="font-mono-num font-semibold text-cyan-300 mt-0.5">
              {owned}/{total}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Tecnologie</div>
            <div className="font-mono-num font-semibold text-amber-300 mt-0.5">
              {player?.researchedTechs.length ?? 0}/8
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onNewGame}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-lg text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            Nuova Partita
          </button>
          {isVictory && owned < total && (
            <button
              type="button"
              onClick={onContinueSandbox}
              className="w-full min-h-[44px] py-2 px-4 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              Continua verso la Conquista Totale ({owned}/{total})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
