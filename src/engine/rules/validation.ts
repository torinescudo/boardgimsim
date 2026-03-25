// ============================================================
// Action Validation – checks legality before execution
// ============================================================

import {
  GameState, GameAction, ActionValidation, UnitInstance,
  HexCoord, AttackMode,
} from '../core/types';
import {
  getPlayer, getOpponent, getBaseActions, getMaxExtraActions,
  getExtraActionCost,
} from '../state/gameState';
import {
  hexDistance, hexEquals, getCell, isHexOccupied,
  hasAdjacentEnemy, buildCellMap, findReachableHexes,
  getUnitAtHex, terrainMoveCost,
} from '../map/hex';
import { canAttack } from '../combat/combat';
import { getUnitDef, getLeaderDef, getUnitOrLeaderDef, ALL_UNITS } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';

export function validateAction(state: GameState, action: GameAction): ActionValidation {
  switch (action.type) {
    case 'ACTIVATE_UNIT': return validateActivateUnit(state, action.unitInstanceId);
    case 'MOVE_UNIT': return validateMoveUnit(state, action.unitInstanceId, action.path);
    case 'ATTACK': return validateAttack(state, action.attackerInstanceId, action.targetInstanceId, action.mode);
    case 'RECRUIT': return validateRecruit(state, action.shopSlotIndex, action.targetHex);
    case 'ASCEND': return validateAscend(state, action.unitInstanceId, action.targetDefId);
    case 'BUY_EXTRA_ACTION': return validateBuyExtraAction(state);
    case 'REFRESH_SHOP': return validateRefreshShop(state, action.slotIndex);
    case 'END_TURN': return { valid: true };
    case 'END_ACTIVATION': return validateEndActivation(state, action.unitInstanceId);
    case 'PRE_DRAFT_BUY': return validatePreDraftBuy(state, action.shopSlotIndex, action.targetHex);
    case 'USE_BLESSING': return validateUseBlessing(state, action);
    default: return { valid: false, reason: 'Acción desconocida.' };
  }
}

function validateActivateUnit(state: GameState, unitId: string): ActionValidation {
  if (state.phase !== 'PLAYING') return { valid: false, reason: 'No es fase de juego.' };

  const player = getPlayer(state, state.activePlayerId);
  if (player.actionsRemaining <= 0) return { valid: false, reason: 'No quedan acciones.' };

  const unit = state.units.find(u => u.instanceId === unitId);
  if (!unit) return { valid: false, reason: 'Unidad no encontrada.' };
  if (unit.ownerPlayerId !== state.activePlayerId) return { valid: false, reason: 'No es tu unidad.' };
  if (unit.hp <= 0) return { valid: false, reason: 'Unidad eliminada.' };
  if (unit.exhausted) return { valid: false, reason: 'Unidad agotada.' };
  if (unit.hasActivatedThisRound) return { valid: false, reason: 'Ya activó esta ronda.' };

  return { valid: true };
}

function validateMoveUnit(state: GameState, unitId: string, path: HexCoord[]): ActionValidation {
  const unit = state.units.find(u => u.instanceId === unitId);
  if (!unit) return { valid: false, reason: 'Unidad no encontrada.' };
  if (unit.ownerPlayerId !== state.activePlayerId) return { valid: false, reason: 'No es tu unidad.' };
  if (unit.movedThisActivation) return { valid: false, reason: 'Ya se movió esta activación.' };

  // Check engagement (Traba)
  if (hasAdjacentEnemy(unit, state.units)) {
    // Check for Avatar's enhanced engagement
    const adjacentEnemies = state.units.filter(u =>
      u.hp > 0 &&
      u.ownerPlayerId !== unit.ownerPlayerId &&
      hexDistance(u.position, unit.position) === 1
    );
    // Standard engagement prevents leaving
    return { valid: false, reason: 'Trabado por enemigo adyacente.' };
  }

  if (path.length === 0) return { valid: false, reason: 'Ruta vacía.' };

  const cellMap = buildCellMap(state.map.cells);
  const def = getUnitOrLeaderDef(unit.defId);
  if (!def) return { valid: false, reason: 'Definición de unidad no encontrada.' };

  const maxMove = def.move;
  let totalCost = 0;
  let prev = unit.position;
  let forestUsed = false;

  for (const step of path) {
    if (hexDistance(prev, step) !== 1) {
      return { valid: false, reason: `Paso no adyacente en la ruta: (${prev.q},${prev.r}) -> (${step.q},${step.r}).` };
    }

    const cell = cellMap.get(`${step.q},${step.r}`);
    if (!cell) return { valid: false, reason: `Hex (${step.q},${step.r}) fuera del mapa.` };
    if (cell.terrain === 'WATER') return { valid: false, reason: 'No puede cruzar agua.' };

    // Check occupancy (only final position can be checked, but intermediate must also be free)
    if (isHexOccupied(state.units, step)) {
      // Can pass through? No – can't enter occupied hex
      return { valid: false, reason: `Hex (${step.q},${step.r}) ocupado.` };
    }

    let cost = terrainMoveCost(cell.terrain);

    // Corredor Silvano: first forest costs 1
    const unitDef = getUnitDef(unit.defId);
    if (unitDef && cell.terrain === 'FOREST') {
      const hasSenderoSilvano = unitDef.traits.some(t => t.id === 'sendero_silvano');
      if (hasSenderoSilvano && !forestUsed) {
        cost = 1;
        forestUsed = true;
      }
    }

    totalCost += cost;
    prev = step;
  }

  if (totalCost > maxMove) {
    return { valid: false, reason: `Movimiento insuficiente: necesita ${totalCost}, tiene ${maxMove}.` };
  }

  return { valid: true };
}

