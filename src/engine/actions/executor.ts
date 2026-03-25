// ============================================================
// Action Executor – applies validated actions to game state
// ============================================================

import {
  GameState, GameAction, UnitInstance, HexCoord, AttackMode,
  CombatResult, BlessingState,
} from '../core/types';
import {
  getPlayer, getOpponent, addLog, createUnitInstance,
  getBaseActions, getExtraActionCost, getDefinitionName,
} from '../state/gameState';
import {
  hexDistance, hexEquals, getCell, hexNeighbors,
  isHexOccupied, getAdjacentAllies, getAdjacentEnemies,
  buildCellMap, getUnitAtHex,
} from '../map/hex';
import { resolveCombat, buildDicePool } from '../combat/combat';
import { validateAction } from '../rules/validation';
import { getUnitDef, getLeaderDef, ALL_UNITS } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';
import { RngService, createRng } from '../rng/rng';

let gameRng: RngService = createRng();

export function setGameRng(rng: RngService): void {
  gameRng = rng;
}

export function getGameRng(): RngService {
  return gameRng;
}

/** Execute a game action, mutating state. Returns error string if invalid. */
export function executeAction(state: GameState, action: GameAction): string | null {
  const validation = validateAction(state, action);
  if (!validation.valid) return validation.reason || 'Acción inválida.';

  switch (action.type) {
    case 'ACTIVATE_UNIT': return execActivateUnit(state, action.unitInstanceId);
    case 'MOVE_UNIT': return execMoveUnit(state, action.unitInstanceId, action.path);
    case 'ATTACK': return execAttack(state, action.attackerInstanceId, action.targetInstanceId, action.mode);
    case 'RECRUIT': return execRecruit(state, action.shopSlotIndex, action.targetHex);
    case 'ASCEND': return execAscend(state, action.unitInstanceId, action.targetDefId);
    case 'BUY_EXTRA_ACTION': return execBuyExtraAction(state);
    case 'REFRESH_SHOP': return execRefreshShop(state, action.slotIndex);
    case 'END_TURN': return execEndTurn(state);
    case 'END_ACTIVATION': return execEndActivation(state, action.unitInstanceId);
    case 'PRE_DRAFT_BUY': return execPreDraftBuy(state, action.shopSlotIndex, action.targetHex);
    case 'USE_BLESSING': return execUseBlessing(state, action);
    default: return 'Acción desconocida.';
  }
}

function execActivateUnit(state: GameState, unitId: string): string | null {
  const player = getPlayer(state, state.activePlayerId);
  player.actionsRemaining -= 1;

  const unit = state.units.find(u => u.instanceId === unitId)!;
  unit.hasActivatedThisRound = true;
  unit.movedThisActivation = false;
  unit.attackedThisActivation = false;
  unit.hexesMovedThisActivation = 0;

  addLog(state, 'ACTIVATE', `${getDefName(unit.defId)} activado.`, state.activePlayerId);
  return null;
}

function execMoveUnit(state: GameState, unitId: string, path: HexCoord[]): string | null {
  const unit = state.units.find(u => u.instanceId === unitId)!;
  const startPos = { ...unit.position };

  unit.position = path[path.length - 1];
  unit.movedThisActivation = true;
  unit.hexesMovedThisActivation = path.length;

  addLog(state, 'MOVE',
    `${getDefName(unit.defId)} se mueve de (${startPos.q},${startPos.r}) a (${unit.position.q},${unit.position.r}).`,
    state.activePlayerId
  );

  return null;
}

