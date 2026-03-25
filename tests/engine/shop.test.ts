import { describe, it, expect } from 'vitest';
import { createGameState, createShop, getPlayer } from '../../src/engine/state/gameState';
import { executeAction, setGameRng } from '../../src/engine/actions/executor';
import { validateAction } from '../../src/engine/rules/validation';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { createRng } from '../../src/engine/rng/rng';
import { GameState } from '../../src/engine/core/types';

function makePlayableState(): GameState {
  const state = createGameState(ALL_MAPS[0], 'HUMAN', 'ORC', 42);
  state.phase = 'PLAYING';
  state.activePlayerId = 'PLAYER1';
  const p = getPlayer(state, 'PLAYER1');
  p.actionsRemaining = 5;
  p.gold = 20;
  setGameRng(createRng(42));
  return state;
}

describe('Shop', () => {
  it('starts with 4 visible slots', () => {
    const rng = createRng(42);
    const shop = createShop(rng);
    expect(shop.visible.filter(s => s !== null).length).toBe(4);
  });

  it('buying replenishes slot from deck', () => {
    const state = makePlayableState();
    const deckSizeBefore = state.shop.deck.length;
    const slot0 = state.shop.visible[0]!;

    // Find an available spawn hex
    const spawnHex = state.map.spawnZones.PLAYER1.find(h =>
      !state.units.some(u => u.hp > 0 && u.position.q === h.q && u.position.r === h.r)
    )!;

    executeAction(state, { type: 'RECRUIT', shopSlotIndex: 0, targetHex: spawnHex });

    // Slot should be replenished
    if (deckSizeBefore > 0) {
      expect(state.shop.visible[0]).not.toBeNull();
      expect(state.shop.deck.length).toBe(deckSizeBefore - 1);
    }
  });

  it('refresh costs 1 gold and only works once per turn', () => {
    const state = makePlayableState();
    const p = getPlayer(state, 'PLAYER1');
    const goldBefore = p.gold;

    executeAction(state, { type: 'REFRESH_SHOP', slotIndex: 0 });

    expect(p.gold).toBe(goldBefore - 1);
    expect(state.shop.refreshUsedThisTurn).toBe(true);

    // Second refresh should fail
    const result = validateAction(state, { type: 'REFRESH_SHOP', slotIndex: 1 });
    expect(result.valid).toBe(false);
  });

  it('empty deck leaves empty slots', () => {
    const state = makePlayableState();
    // Empty the deck
    state.shop.deck = [];

    const spawnHex = state.map.spawnZones.PLAYER1.find(h =>
      !state.units.some(u => u.hp > 0 && u.position.q === h.q && u.position.r === h.r)
    )!;

    executeAction(state, { type: 'RECRUIT', shopSlotIndex: 0, targetHex: spawnHex });

    // Slot should be null now
    expect(state.shop.visible[0]).toBeNull();
  });
});
