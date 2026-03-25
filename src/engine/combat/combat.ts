// ============================================================
// Combat Resolution Engine
// ============================================================

import {
  UnitInstance, AttackMode, DieQuality, DicePool,
  CombatResult, CombatBreakdown, DieFaceResult,
  GameState, HexCell, CyclePhase, UnitDefinition, LeaderDefinition,
} from '../core/types';
import { getUnitDef, getLeaderDef, getUnitOrLeaderDef } from '../../content/units/index';
import { getCell, hasAdjacentEnemy, hexDistance, getAdjacentAllies } from '../map/hex';
import { RngService } from '../rng/rng';

/** Check if a die roll hits based on quality */
export function isHit(roll: number, quality: DieQuality): boolean {
  switch (quality) {
    case 'ADVANTAGE': return roll >= 4;
    case 'NORMAL': return roll >= 5;
    case 'DISADVANTAGE': return roll >= 6;
  }
}

/** Get the unit definition (works for both units and leaders) */
function getDef(defId: string): { meleeDice: number; rangedDice: number; cycleAffinity: string; goodTerrain?: string; badTerrain?: string; faction: string; traits: any[] } {
  const unit = getUnitDef(defId);
  if (unit) return unit;
  const leader = getLeaderDef(defId);
  if (leader) return { ...leader, goodTerrain: undefined, badTerrain: undefined };
  throw new Error(`Unknown def: ${defId}`);
}

/** Build the dice pool for an attack */
export function buildDicePool(
  attacker: UnitInstance,
  target: UnitInstance,
  mode: AttackMode,
  state: GameState,
): { pool: DicePool; breakdown: CombatBreakdown } {
  const aDef = getDef(attacker.defId);

  // Base dice
  const baseDice = mode === 'MELEE' ? aDef.meleeDice : aDef.rangedDice;

  let terrainAdv = 0;
  let terrainDisadv = 0;
  let cycleAdv = 0;
  let cycleDisadv = 0;
  let traitAdv = 0;
  let traitDisadv = 0;

  // Terrain advantage/disadvantage from attacker's position
  const attackerCell = getCell(state.map, attacker.position);
  if (attackerCell && aDef.goodTerrain && attackerCell.terrain === aDef.goodTerrain) {
    terrainAdv += 1;
  }
  if (attackerCell && aDef.badTerrain && attackerCell.terrain === aDef.badTerrain) {
    terrainDisadv += 1;
  }

  // Day/Night cycle
  const aff = aDef.cycleAffinity;
  if (aff === 'SUN') {
    if (state.cycle === 'DAY') cycleAdv += 1;
    else cycleDisadv += 1;
  } else if (aff === 'MOON') {
    if (state.cycle === 'NIGHT') cycleAdv += 1;
    else cycleDisadv += 1;
  }

  // Trait-based modifications
  const traitMods = computeTraitDiceModifiers(attacker, target, mode, state);
  traitAdv += traitMods.advantage;
  traitDisadv += traitMods.disadvantage;

  // Check for debuffs on attacker (e.g., Liche's debuff)
  const debuff = attacker.statusEffects.find(e => e.type === 'NEXT_ATTACK_DISADVANTAGE');
  if (debuff) {
    traitDisadv += (debuff.data?.disadvantageDice as number) || 1;
    // Remove the debuff after applying
    attacker.statusEffects = attacker.statusEffects.filter(e => e !== debuff);
  }

  // Cancel opposing modifiers
  const totalAdv = terrainAdv + cycleAdv + traitAdv;
  const totalDisadv = terrainDisadv + cycleDisadv + traitDisadv;
  const net = totalAdv - totalDisadv;

  // Build the pool: transform existing dice, never create new ones
  const dice: DieQuality[] = Array(baseDice).fill('NORMAL');

  if (net > 0) {
    // Upgrade up to `net` dice to ADVANTAGE
    const toUpgrade = Math.min(net, baseDice);
    for (let i = 0; i < toUpgrade; i++) {
      dice[i] = 'ADVANTAGE';
    }
  } else if (net < 0) {
    // Downgrade up to |net| dice to DISADVANTAGE
    const toDowngrade = Math.min(-net, baseDice);
    for (let i = 0; i < toDowngrade; i++) {
      dice[i] = 'DISADVANTAGE';
    }
  }

  return {
    pool: { dice },
    breakdown: {
      baseDice,
      terrainAdvantage: terrainAdv,
      terrainDisadvantage: terrainDisadv,
      cycleAdvantage: cycleAdv,
      cycleDisadvantage: cycleDisadv,
      traitAdvantage: traitAdv,
      traitDisadvantage: traitDisadv,
      netModifier: net,
    },
  };
}