function execAttack(state: GameState, attackerId: string, targetId: string, mode: AttackMode): string | null {
  const attacker = state.units.find(u => u.instanceId === attackerId)!;
  const target = state.units.find(u => u.instanceId === targetId)!;

  const result = resolveCombat(attacker, target, mode, state, gameRng);

  attacker.attackedThisActivation = true;
  attacker.hasAttackedThisRound = true;

  // Log combat details
  const poolDesc = result.dicePool.dice.map((d, i) =>
    `${d}:${result.rolls[i]}=${result.results[i]}`
  ).join(', ');

  addLog(state, 'COMBAT',
    `${getDefName(attacker.defId)} ataca a ${getDefName(target.defId)} (${mode}). ` +
    `Dados: [${poolDesc}]. Impactos: ${result.totalHits}, Daño: ${result.damageDealt}.`,
    state.activePlayerId,
    {
      breakdown: result.breakdown,
      rolls: result.rolls,
      totalHits: result.totalHits,
      damageDealt: result.damageDealt,
    }
  );

  // Process damage results
  if (result.damageDealt > 0) {
    // Award ascension marks
    const aDef = getUnitDef(attacker.defId);
    if (aDef && aDef.tier !== 'LEADER') {
      attacker.ascMarks += result.damageDealt;
    }

    // Post-damage trait effects
    applyPostDamageTraits(state, attacker, target, mode, result);
  }

  if (result.targetKilled) {
    handleUnitDeath(state, target, attacker);

    // +1 extra mark for killing blow
    const aDef = getUnitDef(attacker.defId);
    if (aDef && aDef.tier !== 'LEADER') {
      attacker.ascMarks += 1;
    }

    // Post-kill trait effects
    applyPostKillTraits(state, attacker, target, mode);
  }

  return null;
}

function applyPostDamageTraits(state: GameState, attacker: UnitInstance, target: UnitInstance, mode: AttackMode, result: CombatResult): void {
  const aDef = getUnitDef(attacker.defId) || getLeaderDef(attacker.defId);
  if (!aDef) return;

  for (const trait of aDef.traits) {
    if (trait.trigger !== 'ON_AFTER_DAMAGE_APPLIED') continue;
    const c = trait.config as Record<string, any>;

    if (c.requireDamage && result.damageDealt <= 0) continue;
    if (c.mode && c.mode !== mode) continue;

    // Move after damage (Repliegue, Danzante, Hostigador)
    if (c.moveHexes) {
      handlePostDamageMove(state, attacker, c);
    }

    // Self heal (Ghoul)
    if (c.selfHeal && result.damageDealt > 0) {
      const healAmount = Math.min(c.selfHeal, attacker.maxHp - attacker.hp);
      if (healAmount > 0 && canHeal(attacker)) {
        attacker.hp += healAmount;
        addLog(state, 'HEAL', `${getDefName(attacker.defId)} cura ${healAmount} HP (voracidad).`, attacker.ownerPlayerId);
      }
    }

    // Heal block (Presagio, Acólito)
    if (c.appliesHealBlock && result.damageDealt > 0) {
      target.statusEffects.push({
        type: 'HEAL_BLOCKED',
        sourcePlayerId: attacker.ownerPlayerId,
        expiresOnTurnOf: attacker.ownerPlayerId,
      });
      addLog(state, 'DEBUFF', `${getDefName(target.defId)} no puede curar hasta el siguiente turno de ${attacker.ownerPlayerId}.`, attacker.ownerPlayerId);
    }

    // Liche debuff
    if (c.appliesDisadvantageDebuff && result.damageDealt > 0) {
      target.statusEffects.push({
        type: 'NEXT_ATTACK_DISADVANTAGE',
        sourcePlayerId: attacker.ownerPlayerId,
        data: { disadvantageDice: c.disadvantageDice || 1 },
      });
      addLog(state, 'DEBUFF', `${getDefName(target.defId)} sufre desventaja en su próximo ataque.`, attacker.ownerPlayerId);
    }
  }
}

function handlePostDamageMove(state: GameState, unit: UnitInstance, config: Record<string, any>): void {
  // Find a valid adjacent hex to move to
  const neighbors = hexNeighbors(unit.position);
  const cellMap = buildCellMap(state.map.cells);

  for (const n of neighbors) {
    const cell = cellMap.get(`${n.q},${n.r}`);
    if (!cell || cell.terrain === 'WATER') continue;
    if (isHexOccupied(state.units, n)) continue;

    // If ignores engagement, can move even if engaged
    if (!config.ignoresEngagement) {
      // Check if moving to this hex would still keep engagement
      // Standard: can't leave engagement. But this move ignores traba.
    }

    unit.position = n;
    addLog(state, 'MOVE', `${getDefName(unit.defId)} se mueve 1 hex tras ataque.`, unit.ownerPlayerId);
    break;
  }
}

