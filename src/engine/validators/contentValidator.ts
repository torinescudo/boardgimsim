// ============================================================
// Content Validators – verify data integrity
// ============================================================

import { ALL_UNITS, getTier1Units, getTier2Units, getTier3Units } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';
import { ALL_MAPS } from '../../content/maps/maps';

export interface ValidationError {
  category: string;
  message: string;
}

export function validateAllContent(): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. No duplicate IDs
  const allIds = [...ALL_UNITS.map(u => u.id), ...LEADERS.map(l => l.id)];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      errors.push({ category: 'DUPLICATE_ID', message: `ID duplicado: ${id}` });
    }
    seen.add(id);
  }

  // 2. Evolution routes point to valid IDs
  for (const unit of ALL_UNITS) {
    if (unit.evolvesTo) {
      for (const targetId of unit.evolvesTo) {
        if (!ALL_UNITS.find(u => u.id === targetId)) {
          errors.push({
            category: 'INVALID_EVOLUTION',
            message: `${unit.id} evoluciona a ${targetId}, que no existe.`,
          });
        }
      }
    }
  }

  // 3. Counts
  const t1 = getTier1Units();
  const t2 = getTier2Units();
  const t3 = getTier3Units();

  if (t1.length !== 16) {
    errors.push({ category: 'COUNT', message: `Tier I esperado: 16, actual: ${t1.length}` });
  }
  if (t2.length !== 16) {
    errors.push({ category: 'COUNT', message: `Tier II esperado: 16, actual: ${t2.length}` });
  }
  if (t3.length !== 8) {
    errors.push({ category: 'COUNT', message: `Tier III esperado: 8, actual: ${t3.length}` });
  }

  // 4. T2/T3 uniqueness (each ID should appear once)
  const t2Ids = t2.map(u => u.id);
  const t3Ids = t3.map(u => u.id);
  const t2Set = new Set(t2Ids);
  const t3Set = new Set(t3Ids);
  if (t2Set.size !== t2Ids.length) {
    errors.push({ category: 'UNIQUENESS', message: 'T2 tiene IDs duplicados.' });
  }
  if (t3Set.size !== t3Ids.length) {
    errors.push({ category: 'UNIQUENESS', message: 'T3 tiene IDs duplicados.' });
  }

  // 5. Leaders must be NEUTRAL
  for (const leader of LEADERS) {
    if (leader.cycleAffinity !== 'NEUTRAL') {
      errors.push({
        category: 'LEADER_AFFINITY',
        message: `Líder ${leader.id} no es NEUTRAL: ${leader.cycleAffinity}`,
      });
    }
  }

  // 6. Maps: check cities and villages counts
  for (const map of ALL_MAPS) {
    const cities = map.cells.filter(c => c.terrain === 'CITY');
    const villages = map.cells.filter(c => c.terrain === 'VILLAGE');

    if (cities.length !== 6) {
      errors.push({
        category: 'MAP',
        message: `Mapa ${map.id}: esperado 6 ciudades, tiene ${cities.length}.`,
      });
    }

    // First skirmish has 6 villages, others have 8
    const expectedVillages = map.id === 'map_first_skirmish' ? 6 : 8;
    if (villages.length !== expectedVillages) {
      errors.push({
        category: 'MAP',
        message: `Mapa ${map.id}: esperado ${expectedVillages} aldeas, tiene ${villages.length}.`,
      });
    }
  }

  return errors;
}
