// ============================================================
// Test Factory – Shared test utilities and fixtures
// ============================================================

import { GameState, UnitInstance, HexCoord } from '../../src/engine/core/types';
import { createGameState, createUnitInstance } from '../../src/engine/state/gameState';
import { ALL_MAPS } from '../../src/content/maps/maps';

/**
 * Create a playable game state with common defaults
 */
export function createTestState(opts: { mapId?: string; seed?: number } = {}): GameState {
  const mapId = opts.mapId ?? 'map_open_field';
  const map = ALL_MAPS.find(m => m.id === mapId);
  if (!map) throw new Error(`Map ${mapId} not found`);

  const state = createGameState(map, 'HUMAN', 'ORC', opts.seed ?? 42);
  state.phase = 'PLAYING';
  state.activePlayerId = 'PLAYER1';
  const p1 = state.players[0];
  p1.actionsRemaining = 10;
  p1.gold = 50;

  return state;
}

/**
 * Place a unit at a specific hex
 */
export function placeUnit(
  state: GameState,
  defId: string,
  owner: 'PLAYER1' | 'PLAYER2',
  hex: HexCoord,
  exhausted: boolean = false
): UnitInstance {
  const unit = createUnitInstance(defId, owner, hex, exhausted);
  state.units.push(unit);
  return unit;
}

/**
 * Place a unit at an adjacent hex to a target unit
 */
export function placeUnitAdjacent(
  state: GameState,
  defId: string,
  owner: 'PLAYER1' | 'PLAYER2',
  adjacentTo: UnitInstance
): UnitInstance {
  const neighbors = [
    { q: adjacentTo.position.q + 1, r: adjacentTo.position.r },
    { q: adjacentTo.position.q - 1, r: adjacentTo.position.r },
    { q: adjacentTo.position.q, r: adjacentTo.position.r + 1 },
    { q: adjacentTo.position.q, r: adjacentTo.position.r - 1 },
    { q: adjacentTo.position.q + 1, r: adjacentTo.position.r - 1 },
    { q: adjacentTo.position.q - 1, r: adjacentTo.position.r + 1 },
  ];
  const adjacentHex = neighbors[0]; // Just use first available
  return placeUnit(state, defId, owner, adjacentHex);
}

/**
 * Get a unit from state by definition ID (first match)
 */
export function getUnitByDef(state: GameState, defId: string): UnitInstance | undefined {
  return state.units.find(u => u.defId === defId && u.hp > 0);
}

/**
 * Move a unit to a new position
 */
export function moveUnitTo(unit: UnitInstance, hex: HexCoord): void {
  unit.position = hex;
}

/**
 * Damage a unit
 */
export function damageUnit(unit: UnitInstance, amount: number): void {
  unit.hp = Math.max(0, unit.hp - amount);
}

/**
 * Heal a unit
 */
export function healUnit(unit: UnitInstance, amount: number): void {
  unit.hp = Math.min(unit.maxHp, unit.hp + amount);
}

/**
 * Reset units for a new round
 */
export function resetUnitsForRound(state: GameState): void {
  for (const unit of state.units) {
    unit.hasActivatedThisRound = false;
    unit.exhausted = false;
    unit.movedThisActivation = false;
    unit.attackedThisActivation = false;
    unit.hexesMovedThisActivation = 0;
    unit.damageReductionThisRound = 0;
    unit.hasAttackedThisRound = false;
    unit.traitUsages = {};
  }
}

/**
 * End turn and give actions to next player
 */
export function endPlayerTurn(state: GameState): void {
  const otherPlayerId = state.activePlayerId === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
  state.activePlayerId = otherPlayerId;
  const player = state.players.find(p => p.id === otherPlayerId)!;
  player.actionsRemaining = 5; // Standard mid-game
}