function applyPostKillTraits(state: GameState, attacker: UnitInstance, target: UnitInstance, mode: AttackMode): void {
  const aDef = getUnitDef(attacker.defId) || getLeaderDef(attacker.defId);
  if (!aDef) return;

  for (const trait of aDef.traits) {
    if (trait.trigger !== 'ON_UNIT_KILLED') continue;
    const c = trait.config as Record<string, any>;

    // Estampida: move 1 hex after melee kill
    if (c.moveHexes && (!c.mode || c.mode === mode)) {
      handlePostDamageMove(state, attacker, c);
    }

    // Necrófago: self heal on kill
    if (c.selfHeal) {
      const healAmount = Math.min(c.selfHeal, attacker.maxHp - attacker.hp);
      if (healAmount > 0 && canHeal(attacker)) {
        attacker.hp += healAmount;
        addLog(state, 'HEAL', `${getDefName(attacker.defId)} cura ${healAmount} HP al eliminar.`, attacker.ownerPlayerId);
      }
    }

    // Tirano: heal nearby undead ally
    if (c.healAllyFaction) {
      const allies = state.units.filter(u =>
        u.hp > 0 &&
        u.ownerPlayerId === attacker.ownerPlayerId &&
        u.instanceId !== attacker.instanceId &&
        hexDistance(u.position, attacker.position) <= (c.healRange || 2)
      );
      const undeadAlly = allies.find(a => {
        const d = getUnitDef(a.defId) || getLeaderDef(a.defId);
        return d && d.faction === c.healAllyFaction;
      });
      if (undeadAlly && canHeal(undeadAlly)) {
        const h = Math.min(c.healAmount || 1, undeadAlly.maxHp - undeadAlly.hp);
        if (h > 0) {
          undeadAlly.hp += h;
          addLog(state, 'HEAL', `${getDefName(undeadAlly.defId)} cura ${h} HP (tributo del osario).`, attacker.ownerPlayerId);
        }
      }
    }
  }
}

function handleUnitDeath(state: GameState, unit: UnitInstance, killer: UnitInstance): void {
  addLog(state, 'DEATH', `${getDefName(unit.defId)} eliminado por ${getDefName(killer.defId)}.`, killer.ownerPlayerId);

  // Check if it's a leader death
  const isLeader = LEADERS.some(l => l.id === unit.defId);
  if (isLeader) {
    state.winner = {
      playerId: killer.ownerPlayerId,
      reason: 'LEADER_KILLED',
    };
    state.phase = 'GAME_OVER';
    addLog(state, 'VICTORY', `¡${killer.ownerPlayerId} gana por muerte del líder enemigo!`, killer.ownerPlayerId);
    return;
  }

  // Check for Guardia Ósea remains
  const unitDef = getUnitDef(unit.defId);
  if (unitDef) {
    const remainsTrait = unitDef.traits.find(t => t.config?.leavesRemains);
    if (remainsTrait) {
      state.remainsTokens.push({
        position: { ...unit.position },
        defId: unit.defId,
        ownerPlayerId: unit.ownerPlayerId,
        instanceId: unit.instanceId,
      });
      addLog(state, 'REMAINS', `${getDefName(unit.defId)} deja restos en (${unit.position.q},${unit.position.r}).`, unit.ownerPlayerId);
    }
  }
}

function execRecruit(state: GameState, slotIndex: number, targetHex: HexCoord): string | null {
  const player = getPlayer(state, state.activePlayerId);
  const slot = state.shop.visible[slotIndex]!;
  const unitDef = getUnitDef(slot.unitDefId)!;

  // Pay cost
  player.gold -= unitDef.costGold || 0;
  player.actionsRemaining -= 1;

  // Create unit (exhausted)
  const newUnit = createUnitInstance(slot.unitDefId, state.activePlayerId, targetHex, true);
  state.units.push(newUnit);

  // Replenish shop
  state.shop.visible[slotIndex] = null;
  if (state.shop.deck.length > 0) {
    const newId = state.shop.deck.shift()!;
    state.shop.visible[slotIndex] = {
      unitDefId: newId,
      addedOnRound: state.round,
      slotIndex,
    };
  }

  addLog(state, 'RECRUIT',
    `${state.activePlayerId} recluta ${unitDef.name} por ${unitDef.costGold} oro en (${targetHex.q},${targetHex.r}).`,
    state.activePlayerId
  );

  return null;
}

