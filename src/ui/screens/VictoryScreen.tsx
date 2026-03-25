import React from 'react';
import { GameState } from '../../engine/core/types';
import { getPlayer } from '../../engine/state/gameState';

interface VictoryScreenProps {
  state: GameState;
  onReturnToMenu: () => void;
}

export function VictoryScreen({ state, onReturnToMenu }: VictoryScreenProps) {
  const winner = state.winner!;
  const player = getPlayer(state, winner.playerId);

  const reasonText = winner.reason === 'LEADER_KILLED'
    ? 'por muerte del líder enemigo'
    : 'por dominio de ciudades';

  const factionColor: Record<string, string> = {
    HUMAN: '#d4a017',
    ELF: '#22c55e',
    ORC: '#dc2626',
    UNDEAD: '#8b5cf6',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0d1117',
      gap: '24px',
    }}>
      <h1 style={{
        fontSize: '36px',
        color: factionColor[player.faction] || '#e6edf3',
        textShadow: `0 0 20px ${factionColor[player.faction]}40`,
      }}>
        ¡Victoria!
      </h1>
      <p style={{ color: '#e6edf3', fontSize: '20px' }}>
        {winner.playerId} ({player.faction}) gana {reasonText}
      </p>
      <p style={{ color: '#8b949e' }}>
        Ronda {state.round} – {state.cycle === 'DAY' ? 'Día' : 'Noche'}
      </p>
      <button
        onClick={onReturnToMenu}
        style={{
          marginTop: '32px',
          padding: '14px 40px',
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 600,
        }}
      >
        Volver al Menú
      </button>
    </div>
  );
}
