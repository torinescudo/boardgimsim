import React from 'react';
import { COLORS } from '../theme';
import { GameState, HexCoord } from '../../engine/core/types';
import { getUnitDef } from '../../content/units/index';
import { getPlayer } from '../../engine/state/gameState';

interface ShopPanelProps {
  state: GameState;
  onBuy: (slotIndex: number) => void;
  onRefresh: (slotIndex: number) => void;
}


export function ShopPanel({ state, onBuy, onRefresh }: ShopPanelProps) {
  const player = getPlayer(state, state.activePlayerId);
  const isDraft = state.phase === 'PRE_DRAFT';

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#e6edf3', fontWeight: 600, fontSize: '13px' }}>
          {isDraft ? `Draft (${state.preDraftPurchasesRemaining} restantes)` : 'Tienda de Mercenarios'}
        </span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>
          Mazo: {state.shop.deck.length}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {state.shop.visible.map((slot, i) => {
          if (!slot) {
            return (
              <div key={i} style={{
                flex: '1 1 45%',
                padding: '8px',
                background: '#0d1117',
                borderRadius: '6px',
                border: '1px dashed #30363d',
                textAlign: 'center',
                color: '#484f58',
                fontSize: '11px',
              }}>
                Vacío
              </div>
            );
          }

          const def = getUnitDef(slot.unitDefId);
          if (!def) return null;
          const color = FACTION_COLORS[def.faction] || '#888';
          const canAfford = isDraft || player.gold >= (def.costGold || 0);

          return (
            <div key={i} style={{
              flex: '1 1 45%',
              padding: '8px',
              background: '#0d1117',
              borderRadius: '6px',
              border: `1px solid ${color}40`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color, fontWeight: 600, fontSize: '11px' }}>
                  {def.name}
                </span>
                <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 700 }}>
                  {isDraft ? 'GRATIS' : `${def.costGold}g`}
                </span>
              </div>
              <div style={{ fontSize: '10px', color: '#8b949e', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
                <span>HP {def.maxHp}</span>
                <span>VEL {def.move}</span>
                <span>M {def.meleeDice}</span>
                <span>R {def.rangedDice}</span>
              </div>
              {def.traits.length > 0 && (
                <div style={{ fontSize: '9px', color: '#6e7681', marginTop: '2px' }}>
                  {def.traits[0].name}
                </div>
              )}
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                <button
                  onClick={() => onBuy(i)}
                  disabled={!canAfford || (state.phase === 'PLAYING' && player.actionsRemaining <= 0)}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    background: canAfford ? '#1a4a3a' : '#21262d',
                    color: canAfford ? '#22c55e' : '#484f58',
                    border: '1px solid #30363d',
                    borderRadius: '3px',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontSize: '10px',
                  }}
                >
                  {isDraft ? 'Reclutar' : 'Comprar'}
                </button>
                {!isDraft && (
                  <button
                    onClick={() => onRefresh(i)}
                    disabled={state.shop.refreshUsedThisTurn || player.gold < 1}
                    style={{
                      padding: '3px 6px',
                      background: '#21262d',
                      color: !state.shop.refreshUsedThisTurn && player.gold >= 1 ? '#818cf8' : '#484f58',
                      border: '1px solid #30363d',
                      borderRadius: '3px',
                      cursor: !state.shop.refreshUsedThisTurn && player.gold >= 1 ? 'pointer' : 'not-allowed',
                      fontSize: '10px',
                    }}
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