function execAscend(state: GameState, unitId: string, targetDefId: string): string | null {
  const player = getPlayer(state, state.activePlayerId);
  const unit = state.units.find(u => u.instanceId === unitId)!;
  const oldDef = getUnitDef(unit.defId)!;
  const newDef = getUnitDef(targetDefId)!;

  player.actionsRemaining -= 1;

  // Remove from reserve
  if (newDef.tier === 2) {
    const idx = state.reserve.remainingTier2.indexOf(targetDefId);
    if (idx >= 0) state.reserve.remainingTier2.splice(idx, 1);
  } else if (newDef.tier === 3) {
    const idx = state.reserve.remainingTier3.indexOf(targetDefId);
    if (idx >= 0) state.reserve.remainingTier3.splice(idx, 1);
  }

  // Calculate new HP: conserve damage
  const damageTaken = unit.maxHp - unit.hp;
  const newMaxHp = newDef.maxHp;
  const newHp = Math.max(1, newMaxHp - damageTaken);

  // Update unit
  unit.defId = targetDefId;
  unit.maxHp = newMaxHp;
  unit.hp = newHp;
  unit.ascMarks = 0;

  addLog(state, 'ASCEND',
    `${oldDef.name} asciende a ${newDef.name}. HP: ${newHp}/${newMaxHp}.`,
    state.activePlayerId
  );

  return null;
}

function execBuyExtraAction(state: GameState): string | null {
  const player = getPlayer(state, state.activePlayerId);
  const nth = player.extraActionsPurchasedThisRound + 1;
  const cost = getExtraActionCost(nth);

  player.gold -= cost;
  player.actionsRemaining += 1;
  player.extraActionsPurchasedThisRound += 1;

  addLog(state, 'BUY_ACTION', `${state.activePlayerId} compra acción extra por ${cost} oro.`, state.activePlayerId);
  return null;
}

function execRefreshShop(state: GameState, slotIndex: number): string | null {
  const player = getPlayer(state, state.activePlayerId);
  player.gold -= 1;
  state.shop.refreshUsedThisTurn = true;

  // Put old card at bottom of deck
  const oldSlot = state.shop.visible[slotIndex]!;
  state.shop.deck.push(oldSlot.unitDefId);

  // Draw new card
  if (state.shop.deck.length > 0) {
    const newId = state.shop.deck.shift()!;
    state.shop.visible[slotIndex] = {
      unitDefId: newId,
      addedOnRound: state.round,
      slotIndex,
    };
  } else {
    state.shop.visible[slotIndex] = null;
  }

  addLog(state, 'REFRESH_SHOP', `${state.activePlayerId} refresca slot ${slotIndex} de la tienda.`, state.activePlayerId);
  return null;
}

function execEndActivation(state: GameState, unitId: string): string | null {
  const unit = state.units.find(u => u.instanceId === unitId)!;

  // Cantora: heal if didn't attack
  const unitDef = getUnitDef(unit.defId);
  if (unitDef) {
    for (const trait of unitDef.traits) {
      if (trait.trigger !== 'ON_ACTIVATION_END') continue;
      const c = trait.config as Record<string, any>;

      if (c.requireNoAttack && !unit.attackedThisActivation && c.healAmount && c.targetAlly) {
        // Find adjacent ally to heal
        const allies = getAdjacentAllies(unit, state.units);
        const healTarget = allies.find(a => a.hp < a.maxHp && canHeal(a));
        if (healTarget) {
          const h = Math.min(c.healAmount, healTarget.maxHp - healTarget.hp);
          healTarget.hp += h;
          addLog(state, 'HEAL', `${getDefName(unit.defId)} cura ${h} HP a ${getDefName(healTarget.defId)}.`, unit.ownerPlayerId);
        }
      }
    }
  }

  return null;
}

