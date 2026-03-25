import { describe, it, expect } from 'vitest';
import { createGameState, createUnitInstance, getPlayer } from '../../src/engine/state/gameState';
import { executeAction, setGameRng, canHeal } from '../../src/engine/actions/executor';
import { buildDicePool } from '../../src/engine/combat/combat';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { createRng } from '../../src/engine/rng/rng';
import { GameState } from '../../src/engine/core/types';

function makePlayableState(): GameState {
  const state = createGameState(ALL_MAPS[0], 'HUMAN', 'ORC', 42);
  state.phase = 'PLAYING';
  state.activePlayerId = 'PLAYER1';
  const p = getPlayer(state, 'PLAYER1');
  p.actionsRemaining = 10;
  p.gold = 50;
  setGameRng(createRng(42));
  return state;
}

describe('Trait: Guardia cerrada (no move → advantage)', () => {
  it('gives advantage when not moved', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.movedThisActivation = false;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'MELEE', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });

  it('does not give advantage when moved', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.movedThisActivation = true;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'MELEE', state);
    expect(breakdown.traitAdvantage).toBe(0);
  });
});

describe('Trait: Carga (3+ hexes → advantage)', () => {
  it('gives advantage after 3+ hex move', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h4_jinete', 'PLAYER1', { q: 3, r: 3 });
    unit.hexesMovedThisActivation = 3;
    unit.movedThisActivation = true;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'MELEE', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });
});

describe('Trait: Embestida orco (2+ hexes → advantage)', () => {
  it('gives advantage after 2+ hex move', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('o4_jinete_chatarra', 'PLAYER2', { q: 3, r: 3 });
    unit.hexesMovedThisActivation = 2;
    unit.movedThisActivation = true;
    const target = createUnitInstance('h1_lancero', 'PLAYER1', { q: 4, r: 3 });
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'MELEE', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });
});

describe('Trait: Contra dañado (target damaged → advantage)', () => {
  it('Tirador Pálido gets advantage vs damaged target', () => {
    const state = makePlayableState();
    state.cycle = 'NIGHT'; // MOON affinity bonus
    const unit = createUnitInstance('n7_tirador', 'PLAYER2', { q: 3, r: 3 });
    unit.movedThisActivation = true;
    const target = createUnitInstance('h1_lancero', 'PLAYER1', { q: 5, r: 3 });
    target.hp = target.maxHp - 1; // Damaged
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'RANGED', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });

  it('does not get advantage vs full HP target', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('n7_tirador', 'PLAYER2', { q: 3, r: 3 });
    unit.movedThisActivation = true;
    const target = createUnitInstance('h1_lancero', 'PLAYER1', { q: 5, r: 3 });
    // target.hp is already maxHp
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'RANGED', state);
    // Trait advantage should be 0 since target is not damaged
    expect(breakdown.traitAdvantage).toBe(0);
  });
});

describe('Trait: Puesto fijo (ballestero no move → ranged advantage)', () => {
  it('gives ranged advantage when not moved', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h3_ballestero', 'PLAYER1', { q: 3, r: 3 });
    unit.movedThisActivation = false;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 5, r: 3 });
    state.units.push(unit, target);

    const { breakdown } = buildDicePool(unit, target, 'RANGED', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });
});

describe('Heal blocking', () => {
  it('heal-blocked unit cannot heal', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('o1_bruto', 'PLAYER2', { q: 3, r: 3 });
    unit.statusEffects.push({
      type: 'HEAL_BLOCKED',
      sourcePlayerId: 'PLAYER1',
      expiresOnTurnOf: 'PLAYER1',
    });

    expect(canHeal(unit)).toBe(false);
  });

  it('unit without heal block can heal', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('o1_bruto', 'PLAYER2', { q: 3, r: 3 });

    expect(canHeal(unit)).toBe(true);
  });
});

describe('Trait: Abanderado aura', () => {
  it('gives advantage to adjacent human ally first attack', () => {
    const state = makePlayableState();
    state.cycle = 'DAY';

    // Place abanderado and a human ally adjacent
    const abanderado = createUnitInstance('h6_abanderado', 'PLAYER1', { q: 3, r: 3 });
    const ally = createUnitInstance('h1_lancero', 'PLAYER1', { q: 4, r: 3 });
    ally.movedThisActivation = true; // Suppress guardia cerrada
    ally.hasAttackedThisRound = false;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 5, r: 3 });
    state.units.push(abanderado, ally, target);

    const { breakdown } = buildDicePool(ally, target, 'MELEE', state);
    // Should have aura advantage from abanderado
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });
});

describe('Trait: Estandarte de Guerra aura', () => {
  it('gives advantage to adjacent orc ally first attack', () => {
    const state = makePlayableState();
    state.cycle = 'NIGHT';

    const estandarte = createUnitInstance('o7_estandarte', 'PLAYER2', { q: 3, r: 3 });
    const ally = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    ally.movedThisActivation = true;
    ally.hasAttackedThisRound = false;
    const target = createUnitInstance('h1_lancero', 'PLAYER1', { q: 5, r: 3 });
    state.units.push(estandarte, ally, target);

    const { breakdown } = buildDicePool(ally, target, 'MELEE', state);
    expect(breakdown.traitAdvantage).toBeGreaterThanOrEqual(1);
  });
});