/** Compute advantage/disadvantage from traits */
function computeTraitDiceModifiers(
  attacker: UnitInstance,
  target: UnitInstance,
  mode: AttackMode,
  state: GameState,
): { advantage: number; disadvantage: number } {
  let advantage = 0;
  let disadvantage = 0;
  const aDef = getDef(attacker.defId);

  for (const trait of aDef.traits) {
    if (trait.trigger !== 'ON_BUILD_ATTACK_DICE_POOL') continue;
    const c = trait.config as Record<string, any>;

    // Mode filter
    if (c.mode && c.mode !== mode) continue;

    // First attack only (per unit)
    if (c.firstAttackOnly && attacker.hasAttackedThisRound) continue;

    // Require no movement
    if (c.requireNoMove && attacker.movedThisActivation) continue;

    // Require minimum hexes moved
    if (c.requireMinHexesMoved && attacker.hexesMovedThisActivation < c.requireMinHexesMoved) continue;

    // Require terrain
    if (c.requireTerrain) {
      const cell = getCell(state.map, attacker.position);
      if (!cell || cell.terrain !== c.requireTerrain) continue;
    }

    // Require terrain OR no move
    if (c.requireTerrainOrNoMove) {
      const cell = getCell(state.map, attacker.position);
      const inTerrain = cell && cell.terrain === c.terrain;
      const noMove = !attacker.movedThisActivation;
      if (!inTerrain && !noMove) continue;
    }

    // Require target damaged
    if (c.requireTargetDamaged && target.hp >= target.maxHp) continue;

    // This is an aura trait (buffs adjacent allies, not self)
    if (c.auraFaction) continue; // Handled separately below

    advantage += c.advantageDice || 0;
    disadvantage += c.disadvantageDice || 0;
  }

  // Check for aura buffs from adjacent allies
  const allies = getAdjacentAllies(attacker, state.units);
  for (const ally of allies) {
    const allyDef = getDef(ally.defId);
    for (const trait of allyDef.traits) {
      if (trait.trigger !== 'ON_BUILD_ATTACK_DICE_POOL') continue;
      const c = trait.config as Record<string, any>;
      if (!c.auraFaction) continue;
      if (aDef.faction !== c.auraFaction) continue;
      if (c.range && hexDistance(attacker.position, ally.position) > c.range) continue;

      // First attack only check for the receiving unit
      if (c.firstAttackOnly && attacker.hasAttackedThisRound) continue;

      // Uses per round for the aura source
      if (c.usesPerRound) {
        const usageKey = `aura_${trait.id}_${attacker.instanceId}`;
        if ((ally.traitUsages[usageKey] || 0) >= c.usesPerRound) continue;
        ally.traitUsages[usageKey] = (ally.traitUsages[usageKey] || 0) + 1;
      }

      advantage += c.advantageDice || 0;
    }
  }

  // Check for leader aura (sendero antiguo for elf leader)
  // This is handled above through the generic aura system

  return { advantage, disadvantage };
}

/** Resolve combat: roll dice and compute damage */
export function resolveCombat(
  attacker: UnitInstance,
  target: UnitInstance,
  mode: AttackMode,
  state: GameState,
  rng: RngService,
): CombatResult {
  const { pool, breakdown } = buildDicePool(attacker, target, mode, state);

  const rolls = rng.rollMultipleD6(pool.dice.length);
  const results: DieFaceResult[] = rolls.map((roll, i) =>
    isHit(roll, pool.dice[i]) ? 'HIT' : 'MISS'
  );

  const totalHits = results.filter(r => r === 'HIT').length;

  // Apply damage reduction
  let damageDealt = totalHits;

  // Check target's damage reduction traits
  const tDef = getDef(target.defId);
  for (const trait of tDef.traits) {
    if (trait.trigger !== 'ON_DAMAGE_RECEIVED') continue;
    const c = trait.config as Record<string, any>;

    if (c.damageReduction && c.perRound && target.damageReductionThisRound < c.damageReduction) {
      // Check terrain requirement
      if (c.requireTerrain) {
        const cell = getCell(state.map, target.position);
        if (!cell || !c.requireTerrain.includes(cell.terrain)) continue;
      }
      const reduction = Math.min(c.damageReduction - target.damageReductionThisRound, damageDealt);
      damageDealt -= reduction;
      target.damageReductionThisRound += reduction;
    }
  }

  // Apply damage
  target.hp = Math.max(0, target.hp - damageDealt);
  const targetKilled = target.hp <= 0;

  return {
    attackerInstanceId: attacker.instanceId,
    targetInstanceId: target.instanceId,
    mode,
    dicePool: pool,
    rolls,
    results,
    totalHits,
    damageDealt,
    targetKilled,
    breakdown,
  };
}

/** Check if a unit can attack with a given mode */
export function canAttack(
  attacker: UnitInstance,
  target: UnitInstance,
  mode: AttackMode,
  state: GameState,
): { valid: boolean; reason?: string } {
  const aDef = getDef(attacker.defId);
  const dist = hexDistance(attacker.position, target.position);

  if (mode === 'MELEE') {
    if (aDef.meleeDice <= 0) return { valid: false, reason: 'No tiene dados de melee.' };
    if (dist !== 1) return { valid: false, reason: 'El objetivo no es adyacente.' };
  }

  if (mode === 'RANGED') {
    if (aDef.rangedDice <= 0) return { valid: false, reason: 'No tiene dados de ranged.' };
    if (dist < 1 || dist > 3) return { valid: false, reason: 'Fuera de alcance ranged (1-3).' };
    if (hasAdjacentEnemy(attacker, state.units)) {
      return { valid: false, reason: 'No puede disparar con enemigo adyacente (trabado).' };
    }
  }

  if (attacker.ownerPlayerId === target.ownerPlayerId) {
    return { valid: false, reason: 'No puede atacar aliados.' };
  }

  if (target.hp <= 0) {
    return { valid: false, reason: 'El objetivo ya está eliminado.' };
  }

  return { valid: true };
}
