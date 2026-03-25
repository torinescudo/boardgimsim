import React from 'react';
import { COLORS } from '../theme';
import { GameState, UnitInstance } from '../../engine/core/types';
import { getAscendableUnits } from '../../engine/selectors/selectors';
import { getUnitDef } from '../../content/units/index';

interface AscendPanelProps {
  state: GameState;
  onAscend: (unitId: string, targetDefId: string) => void;
}


export function AscendPanel({ state, onAscend }: AscendPanelProps) {
  const ascendable = getAscendableUnits(state);

  if (ascendable.length === 0) return null;

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
        Ascensos Disponibles
      </div>
      {ascendable.map(({ unit, targets }) => {
        const currentDef = getUnitDef(unit.defId)!;
        return (
          <div key={unit.instanceId} style={{ marginBottom: '8px' }}>
            <div style={{ color: '#e6edf3', fontSize: '12px', marginBottom: '4px' }}>
              {currentDef.name} ({unit.ascMarks}/{currentDef.ascRequired} marcas)
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {targets.map(targetId => {
                const targetDef = getUnitDef(targetId)!;
                const color = FACTION_COLORS[targetDef.faction];
                return (
                  <button
                    key={targetId}
                    onClick={() => onAscend(unit.instanceId, targetId)}
                    style={{
                      padding: '4px 10px',
                      background: `${color}20`,
                      color,
                      border: `1px solid ${color}40`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                    }}
                  >
                    → {targetDef.name} (T{targetDef.tier})
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
