// ============================================================
// Selectors – derive computed state from GameState
// ============================================================

import {
  GameState, UnitInstance, HexCoord, AttackMode,
  UnitDefinition, LeaderDefinition, MapDefinition,
} from '../core/types';
import {
  hexDistance, hexNeighbors, hexEquals, getCell, buildCellMap,
  findReachableHexes, hasAdjacentEnemy, getAdjacentEnemies,
  terrainMoveCost, ReachableHex,
} from '../map/hex';
import { canAttack } from '../combat/combat';
import { getUnitDef, getLeaderDef, getUnitOrLeaderDef } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';
import { getPlayer, getBaseActions, getMaxExtraActions, getExtraActionCost } from '../state/gameState';

/** Get all legal move destinations for a unit */
export function getLegalMoves(state: GameState, unit: UnitInstance): ReachableHex[] {
  if (unit.movedThisActivation) return [];
  if (unit.hp <= 0) return [];

  // Check engagement
  if (hasAdjacentEnemy(unit, state.units)) return [];

  const def = getUnitOrLeaderDef(unit.defId);
  if (!def) return [];

  const cellMap = buildCellMap(state.map.cells);
  const maxMove = def.move;

  // Movement cost modifier for Corredor Silvano
  let forestUsed = false;
  const moveCostMod = (terrain: string, _coord: HexCoord, _costSoFar: number): number => {
    const unitDef = getUnitDef(unit.defId);
    if (unitDef && terrain === 'FOREST') {
      const hasTrait = unitDef.traits.some(t => t.id === 'sendero_silvano');
      if (hasTrait && !forestUsed) {
        forestUsed = true;
        return 1;
      }
    }
    return terrainMoveCost(terrain as any);
  };

  return findReachableHexes(
    unit.position,
    maxMove,
    cellMap,
    state.units,
    unit.instanceId,
    moveCostMod
  );
}

/** Get all legal attack targets for a unit */
export function getLegalAttacks(state: GameState, unit: UnitInstance): Array<{ target: UnitInstance; mode: AttackMode }> {
  if (unit.attackedThisActivation) return [];
  if (unit.hp <= 0) return [];

  const results: Array<{ target: UnitInstance; mode: AttackMode }> = [];
  const enemies = state.units.filter(u => u.hp > 0 && u.ownerPlayerId !== unit.ownerPlayerId);

  for (const enemy of enemies) {
    for (const mode of ['MELEE', 'RANGED'] as AttackMode[]) {
      const check = canAttack(unit, enemy, mode, state);
      if (check.valid) {
        results.push({ target: enemy, mode });
      }
    }
  }

  return results;
}

/** Get units that can be activated */
export function getActivatableUnits(state: GameState): UnitInstance[] {
  const player = getPlayer(state, state.activePlayerId);
  if (player.actionsRemaining <= 0) return [];

  return state.units.filter(u =>
    u.hp > 0 &&
    u.ownerPlayerId === state.activePlayerId &&
    !u.exhausted &&
    !u.hasActivatedThisRound
  );
}

/** Get units that can be ascended */
export function getAscendableUnits(state: GameState): Array<{ unit: UnitInstance; targets: string[] }> {
  const player = getPlayer(state, state.activePlayerId);
  if (player.actionsRemaining <= 0) return [];

  const results: Array<{ unit: UnitInstance; targets: string[] }> = [];

  for (const unit of state.units) {
    if (unit.hp <= 0 || unit.ownerPlayerId !== state.activePlayerId) continue;

    const def = getUnitDef(unit.defId);
    if (!def || !def.evolvesTo || !def.ascRequired) continue;
    if (def.tier === 'LEADER') continue;
    if (unit.ascMarks < def.ascRequired) continue;

    const validTargets = def.evolvesTo.filter(targetId => {
      const targetDef = getUnitDef(targetId);
      if (!targetDef) return false;
      if (targetDef.tier === 2) return state.reserve.remainingTier2.includes(targetId);
      if (targetDef.tier === 3) return state.reserve.remainingTier3.includes(targetId);
      return false;
    });

    if (validTargets.length > 0) {
      results.push({ unit, targets: validTargets });
    }
  }

  return results;
}

/** Get spawn zones with availability */
export function getAvailableSpawnHexes(state: GameState, playerId: string): HexCoord[] {
  const zones = state.map.spawnZones[playerId as 'PLAYER1' | 'PLAYER2'];
  return zones.filter(hex =>
    !state.units.some(u => u.hp > 0 && hexEquals(u.position, hex))
  );
}

/** Count controlled cities per player */
export function getCityControl(state: GameState): Record<string, number> {
  const cityCells = state.map.cells.filter(c => c.terrain === 'CITY');
  const counts: Record<string, number> = { PLAYER1: 0, PLAYER2: 0 };

  for (const cc of cityCells) {
    const occupant = state.units.find(u =>
      u.hp > 0 && hexEquals(u.position, cc)
    );
    if (occupant) {
      counts[occupant.ownerPlayerId] = (counts[occupant.ownerPlayerId] || 0) + 1;
    }
  }

  return counts;
}

/** Get total cities on map */
export function getTotalCities(state: GameState): number {
  return state.map.cells.filter(c => c.terrain === 'CITY').length;
}

/** Can the active player buy an extra action? */
export function canBuyExtraAction(state: GameState): { can: boolean; cost: number; reason?: string } {
  const player = getPlayer(state, state.activePlayerId);
  const maxExtras = getMaxExtraActions(state.round);

  if (player.extraActionsPurchasedThisRound >= maxExtras) {
    return { can: false, cost: 0, reason: 'Máximo de acciones extra alcanzado.' };
  }

  const cost = getExtraActionCost(player.extraActionsPurchasedThisRound + 1);
  if (player.gold < cost) {
    return { can: false, cost, reason: `Oro insuficiente (necesita ${cost}).` };
  }

  return { can: true, cost };
}

/** Get the full definition for a unit instance */
export function getInstanceDef(instance: UnitInstance): UnitDefinition | LeaderDefinition | undefined {
  return getUnitOrLeaderDef(instance.defId);
}

/** Is the unit a leader? */
export function isLeader(instance: UnitInstance): boolean {
  return LEADERS.some(l => l.id === instance.defId);
}
