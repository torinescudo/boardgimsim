import { UnitDefinition, LeaderDefinition, Faction, UnitTier } from '../../engine/core/types';
import { HUMAN_UNITS } from './humans';
import { ELF_UNITS } from './elves';
import { ORC_UNITS } from './orcs';
import { UNDEAD_UNITS } from './undead';
import { LEADERS } from '../leaders/leaders';

export const ALL_UNITS: UnitDefinition[] = [
  ...HUMAN_UNITS,
  ...ELF_UNITS,
  ...ORC_UNITS,
  ...UNDEAD_UNITS,
];

export function getUnitDef(id: string): UnitDefinition | undefined {
  return ALL_UNITS.find(u => u.id === id);
}

export function getLeaderDef(id: string): LeaderDefinition | undefined {
  return LEADERS.find(l => l.id === id);
}

export function getUnitOrLeaderDef(id: string): UnitDefinition | LeaderDefinition | undefined {
  return getUnitDef(id) ?? getLeaderDef(id);
}

export function getUnitsByFaction(faction: Faction): UnitDefinition[] {
  return ALL_UNITS.filter(u => u.faction === faction);
}

export function getUnitsByTier(tier: UnitTier): UnitDefinition[] {
  return ALL_UNITS.filter(u => u.tier === tier);
}

export function getTier1Units(): UnitDefinition[] {
  return ALL_UNITS.filter(u => u.tier === 1);
}

export function getTier2Units(): UnitDefinition[] {
  return ALL_UNITS.filter(u => u.tier === 2);
}

export function getTier3Units(): UnitDefinition[] {
  return ALL_UNITS.filter(u => u.tier === 3);
}

/** Get the full evolution tree for a unit */
export function getEvolutionTargets(unitDefId: string): string[] {
  const def = getUnitDef(unitDefId);
  return def?.evolvesTo ?? [];
}

export { HUMAN_UNITS, ELF_UNITS, ORC_UNITS, UNDEAD_UNITS, LEADERS };
