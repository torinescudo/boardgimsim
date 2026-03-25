import React, { useState } from 'react';
import { Faction } from '../../engine/core/types';
import { ALL_MAPS } from '../../content/maps/maps';
import { LEADERS } from '../../content/leaders/leaders';

interface SetupScreenProps {
  onStartGame: (mapId: string, p1Faction: Faction, p2Faction: Faction) => void;
  onBack: () => void;
}

const FACTIONS: { id: Faction; name: string; color: string }[] = [
  { id: 'HUMAN', name: 'Humanos', color: '#d4a017' },
  { id: 'ELF', name: 'Elfos', color: '#22c55e' },
  { id: 'ORC', name: 'Orcos', color: '#dc2626' },
  { id: 'UNDEAD', name: 'No Muertos', color: '#8b5cf6' },
];

export function SetupScreen({ onStartGame, onBack }: SetupScreenProps) {
  const [selectedMap, setSelectedMap] = useState(ALL_MAPS[0].id);
  const [p1Faction, setP1Faction] = useState<Faction>('HUMAN');
  const [p2Faction, setP2Faction] = useState<Faction>('ORC');

  const canStart = p1Faction !== p2Faction;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px',
      height: '100vh',
      background: '#0d1117',
      overflow: 'auto',
    }}>
      <h2 style={{ color: '#e6edf3', marginBottom: '32px' }}>Configurar Partida</h2>

      {/* Map Selection */}
      <section style={{ marginBottom: '32px', width: '100%', maxWidth: '600px' }}>
        <h3 style={{ color: '#8b949e', marginBottom: '12px' }}>Mapa</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ALL_MAPS.map(map => (
            <button
              key={map.id}
              onClick={() => setSelectedMap(map.id)}
              style={{
                padding: '12px 16px',
                background: selectedMap === map.id ? '#21262d' : '#161b22',
                border: selectedMap === map.id ? '2px solid #7c3aed' : '2px solid #30363d',
                borderRadius: '8px',
                color: '#e6edf3',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{map.name}</div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                {map.difficulty} – {map.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Faction Selection */}
      <section style={{ marginBottom: '32px', width: '100%', maxWidth: '600px' }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          {/* Player 1 */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#8b949e', marginBottom: '12px' }}>Jugador 1</h3>
            {FACTIONS.map(f => {
              const leader = LEADERS.find(l => l.faction === f.id)!;
              return (
                <button
                  key={f.id}
                  onClick={() => setP1Faction(f.id)}
                  disabled={f.id === p2Faction}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    marginBottom: '6px',
                    background: p1Faction === f.id ? '#21262d' : '#161b22',
                    border: p1Faction === f.id ? `2px solid ${f.color}` : '2px solid #30363d',
                    borderRadius: '6px',
                    color: f.id === p2Faction ? '#484f58' : '#e6edf3',
                    cursor: f.id === p2Faction ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: f.color, fontWeight: 700 }}>{f.name}</span>
                  <span style={{ color: '#8b949e', fontSize: '12px', marginLeft: '8px' }}>
                    {leader.name} (HP {leader.maxHp})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Player 2 */}
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#8b949e', marginBottom: '12px' }}>Jugador 2</h3>
            {FACTIONS.map(f => {
              const leader = LEADERS.find(l => l.faction === f.id)!;
              return (
                <button
                  key={f.id}
                  onClick={() => setP2Faction(f.id)}
                  disabled={f.id === p1Faction}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    marginBottom: '6px',
                    background: p2Faction === f.id ? '#21262d' : '#161b22',
                    border: p2Faction === f.id ? `2px solid ${f.color}` : '2px solid #30363d',
                    borderRadius: '6px',
                    color: f.id === p1Faction ? '#484f58' : '#e6edf3',
                    cursor: f.id === p1Faction ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ color: f.color, fontWeight: 700 }}>{f.name}</span>
                  <span style={{ color: '#8b949e', fontSize: '12px', marginLeft: '8px' }}>
                    {leader.name} (HP {leader.maxHp})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '16px' }}>
        <button onClick={onBack} style={{
          padding: '12px 32px',
          background: '#21262d',
          color: '#8b949e',
          border: '1px solid #30363d',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
        }}>
          Volver
        </button>
        <button
          onClick={() => canStart && onStartGame(selectedMap, p1Faction, p2Faction)}
          disabled={!canStart}
          style={{
            padding: '12px 32px',
            background: canStart ? '#7c3aed' : '#484f58',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Comenzar Partida
        </button>
      </div>
    </div>
  );
}
