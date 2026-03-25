import React from 'react';
import { UnitInstance } from '../../engine/core/types';
import { getUnitDef, getLeaderDef } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';

interface UnitPanelProps {
  unit: UnitInstance;
}

const FACTION_COLORS: Record<string, string> = {
  HUMAN: '#d4a017',
  ELF: '#22c55e',
  ORC: '#dc2626',
  UNDEAD: '#8b5cf6',
};

const AFFINITY_LABELS: Record<string, string> = {
  SUN: 'Sol',
  MOON: 'Luna',
  NEUTRAL: 'Neutral',
};

export function UnitPanel({ unit }: UnitPanelProps) {
  const unitDef = getUnitDef(unit.defId);
  const leaderDef = getLeaderDef(unit.defId);
  const def = unitDef || leaderDef;
  if (!def) return null;

  const isLeader = !!leaderDef;
  const faction = def.faction;
  const color = FACTION_COLORS[faction] || '#888';

  const traits = def.traits;
  const uDef = unitDef; // For unit-specific fields

  return (
    <div style={{
      background: '#161b22',
      border: `1px solid ${color}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color, fontWeight: 700, fontSize: '14px' }}>
          {def.name}
        </span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>
          {isLeader ? 'LÍDER' : `T${uDef!.tier}`} – {faction}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px', marginBottom: '6px' }}>
        <Stat label="HP" value={`${unit.hp}/${unit.maxHp}`}
          color={unit.hp / unit.maxHp > 0.5 ? '#22c55e' : unit.hp / unit.maxHp > 0.25 ? '#f59e0b' : '#ef4444'} />
        <Stat label="VEL" value={`${def.move}`} />
        <Stat label="M" value={`${def.meleeDice}`} />
        <Stat label="R" value={`${def.rangedDice}`} />
        {!isLeader && uDef && (
          <>
            <Stat label="ASC" value={`${unit.ascMarks}/${uDef.ascRequired || '-'}`} color="#fbbf24" />
            <Stat label="Coste" value={uDef.costGold ? `${uDef.costGold}g` : '-'} />
          </>
        )}
        <Stat label="Ciclo" value={AFFINITY_LABELS[def.cycleAffinity]}
          color={def.cycleAffinity === 'SUN' ? '#fbbf24' : def.cycleAffinity === 'MOON' ? '#818cf8' : '#8b949e'} />
        {uDef && (
          <Stat label="Terreno" value={`+${uDef.goodTerrain} / -${uDef.badTerrain}`} />
        )}
      </div>

      {/* Status */}
      <div style={{ fontSize: '11px', marginBottom: '4px' }}>
        {unit.exhausted && <Tag text="Agotado" color="#ef4444" />}
        {unit.hasActivatedThisRound && <Tag text="Activado" color="#f59e0b" />}
        {unit.statusEffects.map((e, i) => (
          <Tag key={i} text={e.type.replace(/_/g, ' ')} color="#818cf8" />
        ))}
      </div>

      {/* Traits */}
      {traits.length > 0 && (
        <div style={{ borderTop: '1px solid #30363d', paddingTop: '6px', marginTop: '4px' }}>
          {traits.map(t => (
            <div key={t.id} style={{ fontSize: '11px', marginBottom: '3px' }}>
              <span style={{ color, fontWeight: 600 }}>{t.name}:</span>{' '}
              <span style={{ color: '#8b949e' }}>{t.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Evolution paths */}
      {uDef?.evolvesTo && uDef.evolvesTo.length > 0 && (
        <div style={{ fontSize: '10px', color: '#484f58', marginTop: '4px' }}>
          Evoluciona a: {uDef.evolvesTo.map(id => {
            const target = getUnitDef(id);
            return target ? target.name : id;
          }).join(' / ')}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span style={{ color: '#8b949e' }}>{label}: </span>
      <span style={{ color: color || '#e6edf3', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      background: `${color}20`,
      color,
      borderRadius: '3px',
      fontSize: '10px',
      marginRight: '4px',
      marginBottom: '2px',
    }}>
      {text}
    </span>
  );
}
