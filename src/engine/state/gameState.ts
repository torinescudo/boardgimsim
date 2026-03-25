// ============================================================
// Game State – initialization and management
// ============================================================

import {
  GameState, PlayerState, MapDefinition, Faction,
  ShopState, ReserveState, UnitInstance, HexCoord,
  BlessingState, LogEntry, RemainsToken,
} from '../core/types';
import { getTier1Units, getTier2Units, getTier3Units, getLeaderDef, getUnitDef, ALL_UNITS } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';
import { RngService, createRng } from '../rng/rng';

let nextInstanceId = 1;
export function generateInstanceId(): string {
  return `unit_${nextInstanceId++}`;
}
export function resetInstanceIdCounter(): void {
  nextInstanceId = 1;
}

/** Create initial shop: all 16 T1 shuffled, top 4 visible */
export function createShop(rng: RngService): ShopState {
  const tier1 = getTier1Units();
  const deck = tier1.map(u => u.id);
  rng.shuffle(deck);

  const visible = [];
  for (let i = 0; i < 4; i++) {
    if (deck.length > 0) {
      visible.push({ unitDefId: deck.shift()!, addedOnRound: 0, slotIndex: i });
    } else {
      visible.push(null);
    }
  }

  return { deck, visible, refreshUsedThisTurn: false };
}

/** Create reserve: one copy of each T2, one copy of each T3 */
export function createReserve(): ReserveState {
  return {
    remainingTier2: getTier2Units().map(u => u.id),
    remainingTier3: getTier3Units().map(u => u.id),
  };
}

/** Create a unit instance at a position */
export function createUnitInstance(
  defId: string,
  ownerPlayerId: string,
  position: HexCoord,
  exhausted: boolean = false
): UnitInstance {
  const def = ALL_UNITS.find(u => u.id === defId);
  const leader = LEADERS.find(l => l.id === defId);
  const maxHp = def?.maxHp ?? leader?.maxHp ?? 1;

  return {
    instanceId: generateInstanceId(),
    defId,
    ownerPlayerId,
    hp: maxHp,
    maxHp,
    ascMarks: 0,
    exhausted,
    hasActivatedThisRound: false,
    position,
    statusEffects: [],
    traitUsages: {},
    movedThisActivation: false,
    attackedThisActivation: false,
    hexesMovedThisActivation: 0,
    damageReductionThisRound: 0,
    hasAttackedThisRound: false,
  };
}

/** Determine first player by leader HP (lower HP goes first) */
export function determineFirstPlayer(
  leader1DefId: string,
  leader2DefId: string,
  rng: RngService
): string {
  const l1 = getLeaderDef(leader1DefId);
  const l2 = getLeaderDef(leader2DefId);
  if (!l1 || !l2) return 'PLAYER1';

  if (l1.maxHp < l2.maxHp) return 'PLAYER1';
  if (l2.maxHp < l1.maxHp) return 'PLAYER2';
  // Tie: random
  return rng.next() < 0.5 ? 'PLAYER1' : 'PLAYER2';
}

/** Get base actions for a round */
export function getBaseActions(round: number): number {
  if (round <= 2) return 3;
  if (round <= 5) return 4;
  return 5;
}

/** Get max extra actions purchasable this round */
export function getMaxExtraActions(round: number): number {
  if (round <= 2) return 0;
  if (round <= 5) return 1;
  return 2;
}

/** Get cost of the nth extra action (1-indexed) */
export function getExtraActionCost(nth: number): number {
  if (nth === 1) return 2;
  if (nth === 2) return 3;
  return Infinity;
}

/** Create initial game state */
export function createGameState(
  mapDef: MapDefinition,
  player1Faction: Faction,
  player2Faction: Faction,
  seed?: number
): GameState {
  const rng = createRng(seed);
  resetInstanceIdCounter();

  const leader1 = LEADERS.find(l => l.faction === player1Faction)!;
  const leader2 = LEADERS.find(l => l.faction === player2Faction)!;

  const firstPlayer = determineFirstPlayer(leader1.id, leader2.id, rng);

  const player1: PlayerState = {
    id: 'PLAYER1',
    faction: player1Faction,
    leaderDefId: leader1.id,
    gold: 6,
    actionsRemaining: 3,
    extraActionsPurchasedThisRound: 0,
    blessing: null,
  };

  const player2: PlayerState = {
    id: 'PLAYER2',
    faction: player2Faction,
    leaderDefId: leader2.id,
    gold: 6,
    actionsRemaining: 3,
    extraActionsPurchasedThisRound: 0,
    blessing: null,
  };

  // Place leaders on their fortresses
  const p1Fortress = mapDef.spawnZones.PLAYER1[0];
  const p2Fortress = mapDef.spawnZones.PLAYER2[0];

  const units: UnitInstance[] = [
    createUnitInstance(leader1.id, 'PLAYER1', p1Fortress, false),
    createUnitInstance(leader2.id, 'PLAYER2', p2Fortress, false),
  ];

  const shop = createShop(rng);
  const reserve = createReserve();

  return {
    round: 1,
    activePlayerId: firstPlayer,
    initiativePlayerId: firstPlayer,
    cycle: 'DAY',
    phase: 'PRE_DRAFT',
    players: [player1, player2],
    units,
    remainsTokens: [],
    map: mapDef,
    shop,
    reserve,
    log: [{
      round: 0,
      type: 'GAME_START',
      message: `Partida iniciada. ${leader1.name} vs ${leader2.name}. Primer jugador: ${firstPlayer}.`,
    }],
    winner: null,
    preDraftPurchasesRemaining: 4,
    preDraftCurrentPlayer: firstPlayer,
  };
}

/** Add a log entry */
export function addLog(state: GameState, type: string, message: string, playerId?: string, details?: Record<string, unknown>): void {
  state.log.push({
    round: state.round,
    playerId,
    type,
    message,
    details,
  });
}

/** Get player state by id */
export function getPlayer(state: GameState, playerId: string): PlayerState {
  return state.players.find(p => p.id === playerId)!;
}

/** Get opponent */
export function getOpponent(state: GameState, playerId: string): PlayerState {
  return state.players.find(p => p.id !== playerId)!;
}

/** Get all living units for a player */
export function getPlayerUnits(state: GameState, playerId: string): UnitInstance[] {
  return state.units.filter(u => u.ownerPlayerId === playerId && u.hp > 0);
}

/** Get unit or leader definition by ID (consolidated lookup) */
export function getDefinition(defId: string) {
  return getUnitDef(defId) || LEADERS.find(l => l.id === defId);
}

/** Get definition name safely */
export function getDefinitionName(defId: string): string {
  return getDefinition(defId)?.name ?? defId;
}
