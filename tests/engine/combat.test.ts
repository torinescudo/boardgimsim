import { describe, it, expect } from 'vitest';
import { isHit, buildDicePool, resolveCombat, canAttack } from '../../src/engine/combat/combat';
import { createGameState, createUnitInstance } from '../../src/engine/state/gameState';
import { createRng, RngService } from '../../src/engine/rng/rng';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { GameState, UnitInstance, HexCoord, DieQuality } from '../../src/engine/core/types';

function makeTestState(): GameState {
  const map = ALL_MAPS[0]; // Open field
  return createGameState(map, 'HUMAN', 'ORC', 12345);
}

describe('Dice mechanics', () => {
  it('ADVANTAGE hits on 4, 5, 6', () => {
    expect(isHit(4, 'ADVANTAGE')).toBe(true);
    expect(isHit(5, 'ADVANTAGE')).toBe(true);
    expect(isHit(6, 'ADVANTAGE')).toBe(true);
    expect(isHit(3, 'ADVANTAGE')).toBe(false);
    expect(isHit(1, 'ADVANTAGE')).toBe(false);
  });

  it('NORMAL hits on 5, 6', () => {
    expect(isHit(5, 'NORMAL')).toBe(true);
    expect(isHit(6, 'NORMAL')).toBe(true);
    expect(isHit(4, 'NORMAL')).toBe(false);
    expect(isHit(1, 'NORMAL')).toBe(false);
  });

  it('DISADVANTAGE hits only on 6', () => {
    expect(isHit(6, 'DISADVANTAGE')).toBe(true);
    expect(isHit(5, 'DISADVANTAGE')).toBe(false);
    expect(isHit(4, 'DISADVANTAGE')).toBe(false);
  });
});

describe('Dice pool building', () => {
  it('never creates additional dice beyond base', () => {
    const state = makeTestState();
    // Create a unit with M1 and give it 3 advantages somehow
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    attacker.movedThisActivation = false; // Guardia cerrada active
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(attacker, target);

    const { pool } = buildDicePool(attacker, target, 'MELEE', state);
    // M2 base for lancero
    expect(pool.dice.length).toBe(2);
    // All dice should be some quality, never more than 2
    expect(pool.dice.every(d => ['ADVANTAGE', 'NORMAL', 'DISADVANTAGE'].includes(d))).toBe(true);
  });

  it('advantages and disadvantages cancel out', () => {
    // Use wooded valley which has forest cells
    const map = ALL_MAPS.find(m => m.id === 'map_wooded_valley')!;
    const state = createGameState(map, 'HUMAN', 'ORC', 12345);
    state.cycle = 'NIGHT'; // SUN affinity gets disadvantage

    // h1_lancero: SUN affinity, goodTerrain CITY, badTerrain FOREST
    // Place on FOREST (bad terrain) during NIGHT (bad cycle for SUN)
    // That's 2 disadvantages
    const forestCell = state.map.cells.find(c => c.terrain === 'FOREST')!;
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1',
      { q: forestCell.q, r: forestCell.r }
    );
    attacker.movedThisActivation = false; // +1 advantage from trait

    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: forestCell.q + 1, r: forestCell.r });
    state.units.push(attacker, target);

    const { pool, breakdown } = buildDicePool(attacker, target, 'MELEE', state);

    // Base: 2 dice
    // Trait: +1 advantage (guardia cerrada, no move)
    // Bad terrain (forest): +1 disadvantage
    // Night + SUN: +1 disadvantage
    // Net: 1 adv - 2 disadv = -1 → 1 disadvantage die, 1 normal
    expect(pool.dice.length).toBe(2);
    // At least one should be disadvantage
    const hasDisadv = pool.dice.some(d => d === 'DISADVANTAGE');
    expect(hasDisadv).toBe(true);
  });

  it('terrain good gives advantage', () => {
    const state = makeTestState();
    state.cycle = 'DAY';

    // h1_lancero good terrain = CITY
    const cityCell = state.map.cells.find(c => c.terrain === 'CITY')!;
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: cityCell.q, r: cityCell.r });
    attacker.movedThisActivation = true; // No guardia cerrada

    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: cityCell.q + 1, r: cityCell.r });
    state.units.push(attacker, target);

    const { breakdown } = buildDicePool(attacker, target, 'MELEE', state);
    expect(breakdown.terrainAdvantage).toBe(1);
  });

  it('terrain bad gives disadvantage', () => {
    const state = makeTestState();
    state.cycle = 'DAY';

    const forestCells = state.map.cells.filter(c => c.terrain === 'FOREST');
    if (forestCells.length === 0) return; // Skip if no forest on this map

    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: forestCells[0].q, r: forestCells[0].r });
    attacker.movedThisActivation = true;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: forestCells[0].q + 1, r: forestCells[0].r });
    state.units.push(attacker, target);

    const { breakdown } = buildDicePool(attacker, target, 'MELEE', state);
    expect(breakdown.terrainDisadvantage).toBe(1);
  });

  it('day/night cycle affects SUN units', () => {
    const state = makeTestState();
    state.cycle = 'DAY';

    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    attacker.movedThisActivation = true;
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(attacker, target);

    const { breakdown: dayBreak } = buildDicePool(attacker, target, 'MELEE', state);
    expect(dayBreak.cycleAdvantage).toBe(1);
    expect(dayBreak.cycleDisadvantage).toBe(0);

    state.cycle = 'NIGHT';
    const { breakdown: nightBreak } = buildDicePool(attacker, target, 'MELEE', state);
    expect(nightBreak.cycleAdvantage).toBe(0);
    expect(nightBreak.cycleDisadvantage).toBe(1);
  });

  it('day/night cycle affects MOON units', () => {
    const state = makeTestState();
    state.cycle = 'NIGHT';

    const attacker = createUnitInstance('o1_bruto', 'PLAYER2', { q: 3, r: 3 });
    attacker.movedThisActivation = true;
    const target = createUnitInstance('h1_lancero', 'PLAYER1', { q: 4, r: 3 });
    state.units.push(attacker, target);

    const { breakdown } = buildDicePool(attacker, target, 'MELEE', state);
    expect(breakdown.cycleAdvantage).toBe(1);
  });
});

describe('Combat validation', () => {
  it('ranged cannot fire with adjacent enemy', () => {
    const state = makeTestState();
    const attacker = createUnitInstance('h3_ballestero', 'PLAYER1', { q: 3, r: 3 });
    const enemy = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    const farTarget = createUnitInstance('o2_saqueador', 'PLAYER2', { q: 6, r: 3 });
    state.units.push(attacker, enemy, farTarget);

    const result = canAttack(attacker, farTarget, 'RANGED', state);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('adyacente');
  });

  it('melee requires adjacency', () => {
    const state = makeTestState();
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 6, r: 3 });
    state.units.push(attacker, target);

    const result = canAttack(attacker, target, 'MELEE', state);
    expect(result.valid).toBe(false);
  });

  it('cannot attack allies', () => {
    const state = makeTestState();
    const a = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    const b = createUnitInstance('h2_duelista', 'PLAYER1', { q: 4, r: 3 });
    state.units.push(a, b);

    const result = canAttack(a, b, 'MELEE', state);
    expect(result.valid).toBe(false);
  });
});
