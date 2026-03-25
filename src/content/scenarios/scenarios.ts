export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  mapId: string;
  /** If true, only leaders + shop draft */
  isSkirmish: boolean;
  /** Victory: cities needed */
  cityVictoryThreshold?: number;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'first_skirmish',
    name: 'Primera Escaramuza',
    description: 'Modo tutorial simplificado. Sin Agua, sin reglas especiales. Victoria por 5 de 6 ciudades o muerte del líder.',
    mapId: 'map_first_skirmish',
    isSkirmish: true,
    cityVictoryThreshold: 5,
  },
  {
    id: 'standard_open_field',
    name: 'Estándar – Campo Abierto',
    description: 'Partida estándar en llanuras abiertas.',
    mapId: 'map_open_field',
    isSkirmish: false,
  },
  {
    id: 'standard_wooded_valley',
    name: 'Estándar – Valle Boscoso',
    description: 'Bosques canalizan el combate hacia el centro.',
    mapId: 'map_wooded_valley',
    isSkirmish: false,
  },
  {
    id: 'standard_twin_hills',
    name: 'Estándar – Colinas Gemelas',
    description: 'Dos mesetas conectadas por un paso central.',
    mapId: 'map_twin_hills',
    isSkirmish: false,
  },
  {
    id: 'standard_broken_river',
    name: 'Estándar – Paso del Río Roto',
    description: 'Un río parte el campo de batalla en dos.',
    mapId: 'map_broken_river',
    isSkirmish: false,
  },
  {
    id: 'standard_fractured_threshold',
    name: 'Estándar – El Umbral Fracturado',
    description: 'Criptas, agua y asimetría. El mapa más desafiante.',
    mapId: 'map_fractured_threshold',
    isSkirmish: false,
  },
];

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIOS.find(s => s.id === id);
}
