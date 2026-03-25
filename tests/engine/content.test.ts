import { describe, it, expect } from 'vitest';
import { validateAllContent } from '../../src/engine/validators/contentValidator';
import { getTier1Units, getTier2Units, getTier3Units, ALL_UNITS } from '../../src/content/units/index';
import { LEADERS } from '../../src/content/leaders/leaders';

describe('Content validation', () => {
  it('passes all content validation checks', () => {
    const errors = validateAllContent();
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
    }
    expect(errors.length).toBe(0);
  });

  it('has 16 Tier I units', () => {
    expect(getTier1Units().length).toBe(16);
  });

  it('has 16 Tier II units', () => {
    expect(getTier2Units().length).toBe(16);
  });

  it('has 8 Tier III units', () => {
    expect(getTier3Units().length).toBe(8);
  });

  it('has 4 leaders', () => {
    expect(LEADERS.length).toBe(4);
  });

  it('all leaders are NEUTRAL affinity', () => {
    for (const leader of LEADERS) {
      expect(leader.cycleAffinity).toBe('NEUTRAL');
    }
  });

  it('no duplicate unit IDs', () => {
    const ids = ALL_UNITS.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all evolution targets exist', () => {
    for (const unit of ALL_UNITS) {
      if (unit.evolvesTo) {
        for (const targetId of unit.evolvesTo) {
          const target = ALL_UNITS.find(u => u.id === targetId);
          expect(target).toBeDefined();
        }
      }
    }
  });

  it('T2 and T3 are unique copies', () => {
    const t2 = getTier2Units();
    const t3 = getTier3Units();
    const t2Set = new Set(t2.map(u => u.id));
    const t3Set = new Set(t3.map(u => u.id));
    expect(t2Set.size).toBe(t2.length);
    expect(t3Set.size).toBe(t3.length);
  });

  it('4 units per faction per tier I', () => {
    const factions = ['HUMAN', 'ELF', 'ORC', 'UNDEAD'];
    for (const faction of factions) {
      const t1 = getTier1Units().filter(u => u.faction === faction);
      expect(t1.length).toBe(4);
    }
  });

  it('4 units per faction per tier II', () => {
    const factions = ['HUMAN', 'ELF', 'ORC', 'UNDEAD'];
    for (const faction of factions) {
      const t2 = getTier2Units().filter(u => u.faction === faction);
      expect(t2.length).toBe(4);
    }
  });

  it('2 units per faction per tier III', () => {
    const factions = ['HUMAN', 'ELF', 'ORC', 'UNDEAD'];
    for (const faction of factions) {
      const t3 = getTier3Units().filter(u => u.faction === faction);
      expect(t3.length).toBe(2);
    }
  });
});