function validateAttack(state: GameState, attackerId: string, targetId: string, mode: AttackMode): ActionValidation {
  const attacker = state.units.find(u => u.instanceId === attackerId);
  const target = state.units.find(u => u.instanceId === targetId);

  if (!attacker) return { valid: false, reason: 'Atacante no encontrado.' };
  if (!target) return { valid: false, reason: 'Objetivo no encontrado.' };
  if (attacker.attackedThisActivation) return { valid: false, reason: 'Ya atacó esta activación.' };

  return canAttack(attacker, target, mode, state);
}

function validateRecruit(state: GameState, slotIndex: number, targetHex: HexCoord): ActionValidation {
  if (state.phase !== 'PLAYING') return { valid: false, reason: 'No es fase de juego.' };

  const player = getPlayer(state, state.activePlayerId);
  if (player.actionsRemaining <= 0) return { valid: false, reason: 'No quedan acciones.' };

  const slot = state.shop.visible[slotIndex];
  if (!slot) return { valid: false, reason: 'Slot vacío.' };

  const unitDef = getUnitDef(slot.unitDefId);
  if (!unitDef) return { valid: false, reason: 'Definición de unidad no encontrada.' };

  if (unitDef.costGold && player.gold < unitDef.costGold) {
    return { valid: false, reason: `Oro insuficiente: necesita ${unitDef.costGold}, tiene ${player.gold}.` };
  }

  // Check spawn zone
  const spawnZones = state.map.spawnZones[state.activePlayerId as 'PLAYER1' | 'PLAYER2'];
  if (!spawnZones.some(sz => hexEquals(sz, targetHex))) {
    return { valid: false, reason: 'Hex no es una zona de despliegue válida.' };
  }

  // Check hex is not occupied
  if (isHexOccupied(state.units, targetHex)) {
    return { valid: false, reason: 'Hex de despliegue ocupado.' };
  }

  return { valid: true };
}

function validateAscend(state: GameState, unitId: string, targetDefId: string): ActionValidation {
  if (state.phase !== 'PLAYING') return { valid: false, reason: 'No es fase de juego.' };

  const player = getPlayer(state, state.activePlayerId);
  if (player.actionsRemaining <= 0) return { valid: false, reason: 'No quedan acciones.' };

  const unit = state.units.find(u => u.instanceId === unitId);
  if (!unit) return { valid: false, reason: 'Unidad no encontrada.' };
  if (unit.ownerPlayerId !== state.activePlayerId) return { valid: false, reason: 'No es tu unidad.' };
  if (unit.hp <= 0) return { valid: false, reason: 'Unidad eliminada.' };

  const unitDef = getUnitDef(unit.defId);
  if (!unitDef) return { valid: false, reason: 'No puede ascender (líder u otra razón).' };
  if (unitDef.tier === 'LEADER') return { valid: false, reason: 'Los líderes no ascienden.' };
  if (!unitDef.evolvesTo || !unitDef.evolvesTo.includes(targetDefId)) {
    return { valid: false, reason: `${unitDef.name} no puede ascender a ${targetDefId}.` };
  }

  if (!unitDef.ascRequired) return { valid: false, reason: 'Unidad sin requisito de ascenso.' };
  if (unit.ascMarks < unitDef.ascRequired) {
    return { valid: false, reason: `Marcas insuficientes: ${unit.ascMarks}/${unitDef.ascRequired}.` };
  }

  // Check reserve
  const targetDef = getUnitDef(targetDefId);
  if (!targetDef) return { valid: false, reason: 'Definición de ascenso no encontrada.' };

  if (targetDef.tier === 2) {
    if (!state.reserve.remainingTier2.includes(targetDefId)) {
      return { valid: false, reason: `${targetDef.name} ya no está en la reserva.` };
    }
  } else if (targetDef.tier === 3) {
    if (!state.reserve.remainingTier3.includes(targetDefId)) {
      return { valid: false, reason: `${targetDef.name} ya no está en la reserva.` };
    }
  }

  return { valid: true };
}