function execEndTurn(state: GameState): string | null {
  const activeId = state.activePlayerId;
  const players = state.players;

  // Clear turn-specific state
  state.shop.refreshUsedThisTurn = false;

  // If first player just finished, switch to second player
  if (activeId === state.initiativePlayerId) {
    const otherId = players.find(p => p.id !== activeId)!.id;
    state.activePlayerId = otherId;

    const otherPlayer = getPlayer(state, otherId);
    otherPlayer.actionsRemaining = getBaseActions(state.round);
    otherPlayer.extraActionsPurchasedThisRound = 0;

    // Clear heal blocks that expire on this player's turn
    for (const unit of state.units) {
      unit.statusEffects = unit.statusEffects.filter(e =>
        !(e.type === 'HEAL_BLOCKED' && e.expiresOnTurnOf === activeId)
      );
    }

    addLog(state, 'TURN_CHANGE', `Turno de ${otherId}.`, otherId);
  } else {
    // Both players done – end of round
    endRound(state);
  }

  return null;
}

function endRound(state: GameState): void {
  addLog(state, 'ROUND_END', `Fin de ronda ${state.round}.`);
  endRoundPhase_VillageHealing(state);
  endRoundPhase_RemainsRevival(state);
  if (endRoundPhase_CityControl(state)) return; // Game over
  const cityControl = checkCityControl(state);
  endRoundPhase_BlessingAssignment(state, cityControl);
  endRoundPhase_ShopRotation(state);
  endRoundPhase_AdvanceRound(state);
  endRoundPhase_GoldCollection(state);
  endRoundPhase_ResetUnits(state);
  endRoundPhase_SetupFirstPlayerTurn(state);
}

function endRoundPhase_VillageHealing(state: GameState): void {
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    const cell = getCell(state.map, unit.position);
    if (cell && cell.terrain === 'VILLAGE' && unit.hp < unit.maxHp && canHeal(unit)) {
      unit.hp = Math.min(unit.maxHp, unit.hp + 1);
      addLog(state, 'HEAL', `${getDefName(unit.defId)} cura 1 HP en aldea.`, unit.ownerPlayerId);
    }
  }
}

function endRoundPhase_RemainsRevival(state: GameState): void {
  const tokensToRemove: number[] = [];
  for (let i = 0; i < state.remainsTokens.length; i++) {
    const token = state.remainsTokens[i];
    if (!isHexOccupied(state.units, token.position)) {
      const deadUnit = state.units.find(u => u.instanceId === token.instanceId);
      if (deadUnit) {
        deadUnit.hp = 1;
        deadUnit.position = { ...token.position };
        deadUnit.exhausted = true;
        deadUnit.statusEffects = [];
        addLog(state, 'REVIVE', `${getDefName(deadUnit.defId)} revive con 1 HP en (${token.position.q},${token.position.r}).`, deadUnit.ownerPlayerId);
      }
      tokensToRemove.push(i);
    }
  }
  for (let i = tokensToRemove.length - 1; i >= 0; i--) {
    state.remainsTokens.splice(tokensToRemove[i], 1);
  }
}

function endRoundPhase_CityControl(state: GameState): boolean {
  const cityControl = checkCityControl(state);
  if (cityControl.winner) {
    state.winner = { playerId: cityControl.winner, reason: 'CITY_DOMINATION' };
    state.phase = 'GAME_OVER';
    addLog(state, 'VICTORY', `¡${cityControl.winner} gana por dominio de ciudades (${cityControl.counts[cityControl.winner]}/${cityControl.totalCities})!`, cityControl.winner);
    return true;
  }
  return false;
}

function endRoundPhase_BlessingAssignment(state: GameState, cityControl: ReturnType<typeof checkCityControl>): void {
  checkAndAssignBlessing(state, cityControl);
}

function endRoundPhase_ShopRotation(state: GameState): void {
  rotateShop(state);
}

function endRoundPhase_AdvanceRound(state: GameState): void {
  state.round += 1;
  state.cycle = state.round % 2 === 1 ? 'DAY' : 'NIGHT';
}

function endRoundPhase_GoldCollection(state: GameState): void {
  for (const player of state.players) {
    const goldFromVillages = countControlledVillages(state, player.id);
    if (goldFromVillages > 0) {
      player.gold += goldFromVillages;
      addLog(state, 'INCOME', `${player.id} recibe ${goldFromVillages} oro de aldeas.`, player.id);
    }
  }
}

