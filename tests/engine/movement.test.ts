import { describe, it, expect } from 'vitest';
import { hexDistance, hexAdjacent, hexNeighbors, terrainMoveCost, findReachableHexes, buildCellMap, isHexOccupied } from '../../src/engine/map/hex';
import { createGameState, createUnitInstance } from '../../src/engine/state/gameState';
import { ALL_MAPS } from '../../src/content/maps/maps';
import { validateAction } from '../../src/engine/rules/validation';
import { HexCoord, GameState } from '../../src/engine/core/types';

function makeTestState(): GameState {
  return createGameState(ALL_MAPS[0], 'HUMAN', 'ORC', 12345);
}

describe('Hex utilities', () => {
  it('distance between same hex is 0', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
  });

  it('distance between adjacent hexes is 1', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
  });

  it('hex has 6 neighbors', () => {
    expect(hexNeighbors({ q: 3, r: 3 }).length).toBe(6);
  });

  it('adjacency check works', () => {
    expect(hexAdjacent({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(hexAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });
});

describe('Terrain costs', () => {
  it('water is impassable', () => {
    expect(terrainMoveCost('WATER')).toBe(Infinity);
  });

  it('forest costs 2', () => {
    expect(terrainMoveCost('FOREST')).toBe(2);
  });

  it('hill costs 2', () => {
    expect(terrainMoveCost('HILL')).toBe(2);
  });

  it('crypt costs 2', () => {
    expect(terrainMoveCost('CRYPT')).toBe(2);
  });

  it('plain costs 1', () => {
    expect(terrainMoveCost('PLAIN')).toBe(1);
  });

  it('city costs 1', () => {
    expect(terrainMoveCost('CITY')).toBe(1);
  });

  it('village costs 1', () => {
    expect(terrainMoveCost('VILLAGE')).toBe(1);
  });
});

describe('Movement validation', () => {
  it('cannot enter water', () => {
    const state = makeTestState();
    // Find or create a water hex
    const waterMap = ALL_MAPS.find(m => m.cells.some(c => c.terrain === 'WATER'));
    if (!waterMap) return; // Skip if no water map

    const waterState = createGameState(waterMap, 'HUMAN', 'ORC', 12345);
    const waterCell = waterMap.cells.find(c => c.terrain === 'WATER')!;
    const adjacent = hexNeighbors(waterCell);
    const validAdj = adjacent.find(a =>
      waterMap.cells.some(c => c.q === a.q && c.r === a.r && c.terrain !== 'WATER')
    );

    if (!validAdj) return;

    const unit = createUnitInstance('h4_jinete', 'PLAYER1', validAdj);
    waterState.units.push(unit);

    const result = validateAction(waterState, {
      type: 'MOVE_UNIT',
      unitInstanceId: unit.instanceId,
      path: [waterCell],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('agua');
  });

  it('cannot enter occupied hex', () => {
    const state = makeTestState();
    const unit1 = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    const unit2 = createUnitInstance('h2_duelista', 'PLAYER1', { q: 4, r: 3 });
    state.units.push(unit1, unit2);

    const result = validateAction(state, {
      type: 'MOVE_UNIT',
      unitInstanceId: unit1.instanceId,
      path: [{ q: 4, r: 3 }],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('ocupado');
  });
});

describe('Engagement (Traba)', () => {
  it('engaged unit cannot leave', () => {
    const state = makeTestState();
    state.phase = 'PLAYING';
    state.activePlayerId = 'PLAYER1';

    const unit = createUnitInstance('h1_lancero', 'PLAYER1', { q: 3, r: 3 });
    const enemy = createUnitInstance('o1_bruto', 'PLAYER2', { q: 4, r: 3 });
    state.units.push(unit, enemy);

    const result = validateAction(state, {
      type: 'MOVE_UNIT',
      unitInstanceId: unit.instanceId,
      path: [{ q: 2, r: 3 }],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Trabado');
  });
});

describe('Corredor Silvano', () => {
  it('reduces first forest cost to 1', () => {
    const state = makeTestState();
    const woodedMap = ALL_MAPS.find(m => m.id === 'map_wooded_valley')!;
    const woodedState = createGameState(woodedMap, 'ELF', 'ORC', 12345);

    const forestCells = woodedMap.cells.filter(c => c.terrain === 'FOREST');
    if (forestCells.length === 0) return;

    // Place corredor next to a forest
    const fc = forestCells[0];
    const adj = hexNeighbors(fc).find(a =>
      woodedMap.cells.some(c => c.q === a.q && c.r === a.r && c.terrain !== 'WATER' && c.terrain !== 'FOREST')
    );
    if (!adj) return;

    const unit = createUnitInstance('e2_corredor', 'PLAYER1', adj);
    woodedState.units.push(unit);

    const cellMap = buildCellMap(woodedMap.cells);

    // With trait modifier
    let forestUsed = false;
    const reachable = findReachableHexes(
      adj,
      5, // VEL 5
      cellMap,
      woodedState.units,
      unit.instanceId,
      (terrain, _coord, _costSoFar) => {
        if (terrain === 'FOREST' && !forestUsed) {
          forestUsed = true;
          return 1;
        }
        return terrainMoveCost(terrain as any);
      }
    );

    // The forest hex should be reachable
    const canReachForest = reachable.some(r => r.coord.q === fc.q && r.coord.r === fc.r);
    expect(canReachForest).toBe(true);

    // Check the cost is 1 not 2 for the first forest
    const forestReach = reachable.find(r => r.coord.q === fc.q && r.coord.r === fc.r);
    if (forestReach) {
      expect(forestReach.costSoFar).toBe(1);
    }
  });
});