function validateBuyExtraAction(state: GameState): ActionValidation {
  if (state.phase !== 'PLAYING') return { valid: false, reason: 'No es fase de juego.' };

  const player = getPlayer(state, state.activePlayerId);
  const maxExtras = getMaxExtraActions(state.round);

  if (player.extraActionsPurchasedThisRound >= maxExtras) {
    return { valid: false, reason: 'No puede comprar más acciones extra esta ronda.' };
  }

  const cost = getExtraActionCost(player.extraActionsPurchasedThisRound + 1);
  if (player.gold < cost) {
    return { valid: false, reason: `Oro insuficiente: necesita ${cost}, tiene ${player.gold}.` };
  }

  return { valid: true };
}

function validateRefreshShop(state: GameState, slotIndex: number): ActionValidation {
  if (state.phase !== 'PLAYING') return { valid: false, reason: 'No es fase de juego.' };

  const player = getPlayer(state, state.activePlayerId);

  if (state.shop.refreshUsedThisTurn) {
    return { valid: false, reason: 'Ya se usó el refresh este turno.' };
  }

  if (player.gold < 1) {
    return { valid: false, reason: 'Oro insuficiente: necesita 1.' };
  }

  if (!state.shop.visible[slotIndex]) {
    return { valid: false, reason: 'Slot ya vacío.' };
  }

  if (state.shop.deck.length === 0) {
    return { valid: false, reason: 'Mazo vacío, no hay reemplazo.' };
  }

  return { valid: true };
}

function validateEndActivation(state: GameState, unitId: string): ActionValidation {
  const unit = state.units.find(u => u.instanceId === unitId);
  if (!unit) return { valid: false, reason: 'Unidad no encontrada.' };
  return { valid: true };
}

function validatePreDraftBuy(state: GameState, slotIndex: number, targetHex: HexCoord): ActionValidation {
  if (state.phase !== 'PRE_DRAFT') return { valid: false, reason: 'No es fase de draft.' };
  if (state.preDraftPurchasesRemaining <= 0) return { valid: false, reason: 'Sin compras restantes.' };

  const slot = state.shop.visible[slotIndex];
  if (!slot) return { valid: false, reason: 'Slot vacío.' };

  const currentPlayer = state.preDraftCurrentPlayer;
  const spawnZones = state.map.spawnZones[currentPlayer as 'PLAYER1' | 'PLAYER2'];
  if (!spawnZones.some(sz => hexEquals(sz, targetHex))) {
    return { valid: false, reason: 'Hex no es zona de despliegue válida.' };
  }

  if (isHexOccupied(state.units, targetHex)) {
    return { valid: false, reason: 'Hex de despliegue ocupado.' };
  }

  return { valid: true };
}

function validateUseBlessing(state: GameState, action: { type: 'USE_BLESSING'; unitInstanceId?: string; targetHex?: HexCoord }): ActionValidation {
  const player = getPlayer(state, state.activePlayerId);
  if (!player.blessing) return { valid: false, reason: 'Sin bendición activa.' };
  if (player.blessing.consumed) return { valid: false, reason: 'Bendición ya consumida.' };

  if (player.blessing.type === 'GOLD_AND_MOVE') {
    if (!action.unitInstanceId || !action.targetHex) {
      return { valid: false, reason: 'Debe especificar unidad y hex destino.' };
    }
    const unit = state.units.find(u => u.instanceId === action.unitInstanceId);
    if (!unit) return { valid: false, reason: 'Unidad no encontrada.' };
    if (unit.ownerPlayerId !== state.activePlayerId) return { valid: false, reason: 'No es tu unidad.' };
    if (hexDistance(unit.position, action.targetHex) !== 1) return { valid: false, reason: 'Solo puede mover 1 hex.' };
    const cell = getCell(state.map, action.targetHex);
    if (!cell || cell.terrain === 'WATER') return { valid: false, reason: 'No puede moverse ahí.' };
    if (isHexOccupied(state.units, action.targetHex)) return { valid: false, reason: 'Hex ocupado.' };
  }

  return { valid: true };
}
