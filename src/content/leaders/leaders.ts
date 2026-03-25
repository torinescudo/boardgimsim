import { LeaderDefinition } from '../../engine/core/types';

export const LEADERS: LeaderDefinition[] = [
  {
    id: 'leader_human',
    name: 'Capitán de la Frontera',
    faction: 'HUMAN',
    maxHp: 7,
    move: 3,
    meleeDice: 2,
    rangedDice: 1,
    cycleAffinity: 'NEUTRAL',
    traits: [
      {
        id: 'orden_de_marcha',
        name: 'Orden de marcha',
        description: '1 vez por ronda, un humano aliado adyacente mueve 1 hex.',
        trigger: 'ON_ACTIVATION_START',
        config: { faction: 'HUMAN', range: 1, moveHexes: 1, usesPerRound: 1 },
      },
    ],
  },
  {
    id: 'leader_elf',
    name: 'Guardiana Silvana',
    faction: 'ELF',
    maxHp: 6,
    move: 4,
    meleeDice: 1,
    rangedDice: 2,
    cycleAffinity: 'NEUTRAL',
    traits: [
      {
        id: 'sendero_antiguo',
        name: 'Sendero antiguo',
        description: '1 vez por ronda, un elfo aliado en Bosque convierte 1 dado a ventaja en su primer ataque.',
        trigger: 'ON_BUILD_ATTACK_DICE_POOL',
        config: { faction: 'ELF', terrain: 'FOREST', advantageDice: 1, usesPerRound: 1, firstAttackOnly: true },
      },
    ],
  },
  {
    id: 'leader_orc',
    name: 'Jefe de Guerra del Filo',
    faction: 'ORC',
    maxHp: 8,
    move: 3,
    meleeDice: 3,
    rangedDice: 0,
    cycleAffinity: 'NEUTRAL',
    traits: [
      {
        id: 'rugido_de_conquista',
        name: 'Rugido de conquista',
        description: '1 vez por ronda, un orco aliado adyacente gana +1 movimiento.',
        trigger: 'ON_ACTIVATION_START',
        config: { faction: 'ORC', range: 1, moveBonus: 1, usesPerRound: 1 },
      },
    ],
  },
  {
    id: 'leader_undead',
    name: 'Heraldo de la Tumba',
    faction: 'UNDEAD',
    maxHp: 6,
    move: 3,
    meleeDice: 2,
    rangedDice: 2,
    cycleAffinity: 'NEUTRAL',
    traits: [
      {
        id: 'presagio',
        name: 'Presagio',
        description: 'Una unidad dañada por este líder no cura hasta tu siguiente turno.',
        trigger: 'ON_AFTER_DAMAGE_APPLIED',
        config: { appliesHealBlock: true },
      },
    ],
  },
];

export function getLeaderById(id: string): LeaderDefinition | undefined {
  return LEADERS.find(l => l.id === id);
}

export function getLeaderByFaction(faction: string): LeaderDefinition | undefined {
  return LEADERS.find(l => l.faction === faction);
}
