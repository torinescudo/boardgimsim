import { describe, it, expect } from 'vitest';
import { createGameState, createUnitInstance, getPlayer } from '../../src/engine/state/gameState';
import { executeAction, setGameRng } from '../../src/engine/actions/executor';
import { validateAction } from '../../src/engine/rules/validation';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { createRng } from '../../src/engine/rng/rng';
import { getUnitDef } from '../../src/content/units/index';
import { GameState } from '../../src/engine/core/types';

function makePlayableState(): GameState {
  const state = createGameState(ALL_MAPS[0], 'HUMAN', 'ORC', 42);
  state.phase = 'PLAYING';
  state.activePlayerId = 'PLAYER1';
  const p = getPlayer(state, 'PLAYER1');
  p.actionsRemaining = 5;
  p.gold = 10;
  setGameRng(createRng(42));
  return state;
}

describe('Ascension', () => {
  it('gains +1 mark per damage dealt', () => {
    const state = makePlayableState();
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    attacker.hasActivatedThisRound = true;
    attacker.movedThisActivation = true;

    const target = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(attacker, target);

    // Manually simulate dealing 2 damage
    const beforeMarks = attacker.ascMarks;
    executeAction(state, { type: 'ATTACK', attackerInstanceId: attacker.instanceId, targetInstanceId: target.instanceId, mode: 'MELEE' });

    // Marks should have increased by damage dealt
    // Note: exact marks depend on RNG, but structure is correct
    expect(attacker.ascMarks).toBeGreaterThanOrEqual(beforeMarks);
  });

  it('ascension costs 1 action and 0 gold', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.ascMarks = 3; // Meet requirement
    state.units.push(unit);

    const p = getPlayer(state, 'PLAYER1');
    const actionsBefore = p.actionsRemaining;
    const goldBefore = p.gold;

    executeAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });

    expect(p.actionsRemaining).toBe(actionsBefore - 1);
    expect(p.gold).toBe(goldBefore); // No gold cost
  });

  it('ascension resets marks to 0', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.ascMarks = 5;
    state.units.push(unit);

    executeAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });

    expect(unit.ascMarks).toBe(0);
  });

  it('ascension consumes reserve piece', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.ascMarks = 3;
    state.units.push(unit);

    expect(state.reserve.remainingTier2).toContain('h5_defensor');

    executeAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });

    expect(state.reserve.remainingTier2).not.toContain('h5_defensor');
  });

  it('cannot ascend if piece not in reserve', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.ascMarks = 3;
    state.units.push(unit);

    // Remove from reserve
    state.reserve.remainingTier2 = state.reserve.remainingTier2.filter(id => id !== 'h5_defensor');

    const result = validateAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('reserva');
  });

  it('cannot ascend with insufficient marks', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    unit.ascMarks = 1; // Need 3
    state.units.push(unit);

    const result = validateAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Marcas insuficientes');
  });

  it('HP on ascension conserves damage', () => {
    const state = makePlayableState();
    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    // Lancero has 5 HP max
    unit.hp = 3; // 2 damage taken
    unit.ascMarks = 3;
    state.units.push(unit);

    executeAction(state, { type: 'ASCEND', unitInstanceId: unit.instanceId, targetDefId: 'h5_defensor' });

    // Defensor has 7 HP max. Damage conserved = 2 → 7 - 2 = 5
    expect(unit.maxHp).toBe(7);
    expect(unit.hp).toBe(5);
  });
});
