import { useCallback, useEffect, useState } from 'react';
import { BattleReportModal } from './components/BattleReportModal';
import { MilitaryTechModal } from './components/MilitaryTechModal';
import { MobileBottomDock } from './components/MobileBottomDock';
import { NationPanel } from './components/NationPanel';
import { NationSelectScreen } from './components/NationSelectScreen';
import { NewsFeedBar } from './components/NewsFeedBar';
import { TopBar } from './components/TopBar';
import {
  GameOverModal,
  HowToPlayModal,
  PrivacyLegalModal,
  SaveLoadModal,
} from './components/UtilityModals';
import { WorldMap } from './components/WorldMap';
import { isSoundMuted, sfx, toggleSoundMute } from './engine/audio';
import {
  advanceTurn,
  createInitialGameState,
  declareWar,
  executeCovertOperation,
  formAlliance,
  improveRelations,
  launchPlayerOffensive,
  proposePeace,
  recruitUnits,
  signNonAggression,
  stabilizeNation,
  startResearch,
  toggleSanction,
} from './engine/simulation';
import {
  clearAllLocalSaves,
  deleteSaveSlot,
  findFirstEmptySlot,
  getActiveSlotId,
  listSaveSlots,
  loadFromSlot,
  saveToSlot,
} from './engine/storage';
import {
  ArmyBranch,
  AttackMode,
  CovertOpType,
  GameState,
  MapMode,
  SaveSlotId,
  SaveSlotSummary,
  ScenarioId,
  TechId,
} from './types/game';

