// ============================================================
// Hex Grid Utilities – Axial coordinates (q, r)
// ============================================================

import { HexCoord, HexCell, TerrainType, MapDefinition, UnitInstance } from '../core/types';

/** Convert axial to cube */
export function axialToCube(h: HexCoord): { x: number; y: number; z: number } {
  return { x: h.q, y: -h.q - h.r, z: h.r };
}

/** Hex distance using cube coordinates */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z)
  );
}

/** Are two hexes the same? */
export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/** Six axial direction vectors */
const AXIAL_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Get the 6 neighbors of a hex */
export function hexNeighbors(h: HexCoord): HexCoord[] {
  return AXIAL_DIRECTIONS.map(d => ({ q: h.q + d.q, r: h.r + d.r }));
}

/** Are two hexes adjacent? */
export function hexAdjacent(a: HexCoord, b: HexCoord): boolean {
  return hexDistance(a, b) === 1;
}

/** Get terrain movement cost */
export function terrainMoveCost(terrain: TerrainType): number {
  switch (terrain) {
    case 'WATER': return Infinity;
    case 'FOREST':
    case 'HILL':
    case 'CRYPT': return 2;
    default: return 1;
  }
}

/** Get hex cell from map by coord */
export function getCell(map: MapDefinition, coord: HexCoord): HexCell | undefined {
  return map.cells.find(c => c.q === coord.q && c.r === coord.r);
}

/** Build a lookup map for fast cell access */
export function buildCellMap(cells: HexCell[]): Map<string, HexCell> {
  const m = new Map<string, HexCell>();
  for (const c of cells) {
    m.set(hexKey(c), c);
  }
  return m;
}

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/** Check if a hex is occupied by any unit */
export function isHexOccupied(units: UnitInstance[], coord: HexCoord): boolean {
  return units.some(u => u.hp > 0 && hexEquals(u.position, coord));
}

/** Get unit at hex */
export function getUnitAtHex(units: UnitInstance[], coord: HexCoord): UnitInstance | undefined {
  return units.find(u => u.hp > 0 && hexEquals(u.position, coord));
}

/** Check if unit has any adjacent enemy */
export function hasAdjacentEnemy(unit: UnitInstance, allUnits: UnitInstance[]): boolean {
  const neighbors = hexNeighbors(unit.position);
  return allUnits.some(u =>
    u.hp > 0 &&
    u.ownerPlayerId !== unit.ownerPlayerId &&
    neighbors.some(n => hexEquals(n, u.position))
  );
}

/** Get all adjacent enemies */
export function getAdjacentEnemies(unit: UnitInstance, allUnits: UnitInstance[]): UnitInstance[] {
  const neighbors = hexNeighbors(unit.position);
  return allUnits.filter(u =>
    u.hp > 0 &&
    u.ownerPlayerId !== unit.ownerPlayerId &&
    neighbors.some(n => hexEquals(n, u.position))
  );
}

/** Get all adjacent allies */
export function getAdjacentAllies(unit: UnitInstance, allUnits: UnitInstance[]): UnitInstance[] {
  const neighbors = hexNeighbors(unit.position);
  return allUnits.filter(u =>
    u.hp > 0 &&
    u.ownerPlayerId === unit.ownerPlayerId &&
    u.instanceId !== unit.instanceId &&
    neighbors.some(n => hexEquals(n, u.position))
  );
}

/**
 * Pathfinding: BFS that respects movement costs.
 * Returns all reachable hexes with their paths and remaining movement.
 */
export interface ReachableHex {
  coord: HexCoord;
  costSoFar: number;
  path: HexCoord[];
}

export function findReachableHexes(
  start: HexCoord,
  maxMove: number,
  cellMap: Map<string, HexCell>,
  units: UnitInstance[],
  unitInstanceId: string,
  moveCostModifier?: (terrain: TerrainType, coord: HexCoord, costSoFar: number) => number
): ReachableHex[] {
  const visited = new Map<string, ReachableHex>();
  const queue: ReachableHex[] = [{ coord: start, costSoFar: 0, path: [] }];
  visited.set(hexKey(start), { coord: start, costSoFar: 0, path: [] });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = hexNeighbors(current.coord);

    for (const neighbor of neighbors) {
      const key = hexKey(neighbor);
      const cell = cellMap.get(key);
      if (!cell) continue;
      if (cell.terrain === 'WATER') continue;

      // Check if occupied by another unit
      if (units.some(u => u.hp > 0 && u.instanceId !== unitInstanceId && hexEquals(u.position, neighbor))) {
        continue;
      }

      let moveCost = terrainMoveCost(cell.terrain);
      if (moveCostModifier) {
        moveCost = moveCostModifier(cell.terrain, neighbor, current.costSoFar);
      }

      const totalCost = current.costSoFar + moveCost;
      if (totalCost > maxMove) continue;

      const existing = visited.get(key);
      if (existing && existing.costSoFar <= totalCost) continue;

      const newPath = [...current.path, neighbor];
      const entry: ReachableHex = { coord: neighbor, costSoFar: totalCost, path: newPath };
      visited.set(key, entry);
      queue.push(entry);
    }
  }

  // Remove start position
  visited.delete(hexKey(start));
  return Array.from(visited.values());
}

/**
 * Find shortest path between two hexes respecting movement costs.
 * Returns null if no path exists.
 */
export function findPath(
  start: HexCoord,
  end: HexCoord,
  maxMove: number,
  cellMap: Map<string, HexCell>,
  units: UnitInstance[],
  unitInstanceId: string,
  moveCostModifier?: (terrain: TerrainType, coord: HexCoord, costSoFar: number) => number
): HexCoord[] | null {
  const reachable = findReachableHexes(start, maxMove, cellMap, units, unitInstanceId, moveCostModifier);
  const target = reachable.find(r => hexEquals(r.coord, end));
  return target ? target.path : null;
}
