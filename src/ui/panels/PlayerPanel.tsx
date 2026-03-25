import React from 'react';
import { GameState, PlayerState, BlessingState } from '../../engine/core/types';
import { getPlayer, getBaseActions, getMaxExtraActions, getExtraActionCost } from '../../engine/state/gameState';
import { getLeaderDef } from '../../content/units/index';
import { getCityControl, getTotalCities, canBuyExtraAction } from '../../engine/selectors/selectors';

interface PlayerPanelProps {
  state: GameState;
  onBuyExtraAction: () => void;
  onEndTurn: () => void;
  onUseBlessing: () => void;
}

const FACTION_COLORS: Record<string, string> = {
  HUMAN: '#d4a017',
  ELF: '#22c55e',
  ORC: '#dc2626',
  UNDEAD: '#8b5cf6',
};

export function PlayerPanel({ state, onBuyExtraAction, onEndTurn, onUseBlessing }: PlayerPanelProps) {
  const player = getPlayer(state, state.activePlayerId);
  const leader = getLeaderDef(player.leaderDefId);
  const cityControl = getCityControl(state);
  const totalCities = getTotalCities(state);
  const extraAction = canBuyExtraAction(state);

  return (
    <div style={{
      background: '#161b22',
      border: `1px solid ${FACTION_COLORS[player.faction] || '#30363d'}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: FACTION_COLORS[player.faction], fontWeight: 700, fontSize: '14px' }}>
          {state.activePlayerId} – {player.faction}
        </span>
        <span style={{ color: '#8b949e', fontSize: '12px' }}>
          {leader?.name}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px' }}>
        <InfoRow label="Oro" value={`${player.gold}`} color="#fbbf24" />
        <InfoRow label="Acciones" value={`${player.actionsRemaining}`} color="#3b82f6" />
        <InfoRow label="Ronda" value={`${state.round}`} />
        <InfoRow label="Ciclo" value={state.cycle === 'DAY' ? 'Día' : 'Noche'}
          color={state.cycle === 'DAY' ? '#fbbf24' : '#818cf8'} />
        <InfoRow label="Ciudades" value={`${cityControl[state.activePlayerId] || 0}/${totalCities}`} />
        <InfoRow label="Extras" value={`${player.extraActionsPurchasedThisRound}/${getMaxExtraActions(state.round)}`} />
      </div>

      {/* Blessing */}
      {player.blessing && !player.blessing.consumed && (
        <div style={{
          marginTop: '8px',
          padding: '6px 10px',
          background: '#1a2332',
          borderRadius: '6px',
          border: '1px solid #6d28d9',
        }}>
          <div style={{ color: '#c084fc', fontSize: '12px', fontWeight: 600 }}>
            Bendición del Pueblo
          </div>
          <div style={{ color: '#8b949e', fontSize: '11px' }}>
            {describeBlessingType(player.blessing)}
          </div>
          <button
            onClick={onUseBlessing}
            style={{
              marginTop: '4px',
              padding: '4px 12px',
              background: '#6d28d9',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Usar
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        {extraAction.can && (
          <button onClick={onBuyExtraAction} style={btnStyle('#1a4a3a')}>
            +Acción ({extraAction.cost}g)
          </button>
        )}
        <button onClick={onEndTurn} style={btnStyle('#4a1a1a')}>
          Fin de Turno
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span style={{ color: '#8b949e' }}>{label}: </span>
      <span style={{ color: color || '#e6edf3', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function describeBlessingType(b: BlessingState): string {
  switch (b.type) {
    case 'FREE_ACTIVATION': return '1 activación gratis';
    case 'FREE_RECRUIT': return '1 reclutamiento gratis';
    case 'FREE_REFRESH': return 'Refresh gratis de tienda';
    case 'GOLD_AND_MOVE': return '+1 oro y mover 1 unidad 1 hex';
  }
}

const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '6px 12px',
  background: bg,
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '11px',
  flex: 1,
});
