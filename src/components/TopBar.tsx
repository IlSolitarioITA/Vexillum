import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  HelpCircle,
  Home,
  Menu,
  Save,
  Scale,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatTurnDate, getMonthlyEconomy, round1, roundInt } from '../engine/helpers';
import { GameState } from '../types/game';
import { FlagBanner } from './FlagBanner';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  gameState: GameState;
  soundMuted: boolean;
  onToggleSound: () => void;
  onNextTurn: () => void;
  onOpenMilitary: () => void;
  onOpenSaveModal: () => void;
  onOpenHelp: () => void;
  onOpenPrivacy: () => void;
  onGoToMenu: () => void;
  onSelectPlayerNation: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  gameState,
  soundMuted,
  onToggleSound,
  onNextTurn,
  onOpenMilitary,
  onOpenSaveModal,
  onOpenHelp,
  onOpenPrivacy,
  onGoToMenu,
  onSelectPlayerNation,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const player = gameState.nations[gameState.playerId];
  const eco = getMonthlyEconomy(gameState, gameState.playerId);
  const dateLabel = formatTurnDate(gameState.turn, gameState.scenarioId);
  const activePlayerWars = gameState.wars.filter(
    (w) => w.attackerId === gameState.playerId || w.defenderId === gameState.playerId
  ).length;

  const tensionTone =
    gameState.globalTension >= 70
      ? 'text-rose-400'
      : gameState.globalTension >= 40
        ? 'text-amber-400'
        : 'text-cyan-300';

  const stabilityTone =
    player.stability < 45
      ? 'text-rose-400'
      : player.stability < 68
        ? 'text-amber-300'
        : 'text-emerald-400';

  return (
    <header className="relative shrink-0 z-30 w-full bg-[#0B1220] border-b border-slate-800/90 px-3 sm:px-4 pt-[max(0.375rem,env(safe-area-inset-top))] pb-2">
      {/* Row 1: Nation Name, Date & Settings/Menu (Desktop also includes Brand, Telemetry & Actions) */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Zone 1: Identity & Date */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-initial">
          <span className="hidden md:inline font-display text-xl font-bold tracking-wider text-slate-100 whitespace-nowrap shrink-0">
            VEXILLUM
          </span>
          <span aria-hidden="true" className="hidden md:inline text-slate-700 shrink-0">
            /
          </span>
          <button
            type="button"
            onClick={onSelectPlayerNation}
            title="Ispeziona la tua nazione"
            className="flex items-center gap-2 hover:bg-slate-800/70 active:bg-slate-800 rounded-lg px-1.5 py-1 transition-colors cursor-pointer min-w-0"
          >
            <FlagBanner flag={player.flag} name={player.name} size="sm" />
            <div className="text-left min-w-0">
              <div className="text-sm font-semibold text-slate-100 leading-tight truncate max-w-[175px] sm:max-w-[200px]">
                {player.name}
              </div>
              <div className="hidden md:block text-[11px] font-mono-num text-amber-300/90 leading-tight whitespace-nowrap">
                {dateLabel}
              </div>
            </div>
          </button>

          {/* Mobile inline Date readout on Row 1 */}
          <span className="md:hidden text-xs font-mono-num font-semibold text-amber-300 whitespace-nowrap shrink-0 ml-auto mr-1">
            {dateLabel}
          </span>
        </div>

        {/* Zone 2: Desktop Strategic Telemetry (xl+) */}
        <div className="hidden xl:flex items-center gap-5 text-xs shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 leading-none">Fondi</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-mono-num text-sm font-semibold text-amber-300">
                {round1(player.funds)} B$
              </span>
              <span
                className={`font-mono-num text-[11px] ${
                  eco.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {eco.netIncome >= 0 ? '+' : ''}
                {eco.netIncome}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 leading-none">Manodopera</span>
            <span className="font-mono-num text-sm font-semibold text-cyan-300 mt-0.5">
              {roundInt(player.manpower)}k
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 leading-none">Stabilità</span>
            <span className={`font-mono-num text-sm font-semibold mt-0.5 ${stabilityTone}`}>
              {roundInt(player.stability)}%
            </span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 leading-none">Tensione Globale</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`font-mono-num text-sm font-semibold ${tensionTone}`}>
                {roundInt(gameState.globalTension)}%
              </span>
              {activePlayerWars > 0 && (
                <span className="text-[11px] font-medium text-rose-400">
                  · {activePlayerWars} {activePlayerWars === 1 ? 'guerra' : 'guerre'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Zone 3: Desktop Military + Menu + Next Turn (Mobile shows clean Menu/Impostazioni only) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMilitary}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium text-slate-200 bg-slate-800/85 hover:bg-slate-700/90 border border-slate-700/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Comando & Governo</span>
          </button>

          {/* Compact Dropdown Menu for Save, Help, Privacy, Audio, Home */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Apri menu impostazioni"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-200 bg-slate-800/85 hover:bg-slate-700/90 border border-slate-700/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Menu className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-xl bg-[#0D1524] border border-slate-700/80 shadow-2xl py-1.5 z-50 text-xs"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSaveModal();
                  }}
                  className="w-full min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Salvataggi (5 Slot)</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenHelp();
                  }}
                  className="w-full min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Come si Gioca</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenPrivacy();
                  }}
                  className="w-full min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Privacy & Note Legali</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleSound();
                  }}
                  className="w-full min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {soundMuted ? (
                    <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-cyan-300 shrink-0" />
                  )}
                  <span>{soundMuted ? 'Audio Tattico: Off' : 'Audio Tattico: On'}</span>
                </button>
                <PWAInstallButton
                  variant="menuItem"
                  onActionComplete={() => setMenuOpen(false)}
                />
                <div className="my-1 border-t border-slate-800" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onGoToMenu();
                  }}
                  className="w-full min-h-[42px] flex items-center gap-2.5 px-3.5 py-2.5 text-left text-amber-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Menu Iniziale</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Prossimo Turno button (on mobile lives in MobileBottomDock) */}
          <button
            type="button"
            onClick={onNextTurn}
            disabled={gameState.status !== 'playing' || Boolean(gameState.pendingEvent)}
            className="hidden md:flex items-center gap-1 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <span>Prossimo Turno</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2 (below xl): Clean, evenly spaced 4-metric strategic bar */}
      <div className="grid grid-cols-4 gap-2 xl:hidden mt-1.5 pt-1.5 border-t border-slate-800/75 text-center sm:text-left">
        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none">Fondi</div>
          <div className="font-mono-num text-xs font-semibold text-amber-300 leading-tight mt-0.5 truncate">
            {round1(player.funds)} B$
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none">Manodopera</div>
          <div className="font-mono-num text-xs font-semibold text-cyan-300 leading-tight mt-0.5 truncate">
            {roundInt(player.manpower)}k
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none">Stabilità</div>
          <div className={`font-mono-num text-xs font-semibold leading-tight mt-0.5 ${stabilityTone}`}>
            {roundInt(player.stability)}%
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] text-slate-400 leading-none">Tensione</div>
          <div className={`font-mono-num text-xs font-semibold leading-tight mt-0.5 ${tensionTone}`}>
            {roundInt(gameState.globalTension)}%
            {activePlayerWars > 0 && (
              <span className="text-[10px] text-rose-400 ml-1">({activePlayerWars}G)</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
