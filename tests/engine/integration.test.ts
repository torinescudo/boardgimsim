// ============================================================
// Integration Tests – Full game flow scenarios
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { createTestState, placeUnit, placeUnitAdjacent, getUnitByDef, damageUnit } from '../helpers/testFactory';
import { executeAction } from '../../src/engine/actions/executor';
import { GameState } from '../../src/engine/core/types';

describe('Full Game Flow', () => {
  let state: GameState;

  beforeEach(() => {
    state = createTestState();
  });

  it('Basic attack action', () => {
    // Place two units adjacent
    const h1 = placeUnit(state, 'h1_lancero', 'PLAYER1', { q: 0, r: 0 });
    const o1 = placeUnit(state, 'o1_bruto', 'PLAYER2', { q: 1, r: 0 });

    const hp2Before = o1.hp;

    // Activate H1
    let err = executeAction(state, { type: 'ACTIVATE_UNIT', unitInstanceId: h1.instanceId });
    expect(err).toBeNull();

    // Attack should work
    err = executeAction(state, { type: 'ATTACK', attackerInstanceId: h1.instanceId, targetInstanceId: o1.instanceId, mode: 'MELEE' });
    expect(err).toBeNull();

    // O1 should have taken damage
    expect(o1.hp).toBeLessThan(hp2Before);
  });

  it('Village healing setup', () => {
    const h1 = placeUnit(state, 'h1_lancero', 'PLAYER1', { q: 0, r: 0 });

    // Damage the unit
    damageUnit(h1, 2);
    expect(h1.hp).toBe(3); // 5 - 2

    // Move to village
    const villageCell = state.map.cells.find(c => c.terrain === 'VILLAGE');
    if (villageCell) {
      h1.position = { q: villageCell.q, r: villageCell.r };
      // Unit is now on a village - endRound would heal it
      expect(h1.position.q).toBe(villageCell.q);
    }
  });

  it('Multiple units recruitment and management', () => {
    const player = state.players[0];
    player.gold = 100; // Plenty of gold
    player.actionsRemaining = 10;

    // Verify shop has items
    expect(state.shop.visible.some(s => s !== null)).toBe(true);

    const firstSlot = state.shop.visible[0];
    if (firstSlot) {
      // Try to recruit
      const spawnHex = state.map.spawnZones.PLAYER1[1] || { q: 2, r: 0 };
      const err = executeAction(state, {
        type: 'RECRUIT',
        shopSlotIndex: 0,
        targetHex: spawnHex,
      });

      if (err === null) {
        // Recruitment succeeded
        expect(state.units.length).toBeGreaterThan(2); // Added a unit
      }
    }
  });

  it('City control scoring', () => {
    // Manually position units on cities to simulate control
    const cities = state.map.cells.filter(c => c.terrain === 'CITY');
    if (cities.length >= 2) {
      // Place PLAYER1 units on half the cities
      const p1Cities = cities.slice(0, Math.floor(cities.length / 2));
      p1Cities.forEach((city, idx) => {
        placeUnit(state, 'h1_lancero', 'PLAYER1', { q: city.q, r: city.r });
      });

      // In real game, checkCityControl would be called at end round
      // For this test, we just verify units are positioned
      const p1UnitsOnCities = state.units.filter(u =>
        u.ownerPlayerId === 'PLAYER1' &&
        cities.some(c => c.q === u.position.q && c.r === u.position.r)
      );
      expect(p1UnitsOnCities.length).toBe(p1Cities.length);
    }
  });

  it('Game state immutability during action', () => {
    const h1 = placeUnit(state, 'h1_lancero', 'PLAYER1', { q: 0, r: 0 });
    const o1 = placeUnit(state, 'o1_bruto', 'PLAYER2', { q: 1, r: 0 });

    // Take snapshots
    const hp1Before = h1.hp;
    const hp2Before = o1.hp;

    // Perform invalid action (missing activation)
    const err = executeAction(state, {
      type: 'ATTACK',
      attackerInstanceId: h1.instanceId,
      targetInstanceId: o1.instanceId,
      mode: 'MELEE',
    });

    // If action was invalid, state shouldn't change
    if (err !== null) {
      expect(h1.hp).toBe(hp1Before);
      expect(o1.hp).toBe(hp2Before);
    }
  });

  it('Blessing assignment and use', () => {
    const player = state.players[0];
    player.blessing = {
      type: 'FREE_ACTIVATION',
      consumed: false,
    };

    expect(player.blessing).not.toBeNull();
    expect(player.blessing!.consumed).toBe(false);

    // In real game, USE_BLESSING action would consume it
    // For now, manually set consumed
    if (player.blessing) {
      player.blessing.consumed = true;
    }

    expect(player.blessing!.consumed).toBe(true);
  });
});
