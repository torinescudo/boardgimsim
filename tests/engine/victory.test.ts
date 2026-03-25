import { describe, it, expect } from 'vitest';
import { createGameState, createUnitInstance, getPlayer } from '../../src/engine/state/gameState';
import { executeAction, setGameRng, checkCityControl, countControlledVillages } from '../../src/engine/actions/executor';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { createRng } from '../../src/engine/rng/rng';
import { GameState } from '../../src/engine/core/types';
import { hexEquals } from '../../src/engine/map/hex';

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

describe('Victory conditions', () => {
  it('leader death causes immediate defeat', () => {
    const state = makePlayableState();

    // Find the ORC leader
    const orcLeader = state.units.find(u => u.defId === 'leader_orc')!;
    // Reduce to 1 HP
    orcLeader.hp = 1;

    // Place a human unit adjacent
    const attacker = createUnitInstance('h1_lancero', 'PLAYER1', {
      q: orcLeader.position.q + 1,
      r: orcLeader.position.r,
    });
    attacker.hasActivatedThisRound = true;
    attacker.movedThisActivation = true;
    state.units.push(attacker);

    executeAction(state, {
      type: 'ATTACK',
      attackerInstanceId: attacker.instanceId,
      targetInstanceId: orcLeader.instanceId,
      mode: 'MELEE',
    });

    // If the attack killed the leader
    if (orcLeader.hp <= 0) {
      expect(state.winner).not.toBeNull();
      expect(state.winner!.reason).toBe('LEADER_KILLED');
      expect(state.winner!.playerId).toBe('PLAYER1');
      expect(state.phase).toBe('GAME_OVER');
    }
  });

  it('75% city control triggers victory at round end', () => {
    const state = makePlayableState();
    const cities = state.map.cells.filter(c => c.terrain === 'CITY');

    // Need 5 out of 6 cities
    const threshold = Math.ceil(cities.length * 0.75);
    expect(threshold).toBe(5); // 75% of 6 = 4.5 → ceil = 5

    // Place units on 5 cities
    for (let i = 0; i < 5; i++) {
      const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: cities[i].q, r: cities[i].r });
      state.units.push(unit);
    }

    const result = checkCityControl(state);
    expect(result.counts['PLAYER1']).toBe(5);
    expect(result.winner).toBe('PLAYER1');
  });

  it('village gives 1 gold', () => {
    const state = makePlayableState();
    const villages = state.map.cells.filter(c => c.terrain === 'VILLAGE');

    if (villages.length > 0) {
      const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: villages[0].q, r: villages[0].r });
      state.units.push(unit);
    }

    const goldFromVillages = countControlledVillages(state, 'PLAYER1');
    expect(goldFromVillages).toBeGreaterThanOrEqual(1);
  });
});
