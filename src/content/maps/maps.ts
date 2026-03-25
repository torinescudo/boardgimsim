import { MapDefinition, HexCell } from '../../engine/core/types';
import { cell } from './mapHelpers';

// ============================================================
// Map layouts use axial coordinates (q, r).
// Each map targets: 6 cities, 8 villages, 2 fortresses, camps.
// Grid size ~11 wide x 9 tall for standard maps.
// ============================================================

function makeGrid(width: number, height: number): HexCell[] {
  const cells: HexCell[] = [];
  for (let r = 0; r < height; r++) {
    for (let col = 0; col < width; col++) {
      const q = col - Math.floor(r / 2);
      cells.push(cell(q, r, 'PLAIN'));
    }
  }
  return cells;
}

function setCell(cells: HexCell[], q: number, r: number, terrain: HexCell['terrain'], meta?: HexCell['metadata']): void {
  const c = cells.find(c => c.q === q && c.r === r);
  if (c) {
    c.terrain = terrain;
    if (meta) c.metadata = { ...c.metadata, ...meta };
  } else {
    cells.push(cell(q, r, terrain, meta));
  }
}

function removeCell(cells: HexCell[], q: number, r: number): HexCell[] {
  return cells.filter(c => !(c.q === q && c.r === r));
}

// ================================================================
// M1: CAMPO ABIERTO (Easy) – open plains, no water
// ================================================================
function createOpenField(): MapDefinition {
  const cells = makeGrid(11, 9);

  // 6 Cities – spread across the center
  const cities: [number, number][] = [
    [2, 2], [6, 2],   // top row
    [1, 4], [7, 4],   // middle row
    [2, 6], [6, 6],   // bottom row
  ];
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 8 Villages
  const villages: [number, number][] = [
    [4, 1], [3, 3], [5, 3],
    [4, 4],
    [3, 5], [5, 5],
    [4, 7], [0, 4],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // 2 Fortresses
  setCell(cells, 0, 1, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 8, 7, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  // Camps (2 per player)
  setCell(cells, 1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 1, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 7, 7, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 7, 8, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_open_field',
    name: 'Campo Abierto',
    difficulty: 'EASY',
    description: 'Llanuras sin obstáculos. Primera partida.',
    strategyText: 'Sin terreno costoso, VEL rinde al máximo. Campamentos pequeños fuerzan despliegue concentrado. Jinetes dominan.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: 0, r: 1 }, { q: 1, r: 0 }, { q: 1, r: 1 }],
      PLAYER2: [{ q: 8, r: 7 }, { q: 7, r: 7 }, { q: 7, r: 8 }],
    },
  };
}

// ================================================================
// M2: VALLE BOSCOSO (Easy) – forest perimeter, central corridor
// ================================================================
function createWoodedValley(): MapDefinition {
  const cells = makeGrid(11, 9);

  // Forest perimeter
  const forests: [number, number][] = [
    // Left edge forests
    [-1, 2], [0, 2], [-1, 3], [-2, 4], [-1, 5], [-2, 6], [0, 6],
    // Right edge forests
    [7, 2], [8, 2], [8, 3], [9, 4], [8, 5], [9, 6], [7, 6],
    // Top/bottom forests
    [2, 0], [3, 0], [5, 0], [6, 0],
    [2, 8], [3, 8], [5, 8], [6, 8],
    // Interior forests
    [0, 3], [7, 3], [0, 5], [7, 5],
  ];
  forests.forEach(([q, r]) => setCell(cells, q, r, 'FOREST'));

  // 6 Cities
  const cities: [number, number][] = [
    [3, 2], [5, 2],
    [2, 4], [6, 4],
    [3, 6], [5, 6],
  ];
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 8 Villages
  const villages: [number, number][] = [
    [4, 1], [1, 3], [6, 3],
    [4, 4],
    [1, 5], [6, 5],
    [4, 7], [3, 4],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // Fortresses inside forest
  setCell(cells, 0, 0, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 8, 8, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  // Camps
  setCell(cells, 1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 0, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 7, 8, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 8, 7, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_wooded_valley',
    name: 'Valle Boscoso',
    difficulty: 'EASY',
    description: 'Bosques canalizan hacia el corredor central.',
    strategyText: 'Elfos controlan flancos boscosos. Los campamentos están dentro del bosque: tus refuerzos nacen protegidos pero lentos de sacar.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }],
      PLAYER2: [{ q: 8, r: 8 }, { q: 7, r: 8 }, { q: 8, r: 7 }],
    },
  };
}

// ================================================================
// M3: COLINAS GEMELAS (Easy) – two plateaus connected by a pass
// ================================================================
function createTwinHills(): MapDefinition {
  const cells = makeGrid(11, 9);

  // Hills on extremes
  const hills: [number, number][] = [
    // Left plateau
    [-1, 2], [0, 2], [1, 2], [-1, 3], [0, 3],
    [-2, 4], [-1, 4],
    // Right plateau
    [7, 2], [8, 2], [6, 2], [7, 3], [8, 3],
    [8, 4], [9, 4],
    // Lower hills
    [-1, 6], [0, 6], [1, 6],
    [7, 6], [8, 6], [6, 6],
  ];
  hills.forEach(([q, r]) => setCell(cells, q, r, 'HILL'));

  // Central pass (plains – default)

  // 6 Cities
  const cities: [number, number][] = [
    [2, 2], [6, 2],
    [3, 4], [5, 4],
    [2, 6], [6, 6],
  ];
  // Override hills that became cities
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 8 Villages
  const villages: [number, number][] = [
    [4, 1], [4, 3],
    [1, 4], [7, 4],
    [4, 5], [4, 7],
    [2, 3], [6, 5],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // Fortresses at feet of plateaus
  setCell(cells, 0, 0, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 8, 8, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  setCell(cells, 1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 0, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 7, 8, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 8, 7, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_twin_hills',
    name: 'Colinas Gemelas',
    difficulty: 'EASY',
    description: 'Dos mesetas conectadas por un paso.',
    strategyText: 'Cada campamento está al pie de su meseta. Los Orcos reclutan con ventaja de terreno inmediata. El paso central sigue siendo el cuello de botella.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }],
      PLAYER2: [{ q: 8, r: 8 }, { q: 7, r: 8 }, { q: 8, r: 7 }],
    },
  };
}

// ================================================================
// M4: PASO DEL RÍO ROTO (Intermediate) – river choke in center
// ================================================================
function createBrokenRiver(): MapDefinition {
  const cells = makeGrid(11, 9);

  // River (water) across center
  const water: [number, number][] = [
    [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4],
    // Gap/ford at center
    // [3, 4] is the crossing point – stays PLAIN
    [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
  ];
  water.forEach(([q, r]) => setCell(cells, q, r, 'WATER'));

  // Some forests near river
  const forests: [number, number][] = [
    [0, 3], [1, 3], [7, 3], [8, 3],
    [0, 5], [1, 5], [7, 5], [8, 5],
  ];
  forests.forEach(([q, r]) => setCell(cells, q, r, 'FOREST'));

  // Ford/crossing
  setCell(cells, 3, 4, 'PLAIN');
  setCell(cells, 4, 4, 'PLAIN');

  // 6 Cities
  const cities: [number, number][] = [
    [2, 1], [6, 1],
    [2, 3], [6, 3],
    [2, 6], [6, 6],
  ];
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 8 Villages
  const villages: [number, number][] = [
    [4, 0], [4, 2],
    [3, 3], [5, 3],
    [3, 5], [5, 5],
    [4, 6], [4, 8],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // Fortresses (larger camps: 3 hexes)
  setCell(cells, 0, 0, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 8, 8, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  // 3-hex camps per player
  setCell(cells, 1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 0, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, -1, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 7, 8, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 8, 7, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 9, 7, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_broken_river',
    name: 'Paso del Río Roto',
    difficulty: 'INTERMEDIATE',
    description: 'Un río estrangula el centro.',
    strategyText: 'Campamentos grandes (3 hexes) para compensar la dificultad de cruzar. Puedes elegir desplegar arriba o abajo del río según tu plan.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }],
      PLAYER2: [{ q: 8, r: 8 }, { q: 7, r: 8 }, { q: 8, r: 7 }, { q: 9, r: 7 }],
    },
  };
}

// ================================================================
// M5: EL UMBRAL FRACTURADO (Hard) – crypts, water, asymmetry
// ================================================================
function createFracturedThreshold(): MapDefinition {
  const cells = makeGrid(11, 9);

  // Water patches (asymmetric)
  const water: [number, number][] = [
    [3, 3], [4, 3],
    [3, 4],
    [6, 5], [7, 5],
    [7, 6],
  ];
  water.forEach(([q, r]) => setCell(cells, q, r, 'WATER'));

  // Crypts (player 1 side – near spawn)
  const crypts: [number, number][] = [
    [0, 2], [1, 2], [-1, 3],
    [0, 3], [1, 3],
  ];
  // Override water if conflict
  crypts.forEach(([q, r]) => {
    const existing = cells.find(c => c.q === q && c.r === r);
    if (existing && existing.terrain !== 'WATER') {
      setCell(cells, q, r, 'CRYPT');
    } else if (!existing) {
      cells.push(cell(q, r, 'CRYPT'));
    } else {
      setCell(cells, q, r, 'CRYPT');
    }
  });

  // Hills (player 2 side)
  const hills: [number, number][] = [
    [7, 2], [8, 2], [8, 3],
    [6, 6], [7, 6], [8, 6],
  ];
  hills.forEach(([q, r]) => {
    const existing = cells.find(c => c.q === q && c.r === r);
    if (existing && existing.terrain !== 'WATER') {
      setCell(cells, q, r, 'HILL');
    }
  });

  // Forests scattered
  const forests: [number, number][] = [
    [2, 1], [5, 1], [3, 5], [5, 7],
    [1, 6], [2, 7],
  ];
  forests.forEach(([q, r]) => setCell(cells, q, r, 'FOREST'));

  // 6 Cities
  const cities: [number, number][] = [
    [3, 1], [6, 1],
    [2, 4], [6, 4],
    [3, 7], [5, 6],
  ];
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 8 Villages
  const villages: [number, number][] = [
    [4, 0], [1, 1],
    [5, 3], [1, 5],
    [4, 5], [8, 5],
    [4, 7], [7, 7],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // Fortresses (3-hex camps)
  setCell(cells, -1, 1, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 9, 7, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  setCell(cells, 0, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, -1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 0, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 8, 8, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 9, 8, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 8, 7, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_fractured_threshold',
    name: 'El Umbral Fracturado',
    difficulty: 'HARD',
    description: 'Criptas, agua y asimetría total.',
    strategyText: 'Campamentos de 3 hexes porque el terreno es traicionero. Uno nace entre Criptas, el otro entre Colinas. La asimetría de spawn es parte del desafío.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: -1, r: 1 }, { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 1 }],
      PLAYER2: [{ q: 9, r: 7 }, { q: 8, r: 8 }, { q: 9, r: 8 }, { q: 8, r: 7 }],
    },
  };
}

// ================================================================
// FIRST SKIRMISH (Tutorial) – simplified map
// ================================================================
function createFirstSkirmish(): MapDefinition {
  const cells = makeGrid(9, 7);

  // 6 Cities
  const cities: [number, number][] = [
    [2, 1], [5, 1],
    [1, 3], [6, 3],
    [2, 5], [5, 5],
  ];
  cities.forEach(([q, r], i) => setCell(cells, q, r, 'CITY', { cityId: `city_${i + 1}` }));

  // 6 Villages (tutorial uses 6)
  const villages: [number, number][] = [
    [3, 0], [3, 2],
    [4, 3],
    [3, 4], [3, 6],
    [0, 3],
  ];
  villages.forEach(([q, r], i) => setCell(cells, q, r, 'VILLAGE', { villageId: `village_${i + 1}` }));

  // Fortresses
  setCell(cells, 0, 0, 'FORTRESS', { fortressOwner: 'PLAYER1', spawnOwner: 'PLAYER1' });
  setCell(cells, 6, 6, 'FORTRESS', { fortressOwner: 'PLAYER2', spawnOwner: 'PLAYER2' });

  // Camps
  setCell(cells, 1, 0, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 0, 1, 'CAMP', { spawnOwner: 'PLAYER1' });
  setCell(cells, 5, 6, 'CAMP', { spawnOwner: 'PLAYER2' });
  setCell(cells, 6, 5, 'CAMP', { spawnOwner: 'PLAYER2' });

  return {
    id: 'map_first_skirmish',
    name: 'Primera Escaramuza',
    difficulty: 'EASY',
    description: 'Mapa tutorial simplificado. Sin Agua, sin reglas especiales.',
    strategyText: 'Mapa ideal para aprender las mecánicas básicas.',
    cells,
    spawnZones: {
      PLAYER1: [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }],
      PLAYER2: [{ q: 6, r: 6 }, { q: 5, r: 6 }, { q: 6, r: 5 }],
    },
    recommendedScenario: 'first_skirmish',
  };
}

// ── Export all maps ──
export const ALL_MAPS: MapDefinition[] = [
  createOpenField(),
  createWoodedValley(),
  createTwinHills(),
  createBrokenRiver(),
  createFracturedThreshold(),
  createFirstSkirmish(),
];

export function getMapById(id: string): MapDefinition | undefined {
  return ALL_MAPS.find(m => m.id === id);
}