function endRoundPhase_ResetUnits(state: GameState): void {
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

function endRoundPhase_SetupFirstPlayerTurn(state: GameState): void {
  state.activePlayerId = state.initiativePlayerId;
  const firstPlayer = getPlayer(state, state.initiativePlayerId);
  firstPlayer.actionsRemaining = getBaseActions(state.round);
  firstPlayer.extraActionsPurchasedThisRound = 0;
  state.shop.refreshUsedThisTurn = false;
  for (const unit of state.units) {
    unit.statusEffects = unit.statusEffects.filter(e => e.type !== 'HEAL_BLOCKED');
  }
  addLog(state, 'ROUND_START', `Ronda ${state.round} – ${state.cycle === 'DAY' ? 'Día' : 'Noche'}.`);
}

function execPreDraftBuy(state: GameState, slotIndex: number, targetHex: HexCoord): string | null {
  const slot = state.shop.visible[slotIndex]!;
  const unitDef = getUnitDef(slot.unitDefId)!;
  const currentPlayer = state.preDraftCurrentPlayer;

  // Create unit (exhausted, free)
  const newUnit = createUnitInstance(slot.unitDefId, currentPlayer, targetHex, true);
  state.units.push(newUnit);

  // Replenish shop
  state.shop.visible[slotIndex] = null;
  if (state.shop.deck.length > 0) {
    const newId = state.shop.deck.shift()!;
    state.shop.visible[slotIndex] = {
      unitDefId: newId,
      addedOnRound: 0,
      slotIndex,
    };
  }

  state.preDraftPurchasesRemaining -= 1;

  addLog(state, 'PRE_DRAFT', `${currentPlayer} recluta ${unitDef.name} gratis (draft).`, currentPlayer);

  // Alternate: J1, J2, J2, J1
  if (state.preDraftPurchasesRemaining === 3) {
    // Was J1's first pick, now J2 gets 2
    state.preDraftCurrentPlayer = state.players.find(p => p.id !== state.initiativePlayerId)!.id;
  } else if (state.preDraftPurchasesRemaining === 1) {
    // Was J2's second pick, now J1 gets last
    state.preDraftCurrentPlayer = state.initiativePlayerId;
  } else if (state.preDraftPurchasesRemaining === 0) {
    // Draft complete, start playing
    state.phase = 'PLAYING';
    const firstPlayer = getPlayer(state, state.initiativePlayerId);
    firstPlayer.actionsRemaining = getBaseActions(state.round);
    state.activePlayerId = state.initiativePlayerId;
    addLog(state, 'PHASE_CHANGE', 'Draft completado. ¡Comienza la partida!');
  }

  return null;
}

function execUseBlessing(state: GameState, action: { type: 'USE_BLESSING'; unitInstanceId?: string; targetHex?: HexCoord }): string | null {
  const player = getPlayer(state, state.activePlayerId);
  const blessing = player.blessing!;

  switch (blessing.type) {
    case 'FREE_ACTIVATION':
      player.actionsRemaining += 1;
      addLog(state, 'BLESSING', `${player.id} usa Bendición: +1 activación gratis.`, player.id);
      break;
    case 'FREE_RECRUIT':
      // Grant a free recruit action (no action cost)
      player.actionsRemaining += 1;
      addLog(state, 'BLESSING', `${player.id} usa Bendición: reclutamiento gratis.`, player.id);
      break;
    case 'FREE_REFRESH':
      state.shop.refreshUsedThisTurn = false;
      addLog(state, 'BLESSING', `${player.id} usa Bendición: refresh gratis de tienda.`, player.id);
      break;
    case 'GOLD_AND_MOVE': {
      player.gold += blessing.goldAmount || 1;
      if (action.unitInstanceId && action.targetHex) {
        const unit = state.units.find(u => u.instanceId === action.unitInstanceId)!;
        unit.position = action.targetHex;
        addLog(state, 'BLESSING', `${player.id} usa Bendición: +1 oro y mueve ${getDefName(unit.defId)} 1 hex.`, player.id);
      } else {
        addLog(state, 'BLESSING', `${player.id} usa Bendición: +1 oro.`, player.id);
      }
      break;
    }
  }

  blessing.consumed = true;
  return null;
}

// ── Helpers ──

// Deprecated: use getDefinitionName from gameState instead
const getDefName = getDefinitionName;

function canHeal(unit: UnitInstance): boolean {
  return !unit.statusEffects.some(e => e.type === 'HEAL_BLOCKED');
}

interface CityControlResult {
  counts: Record<string, number>;
  totalCities: number;
  winner: string | null;
}

function checkCityControl(state: GameState): CityControlResult {
  const cityCells = state.map.cells.filter(c => c.terrain === 'CITY');
  const totalCities = cityCells.length;
  const counts: Record<string, number> = {};

  for (const player of state.players) {
    counts[player.id] = 0;
  }

  for (const cc of cityCells) {
    const occupant = state.units.find(u =>
      u.hp > 0 && hexEquals(u.position, cc)
    );
    if (occupant) {
      counts[occupant.ownerPlayerId] = (counts[occupant.ownerPlayerId] || 0) + 1;
    }
  }

  // 75% threshold
  const threshold = Math.ceil(totalCities * 0.75);
  let winner: string | null = null;
  for (const [playerId, count] of Object.entries(counts)) {
    if (count >= threshold) {
      winner = playerId;
      break;
    }
  }

  return { counts, totalCities, winner };
}

function checkAndAssignBlessing(state: GameState, cityControl: CityControlResult): void {
  const p1Count = cityControl.counts['PLAYER1'] || 0;
  const p2Count = cityControl.counts['PLAYER2'] || 0;
  const diff = Math.abs(p1Count - p2Count);

  // Clear existing blessings
  for (const player of state.players) {
    player.blessing = null;
  }

  if (diff >= 2) {
    const leaderId = p1Count > p2Count ? 'PLAYER1' : 'PLAYER2';
    const trailingId = leaderId === 'PLAYER1' ? 'PLAYER2' : 'PLAYER1';
    const trailingPlayer = getPlayer(state, trailingId);

    // Roll blessing
    const roll = gameRng.rollD6();
    let blessing: BlessingState;

    if (roll <= 2) {
      blessing = { type: 'FREE_ACTIVATION', consumed: false };
    } else if (roll === 3) {
      blessing = { type: 'FREE_RECRUIT', consumed: false };
    } else if (roll === 4) {
      blessing = { type: 'FREE_REFRESH', consumed: false };
    } else {
      blessing = { type: 'GOLD_AND_MOVE', consumed: false, goldAmount: 1 };
    }

    trailingPlayer.blessing = blessing;
    addLog(state, 'BLESSING',
      `${trailingId} recibe Bendición del Pueblo (tirada: ${roll}): ${describeBlessingType(blessing.type)}.`,
      trailingId
    );
  }
}

function describeBlessingType(type: BlessingState['type']): string {
  switch (type) {
    case 'FREE_ACTIVATION': return '1 activación gratis';
    case 'FREE_RECRUIT': return '1 reclutamiento gratis';
    case 'FREE_REFRESH': return 'refresh gratis de tienda';
    case 'GOLD_AND_MOVE': return '+1 oro y mover 1 unidad 1 hex';
  }
}

function rotateShop(state: GameState): void {
  // Find oldest visible card
  let oldestIdx = -1;
  let oldestRound = Infinity;

  for (let i = 0; i < state.shop.visible.length; i++) {
    const slot = state.shop.visible[i];
    if (slot && slot.addedOnRound < oldestRound) {
      oldestRound = slot.addedOnRound;
      oldestIdx = i;
    }
  }

  if (oldestIdx >= 0) {
    const old = state.shop.visible[oldestIdx]!;
    // Discard the oldest
    state.shop.visible[oldestIdx] = null;

    // Draw replacement if deck has cards
    if (state.shop.deck.length > 0) {
      const newId = state.shop.deck.shift()!;
      state.shop.visible[oldestIdx] = {
        unitDefId: newId,
        addedOnRound: state.round + 1,
        slotIndex: oldestIdx,
      };
    }

    addLog(state, 'SHOP_ROTATE', `Tienda: ${getDefName(old.unitDefId)} rotada.`);
  }
}

function countControlledVillages(state: GameState, playerId: string): number {
  const villageCells = state.map.cells.filter(c => c.terrain === 'VILLAGE');
  let count = 0;
  for (const vc of villageCells) {
    const occupant = state.units.find(u =>
      u.hp > 0 && u.ownerPlayerId === playerId && hexEquals(u.position, vc)
    );
    if (occupant) count++;
  }
  return count;
}

export { canHeal, checkCityControl, countControlledVillages, getDefName };
