import { GameState, SaveMeta, SaveSlotId, SaveSlotSummary } from '../types/game';
import { formatTurnDate, getControlledProvinces, round1 } from './helpers';
import { GAME_STATE_VERSION } from './simulation';

const SLOT_PREFIX = 'vexillum_save_slot_v2_';
const ACTIVE_SLOT_KEY = 'vexillum_active_slot_v2';
const LEGACY_KEYS = ['vexillum_autosave_v1', 'vexillum_manual_save_v1'];

export const SAVE_SLOTS: Array<{ id: SaveSlotId; label: string }> = [
  { id: 'slot_1', label: 'Slot 1' },
  { id: 'slot_2', label: 'Slot 2' },
  { id: 'slot_3', label: 'Slot 3' },
  { id: 'slot_4', label: 'Slot 4' },
  { id: 'slot_5', label: 'Slot 5' },
];

interface StoredEnvelope {
  savedAt: string;
  state: GameState;
}

function slotStorageKey(slotId: SaveSlotId): string {
  return `${SLOT_PREFIX}${slotId}`;
}

function isValidGameState(candidate: unknown): candidate is GameState {
  if (!candidate || typeof candidate !== 'object') return false;
  const g = candidate as Partial<GameState>;
  return (
    g.version === GAME_STATE_VERSION &&
    typeof g.turn === 'number' &&
    typeof g.playerId === 'string' &&
    Boolean(g.nations) &&
    typeof g.nations === 'object' &&
    Boolean(g.nations?.[g.playerId]) &&
    Array.isArray(g.wars) &&
    Array.isArray(g.news)
  );
}

function hydrateState(state: GameState): GameState {
  const nations = { ...state.nations };
  for (const [id, n] of Object.entries(nations)) {
    nations[id] = {
      ...n,
      airDefenseDisabledUntilTurn:
        typeof n.airDefenseDisabledUntilTurn === 'number' ? n.airDefenseDisabledUntilTurn : -1,
      cyberDisruptedUntilTurn:
        typeof n.cyberDisruptedUntilTurn === 'number' ? n.cyberDisruptedUntilTurn : -1,
      sabotagedUntilTurn:
        typeof n.sabotagedUntilTurn === 'number' ? n.sabotagedUntilTurn : -1,
      internalCrisisActive: Boolean(n.internalCrisisActive),
    };
  }
  return {
    ...state,
    nations,
    navalBlockades: state.navalBlockades ?? {},
    covertUsedThisTurn: state.covertUsedThisTurn ?? {},
  };
}

function readSlotEnvelope(slotId: SaveSlotId): StoredEnvelope | null {
  try {
    const raw = localStorage.getItem(slotStorageKey(slotId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredEnvelope>;
    if (!parsed || typeof parsed.savedAt !== 'string' || !isValidGameState(parsed.state)) {
      return null;
    }
    return { savedAt: parsed.savedAt, state: hydrateState(parsed.state) };
  } catch {
    return null;
  }
}

function buildMeta(slotId: SaveSlotId, env: StoredEnvelope | null): SaveMeta | null {
  if (!env) return null;
  const player = env.state.nations[env.state.playerId];
  if (!player) return null;
  const totalTerritories = Object.keys(env.state.nations).length;
  return {
    slotId,
    savedAt: env.savedAt,
    playerName: player.name,
    playerId: player.id,
    dateLabel: formatTurnDate(env.state.turn),
    turn: env.state.turn,
    territoriesCount: getControlledProvinces(env.state, player.id).length,
    totalTerritories,
    funds: round1(player.funds),
  };
}

export function listSaveSlots(): SaveSlotSummary[] {
  return SAVE_SLOTS.map(({ id, label }) => ({
    slotId: id,
    label,
    meta: buildMeta(id, readSlotEnvelope(id)),
  }));
}

export function saveToSlot(slotId: SaveSlotId, state: GameState): boolean {
  try {
    const payload: StoredEnvelope = {
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(slotStorageKey(slotId), JSON.stringify(payload));
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId);
    return true;
  } catch {
    return false;
  }
}

export function loadFromSlot(slotId: SaveSlotId): GameState | null {
  const env = readSlotEnvelope(slotId);
  if (!env) return null;
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId);
  } catch {
    // ignore
  }
  return env.state;
}

export function deleteSaveSlot(slotId: SaveSlotId): void {
  try {
    localStorage.removeItem(slotStorageKey(slotId));
    if (localStorage.getItem(ACTIVE_SLOT_KEY) === slotId) {
      localStorage.removeItem(ACTIVE_SLOT_KEY);
    }
  } catch {
    // ignore
  }
}

export function getActiveSlotId(): SaveSlotId | null {
  try {
    const val = localStorage.getItem(ACTIVE_SLOT_KEY) as SaveSlotId | null;
    if (val && SAVE_SLOTS.some((s) => s.id === val)) {
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

export function findFirstEmptySlot(): SaveSlotId {
  const slots = listSaveSlots();
  const empty = slots.find((s) => !s.meta);
  return empty ? empty.slotId : 'slot_1';
}

export function clearAllLocalSaves(): void {
  try {
    for (const s of SAVE_SLOTS) {
      localStorage.removeItem(slotStorageKey(s.id));
    }
    localStorage.removeItem(ACTIVE_SLOT_KEY);
    for (const legacy of LEGACY_KEYS) {
      localStorage.removeItem(legacy);
    }
  } catch {
    // ignore
  }
}
