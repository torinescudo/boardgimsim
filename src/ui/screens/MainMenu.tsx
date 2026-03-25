import React from 'react';

interface MainMenuProps {
  onStart: () => void;
}

export function MainMenu({ onStart }: MainMenuProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
      gap: '24px',
    }}>
      <h1 style={{
        fontSize: '48px',
        fontWeight: 700,
        letterSpacing: '4px',
        color: '#e6edf3',
        textTransform: 'uppercase',
        textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
      }}>
        Fractured Veil
      </h1>
      <p style={{ color: '#8b949e', fontSize: '16px', marginBottom: '32px' }}>
        Juego táctico por turnos sobre hexágonos – 2 jugadores
      </p>
      <button
        onClick={onStart}
        style={{
          padding: '16px 48px',
          fontSize: '18px',
          fontWeight: 600,
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
        }}
        onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        Nueva Partida
      </button>
    </div>
  );
}