export default function App() {
  const [saveSlots, setSaveSlots] = useState<SaveSlotSummary[]>(() => listSaveSlots());
  const [activeSlotId, setActiveSlotId] = useState<SaveSlotId>(
    () => getActiveSlotId() ?? findFirstEmptySlot()
  );
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<'select' | 'play'>('select');
  const [selectedNationId, setSelectedNationId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [militaryOpen, setMilitaryOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => isSoundMuted());

  const [panelFeedback, setPanelFeedback] = useState<{
    text: string;
    tone: 'info' | 'error';
  } | null>(null);
  const [militaryFeedback, setMilitaryFeedback] = useState<{
    text: string;
    tone: 'info' | 'error';
  } | null>(null);

  const refreshSlots = useCallback(() => {
    setSaveSlots(listSaveSlots());
  }, []);

  // Automatically save progress to the currently active slot
  useEffect(() => {
    if (gameState && screen === 'play') {
      saveToSlot(activeSlotId, gameState);
      setSaveSlots(listSaveSlots());
    }
  }, [gameState, screen, activeSlotId]);

  // Escape key closes open dialogs/drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (privacyOpen) setPrivacyOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (saveModalOpen) setSaveModalOpen(false);
        else if (militaryOpen) setMilitaryOpen(false);
        else if (newsOpen) setNewsOpen(false);
        else if (gameState?.lastBattleReport) {
          setGameState((prev) => (prev ? { ...prev, lastBattleReport: null } : prev));
        } else if (selectedNationId) {
          setSelectedNationId(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    privacyOpen,
    helpOpen,
    saveModalOpen,
    militaryOpen,
    newsOpen,
    gameState?.lastBattleReport,
    selectedNationId,
  ]);

  const showPanelMsg = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setPanelFeedback({ text, tone });
  }, []);

  const showMilitaryMsg = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    setMilitaryFeedback({ text, tone });
  }, []);

  const handleStartGame = useCallback(
    (nationId: string, slotId: SaveSlotId, scenarioId: ScenarioId) => {
      const fresh = createInitialGameState(nationId, scenarioId);
      setActiveSlotId(slotId);
      setGameState(fresh);
      saveToSlot(slotId, fresh);
      setSaveSlots(listSaveSlots());
      // Keep the map completely unobstructed on mobile launch; pre-open player drawer on desktop
      setSelectedNationId(window.innerWidth >= 768 ? fresh.playerId : null);
      setNewsOpen(false);
      setMilitaryOpen(false);
      setHelpOpen(false);
      setPanelFeedback(null);
      setMilitaryFeedback(null);
      setScreen('play');
      sfx.victory();
    },
    []
  );

  const handleLoadSlot = useCallback((slotId: SaveSlotId) => {
    const loaded = loadFromSlot(slotId);
    if (!loaded) return;
    setActiveSlotId(slotId);
    setGameState(loaded);
    setSelectedNationId(null);
    setNewsOpen(false);
    setMilitaryOpen(false);
    setPanelFeedback(null);
    setMilitaryFeedback(null);
    setSaveModalOpen(false);
    setScreen('play');
    sfx.select();
  }, []);

  const handleSaveToSlot = useCallback(
    (slotId: SaveSlotId) => {
      if (!gameState) return;
      saveToSlot(slotId, gameState);
      setActiveSlotId(slotId);
      refreshSlots();
      sfx.select();
    },
    [gameState, refreshSlots]
  );

  const handleDeleteSlot = useCallback(
    (slotId: SaveSlotId) => {
      deleteSaveSlot(slotId);
      refreshSlots();
    },
    [refreshSlots]
  );

  const handleClearLocalData = useCallback(() => {
    clearAllLocalSaves();
    refreshSlots();
    setActiveSlotId('slot_1');
    setGameState(null);
    setSelectedNationId(null);
    setNewsOpen(false);
    setSaveModalOpen(false);
    setScreen('select');
  }, [refreshSlots]);

  const handleSelectNation = useCallback((nationId: string) => {
    setSelectedNationId(nationId);
    setPanelFeedback(null);
    sfx.select();
  }, []);

  const handleNextTurn = useCallback(() => {
    setGameState((prev) => {
      if (!prev || prev.status !== 'playing') return prev;
      return advanceTurn(prev);
    });
    setPanelFeedback(null);
    setMilitaryFeedback(null);
    sfx.turn();
  }, []);

  const handleRecruit = useCallback(
    (branch: ArmyBranch, amount: number) => {
      if (!gameState) return;
      const res = recruitUnits(gameState, branch, amount);
      if (res.error) {
        showMilitaryMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      showMilitaryMsg(`Reclutate +${amount} unità con successo.`, 'info');
      sfx.recruit();
    },
    [gameState, showMilitaryMsg]
  );

  const handleStartResearch = useCallback(
    (techId: TechId) => {
      if (!gameState) return;
      const res = startResearch(gameState, techId);
      if (res.error) {
        showMilitaryMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      showMilitaryMsg('Programma di ricerca avviato.', 'info');
      sfx.select();
    },
    [gameState, showMilitaryMsg]
  );

  const handleStabilize = useCallback(() => {
    if (!gameState) return;
    const res = stabilizeNation(gameState);
    if (res.error) {
      showMilitaryMsg(res.error, 'error');
      return;
    }
    setGameState(res.state);
    showMilitaryMsg('Stabilità nazionale aumentata (+10%).', 'info');
    sfx.select();
  }, [gameState, showMilitaryMsg]);

  const handleImproveRelations = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = improveRelations(gameState, targetId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.select();
    },
    [gameState, showPanelMsg]
  );

  const handleSignPact = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = signNonAggression(gameState, targetId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.select();
    },
    [gameState, showPanelMsg]
  );

  const handleFormAlliance = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = formAlliance(gameState, targetId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.victory();
    },
    [gameState, showPanelMsg]
  );

  const handleToggleSanction = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = toggleSanction(gameState, targetId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.select();
    },
    [gameState, showPanelMsg]
  );

  const handleDeclareWar = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = declareWar(gameState, targetId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.war();
    },
    [gameState, showPanelMsg]
  );

  const handleProposePeace = useCallback(
    (targetId: string) => {
      if (!gameState) return;
      const res = proposePeace(gameState, targetId);
      setGameState(res.state);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      if (res.message) showPanelMsg(res.message, 'info');
      sfx.select();
    },
    [gameState, showPanelMsg]
  );

  const handleLaunchOffensive = useCallback(
    (defenderId: string, allocationPercent: number, mode: AttackMode) => {
      if (!gameState) return;
      const res = launchPlayerOffensive(gameState, defenderId, allocationPercent, mode);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      setPanelFeedback(null);
      if (res.state.lastBattleReport?.annexed) {
        sfx.victory();
      } else {
        sfx.war();
      }
    },
    [gameState, showPanelMsg]
  );

  const handleExecuteCovertOp = useCallback(
    (targetId: string, opType: CovertOpType, framedNationId?: string) => {
      if (!gameState) return;
      const res = executeCovertOperation(gameState, targetId, opType, framedNationId);
      if (res.error) {
        showPanelMsg(res.error, 'error');
        return;
      }
      setGameState(res.state);
      if (res.outcome) {
        showPanelMsg(
          `${res.outcome.headline} — ${res.outcome.detail}`,
          res.outcome.detected ? 'error' : 'info'
        );
        if (
          res.outcome.detected ||
          res.outcome.triggeredWarBetween ||
          res.outcome.triggeredCrisis
        ) {
          sfx.war();
        } else {
          sfx.select();
        }
      }
    },
    [gameState, showPanelMsg]
  );

  const handleContinueSandbox = useCallback(() => {
    setGameState((prev) =>
      prev
        ? { ...prev, status: 'playing', worldConquestAchieved: true, endReason: undefined }
        : prev
    );
  }, []);

  if (screen === 'select' || !gameState) {
    return (
      <>
        <NationSelectScreen
          saveSlots={saveSlots}
          defaultSlotId={findFirstEmptySlot()}
          onStartGame={handleStartGame}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={handleDeleteSlot}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />
        <PrivacyLegalModal
          open={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
          onClearAllLocalData={handleClearLocalData}
        />
      </>
    );
  }

  return (
    <div className="h-[100dvh] w-screen overflow-hidden flex flex-col bg-[#080E18] text-slate-100">
      {/* ZONE 1: Compact Non-Overlapping Top Header (shrink-0) */}
      <TopBar
        gameState={gameState}
        soundMuted={soundMuted}
        onToggleSound={() => setSoundMuted(toggleSoundMute())}
        onNextTurn={handleNextTurn}
        onOpenMilitary={() => {
          setMilitaryFeedback(null);
          setNewsOpen(false);
          setMilitaryOpen(true);
        }}
        onOpenSaveModal={() => {
          refreshSlots();
          setSaveModalOpen(true);
        }}
        onOpenHelp={() => {
          setNewsOpen(false);
          setHelpOpen(true);
        }}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onGoToMenu={() => {
          refreshSlots();
          setScreen('select');
        }}
        onSelectPlayerNation={() => {
          setNewsOpen(false);
          handleSelectNation(gameState.playerId);
        }}
      />

      {/* ZONE 2: Central 360° Interactive Map Area (flex-1 relative overflow-hidden) */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden">
        <WorldMap
          gameState={gameState}
          selectedNationId={selectedNationId}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          onSelectNation={handleSelectNation}
        />

        {/* Contextual Nation Drawer (Desktop right panel / Mobile bottom sheet) */}
        <NationPanel
          gameState={gameState}
          nationId={selectedNationId}
          feedbackMessage={panelFeedback}
          onClose={() => setSelectedNationId(null)}
          onSelectNation={handleSelectNation}
          onOpenMilitary={() => {
            setMilitaryFeedback(null);
            setMilitaryOpen(true);
          }}
          onImproveRelations={handleImproveRelations}
          onSignPact={handleSignPact}
          onFormAlliance={handleFormAlliance}
          onToggleSanction={handleToggleSanction}
          onDeclareWar={handleDeclareWar}
          onProposePeace={handleProposePeace}
          onLaunchOffensive={handleLaunchOffensive}
          onExecuteCovertOp={handleExecuteCovertOp}
        />
      </main>

      {/* ZONE 3 (Desktop): In-flow News Feed Bar + (Mobile): Dedicated Cronaca Sheet */}
      <NewsFeedBar
        news={gameState.news}
        open={newsOpen}
        onOpenChange={setNewsOpen}
        onSelectNation={handleSelectNation}
      />

      {/* ZONE 3 (Mobile): Fixed-in-flow Bottom Dock (Esercito, Cronaca, Guida + Prossimo Turno) */}
      <MobileBottomDock
        canAdvanceTurn={gameState.status === 'playing'}
        newsCount={gameState.news.length}
        militaryOpen={militaryOpen}
        newsOpen={newsOpen}
        helpOpen={helpOpen}
        onOpenMilitary={() => {
          setMilitaryFeedback(null);
          setNewsOpen(false);
          setHelpOpen(false);
          setMilitaryOpen(true);
        }}
        onToggleNews={() => {
          setMilitaryOpen(false);
          setHelpOpen(false);
          setNewsOpen((prev) => !prev);
        }}
        onOpenHelp={() => {
          setMilitaryOpen(false);
          setNewsOpen(false);
          setHelpOpen(true);
        }}
        onNextTurn={handleNextTurn}
      />

      {/* Modals */}
      <MilitaryTechModal
        open={militaryOpen}
        gameState={gameState}
        feedbackMessage={militaryFeedback}
        onClose={() => setMilitaryOpen(false)}
        onRecruit={handleRecruit}
        onStartResearch={handleStartResearch}
        onStabilize={handleStabilize}
      />

      <BattleReportModal
        report={gameState.lastBattleReport}
        gameState={gameState}
        onClose={() =>
          setGameState((prev) => (prev ? { ...prev, lastBattleReport: null } : prev))
        }
      />

      <SaveLoadModal
        open={saveModalOpen}
        activeSlotId={activeSlotId}
        saveSlots={saveSlots}
        onClose={() => setSaveModalOpen(false)}
        onSaveToSlot={handleSaveToSlot}
        onLoadSlot={handleLoadSlot}
        onDeleteSlot={handleDeleteSlot}
        onNewGame={() => {
          setSaveModalOpen(false);
          refreshSlots();
          setScreen('select');
        }}
        onClearLocalData={handleClearLocalData}
      />

      <HowToPlayModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <PrivacyLegalModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        onClearAllLocalData={handleClearLocalData}
      />

      <GameOverModal
        gameState={gameState}
        onNewGame={() => {
          refreshSlots();
          setScreen('select');
        }}
        onContinueSandbox={handleContinueSandbox}
      />
    </div>
  );
}
