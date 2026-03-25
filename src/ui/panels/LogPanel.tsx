import React, { useRef, useEffect } from 'react';
import { GameState } from '../../engine/core/types';

interface LogPanelProps {
  state: GameState;
}

const TYPE_COLORS: Record<string, string> = {
  COMBAT: '#ef4444',
  DEATH: '#dc2626',
  MOVE: '#22c55e',
  RECRUIT: '#3b82f6',
  ASCEND: '#fbbf24',
  HEAL: '#10b981',
  BLESSING: '#c084fc',
  VICTORY: '#f59e0b',
  INCOME: '#fbbf24',
  SHOP_ROTATE: '#8b949e',
  ROUND_START: '#818cf8',
  ROUND_END: '#818cf8',
  TURN_CHANGE: '#6e7681',
  ACTIVATE: '#6e7681',
  DEBUFF: '#ef4444',
  REVIVE: '#c084fc',
  REMAINS: '#8b949e',
};

export function LogPanel({ state }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log.length]);

  // Show last 50 entries
  const entries = state.log.slice(-50);

  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: '8px',
      padding: '8px',
      height: '200px',
      overflowY: 'auto',
      fontSize: '11px',
      fontFamily: 'monospace',
    }}>
      <div style={{ color: '#e6edf3', fontWeight: 600, fontSize: '12px', marginBottom: '6px', position: 'sticky', top: 0, background: '#161b22' }}>
        Registro de Eventos
      </div>
      {entries.map((entry, i) => (
        <div key={i} style={{ marginBottom: '2px', lineHeight: '1.4' }}>
          <span style={{ color: '#484f58' }}>[R{entry.round}] </span>
          <span style={{ color: TYPE_COLORS[entry.type] || '#8b949e' }}>
            {entry.message}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
