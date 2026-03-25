import { HexCell, TerrainType, MapDefinition, MapDifficulty } from '../../engine/core/types';

/** Helper to create hex cells quickly */
export function cell(q: number, r: number, terrain: TerrainType, meta?: HexCell['metadata']): HexCell {
  return { q, r, terrain, metadata: meta };
}

/** Generate a rectangular hex grid with offset coordinates converted to axial */
export function generateRectGrid(
  width: number,
  height: number,
  defaultTerrain: TerrainType = 'PLAIN'
): HexCell[] {
  const cells: HexCell[] = [];
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      // Offset to axial conversion (even-r offset)
      const aq = q - Math.floor(r / 2);
      cells.push({ q: aq, r, terrain: defaultTerrain });
    }
  }
  return cells;
}

/** Set terrain on specific hex */
export function setTerrain(cells: HexCell[], q: number, r: number, terrain: TerrainType, meta?: HexCell['metadata']): void {
  const c = cells.find(c => c.q === q && c.r === r);
  if (c) {
    c.terrain = terrain;
    if (meta) c.metadata = { ...c.metadata, ...meta };
  }
}

/** Set multiple hexes to a terrain */
export function setTerrainBatch(cells: HexCell[], coords: [number, number][], terrain: TerrainType, meta?: HexCell['metadata']): void {
  for (const [q, r] of coords) {
    setTerrain(cells, q, r, terrain, meta);
  }
}

export function createMapDef(
  id: string,
  name: string,
  difficulty: MapDifficulty,
  description: string,
  strategyText: string,
  cells: HexCell[],
  spawnZones: MapDefinition['spawnZones']
): MapDefinition {
  return { id, name, difficulty, description, strategyText, cells, spawnZones };
}
