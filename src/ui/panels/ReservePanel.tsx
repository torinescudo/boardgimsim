import React from 'react';
import { COLORS } from '../theme';
import { GameState } from '../../engine/core/types';
import { getUnitDef } from '../../content/units/index';

interface ReservePanelProps {
  state: GameState;
}


export function ReservePanel({ state }: ReservePanelProps) {
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ color: '#e6edf3', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
        Reserva de Ascensos
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '4px' }}>
          Tier II ({state.reserve.remainingTier2.length} restantes)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {state.reserve.remainingTier2.map(id => {
            const def = getUnitDef(id);
            if (!def) return null;
            return (
              <span key={id} style={{
                padding: '2px 6px',
                background: `${FACTION_COLORS[def.faction]}15`,
                color: FACTION_COLORS[def.faction],
                borderRadius: '3px',
                fontSize: '9px',
                border: `1px solid ${FACTION_COLORS[def.faction]}30`,
              }}>
                {def.name}
              </span>
            );
          })}
          {state.reserve.remainingTier2.length === 0 && (
            <span style={{ color: '#484f58', fontSize: '10px' }}>Agotado</span>
          )}
        </div>
      </div>

      <div>
        <div style={{ color: '#8b949e', fontSize: '11px', marginBottom: '4px' }}>
          Tier III ({state.reserve.remainingTier3.length} restantes)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
          {state.reserve.remainingTier3.map(id => {
            const def = getUnitDef(id);
            if (!def) return null;
            return (
              <span key={id} style={{
                padding: '2px 6px',
                background: `${FACTION_COLORS[def.faction]}15`,
                color: FACTION_COLORS[def.faction],
                borderRadius: '3px',
                fontSize: '9px',
                border: `1px solid ${FACTION_COLORS[def.faction]}30`,
              }}>
                {def.name}
              </span>
            );
          })}
          {state.reserve.remainingTier3.length === 0 && (
            <span style={{ color: '#484f58', fontSize: '10px' }}>Agotado</span>
          )}
        </div>
      </div>
    </div>
  );
}
