import React, { useMemo } from 'react';
import { GameState, HexCell, HexCoord, UnitInstance, TerrainType } from '../../engine/core/types';
import { hexKey, hexEquals } from '../../engine/map/hex';
import { getUnitDef, getLeaderDef } from '../../content/units/index';
import { LEADERS } from '../../content/leaders/leaders';

interface HexBoardProps {
  state: GameState;
  selectedUnit: UnitInstance | null;
  legalMoves: HexCoord[];
  legalAttacks: HexCoord[];
  onHexClick: (coord: HexCoord) => void;
  onUnitClick: (unit: UnitInstance) => void;
}

const HEX_SIZE = 32;
const SQRT3 = Math.sqrt(3);

const TERRAIN_COLORS: Record<TerrainType, string> = {
  PLAIN: '#2d4a2d',
  FOREST: '#1a3a1a',
  HILL: '#5a4a3a',
  CRYPT: '#3a2a4a',
  VILLAGE: '#4a5a2a',
  CITY: '#4a4a5a',
  FORTRESS: '#5a3a3a',
  CAMP: '#4a3a2a',
  WATER: '#1a3a5a',
};

const TERRAIN_LABELS: Record<TerrainType, string> = {
  PLAIN: '',
  FOREST: 'B',
  HILL: 'C',
  CRYPT: 'Cr',
  VILLAGE: 'A',
  CITY: 'Ci',
  FORTRESS: 'F',
  CAMP: 'Ca',
  WATER: '~',
};

const FACTION_COLORS: Record<string, string> = {
  HUMAN: '#d4a017',
  ELF: '#22c55e',
  ORC: '#dc2626',
  UNDEAD: '#8b5cf6',
};

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (SQRT3 * q + (SQRT3 / 2) * r);
  const y = HEX_SIZE * (1.5 * r);
  return { x, y };
}

function hexPoints(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + HEX_SIZE * Math.cos(angle)},${cy + HEX_SIZE * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

export function HexBoard({ state, selectedUnit, legalMoves, legalAttacks, onHexClick, onUnitClick }: HexBoardProps) {
  const legalMoveSet = useMemo(() => new Set(legalMoves.map(hexKey)), [legalMoves]);
  const legalAttackSet = useMemo(() => new Set(legalAttacks.map(hexKey)), [legalAttacks]);

  // Compute bounds for viewBox
  const allPixels = state.map.cells.map(c => axialToPixel(c.q, c.r));
  const minX = Math.min(...allPixels.map(p => p.x)) - HEX_SIZE * 2;
  const maxX = Math.max(...allPixels.map(p => p.x)) + HEX_SIZE * 2;
  const minY = Math.min(...allPixels.map(p => p.y)) - HEX_SIZE * 2;
  const maxY = Math.max(...allPixels.map(p => p.y)) + HEX_SIZE * 2;
  const width = maxX - minX;
  const height = maxY - minY;

  // Build unit map for quick lookup
  const unitMap = useMemo(() => {
    const m = new Map<string, UnitInstance>();
    for (const u of state.units) {
      if (u.hp > 0) m.set(hexKey(u.position), u);
    }
    return m;
  }, [state.units]);

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      style={{ width: '100%', height: '100%', background: '#0a0e14' }}
    >
      {state.map.cells.map(cell => {
        const { x, y } = axialToPixel(cell.q, cell.r);
        const key = hexKey(cell);
        const isLegalMove = legalMoveSet.has(key);
        const isLegalAttack = legalAttackSet.has(key);
        const unit = unitMap.get(key);
        const isSelected = selectedUnit && hexEquals(selectedUnit.position, cell);
        const hasRemains = state.remainsTokens.some(t => hexEquals(t.position, cell));

        let fillColor = TERRAIN_COLORS[cell.terrain];
        let strokeColor = '#1a1f29';
        let strokeWidth = 1;

        if (isSelected) {
          strokeColor = '#ffffff';
          strokeWidth = 2.5;
        } else if (isLegalMove) {
          fillColor = '#1a4a3a';
          strokeColor = '#22c55e';
          strokeWidth = 2;
        } else if (isLegalAttack) {
          fillColor = '#4a1a1a';
          strokeColor = '#ef4444';
          strokeWidth = 2;
        }

        return (
          <g key={key} onClick={() => {
            if (unit) {
              onUnitClick(unit);
            } else {
              onHexClick(cell);
            }
          }} style={{ cursor: 'pointer' }}>
            <polygon
              points={hexPoints(x, y)}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {/* Terrain label */}
            {TERRAIN_LABELS[cell.terrain] && (
              <text x={x} y={y - HEX_SIZE * 0.55} textAnchor="middle"
                fill="#8b949e" fontSize="8" fontFamily="monospace">
                {TERRAIN_LABELS[cell.terrain]}
              </text>
            )}
            {/* Spawn indicator */}
            {cell.metadata?.spawnOwner && (
              <circle cx={x + HEX_SIZE * 0.3} cy={y - HEX_SIZE * 0.4} r={3}
                fill={cell.metadata.spawnOwner === 'PLAYER1' ? '#3b82f6' : '#f59e0b'}
                opacity={0.6}
              />
            )}
            {/* Remains token */}
            {hasRemains && !unit && (
              <text x={x} y={y + 3} textAnchor="middle" fill="#8b949e" fontSize="14">
                &#9760;
              </text>
            )}
            {/* Unit */}
            {unit && (
              <UnitToken unit={unit} x={x} y={y} isSelected={!!isSelected} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function UnitToken({ unit, x, y, isSelected }: { unit: UnitInstance; x: number; y: number; isSelected: boolean }) {
  const def = getUnitDef(unit.defId) || getLeaderDef(unit.defId);
  if (!def) return null;

  const isLeader = LEADERS.some(l => l.id === unit.defId);
  const color = FACTION_COLORS[def.faction] || '#888';
  const playerMarker = unit.ownerPlayerId === 'PLAYER1' ? '#3b82f6' : '#f59e0b';
  const hpRatio = unit.hp / unit.maxHp;

  const r = HEX_SIZE * 0.4;

  return (
    <g>
      {/* Unit circle */}
      <circle cx={x} cy={y} r={r}
        fill={unit.exhausted ? '#333' : '#1a1f29'}
        stroke={color}
        strokeWidth={isLeader ? 3 : 2}
        opacity={unit.exhausted ? 0.5 : 1}
      />
      {/* HP bar */}
      <rect x={x - r} y={y + r + 2} width={r * 2 * hpRatio} height={3}
        fill={hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444'}
        rx={1}
      />
      <rect x={x - r} y={y + r + 2} width={r * 2} height={3}
        fill="none" stroke="#333" strokeWidth={0.5} rx={1}
      />
      {/* Player indicator */}
      <circle cx={x + r * 0.7} cy={y - r * 0.7} r={3}
        fill={playerMarker}
      />
      {/* Tier indicator */}
      <text x={x} y={y + 4} textAnchor="middle" fill={color}
        fontSize="10" fontWeight="bold" fontFamily="monospace">
        {isLeader ? 'L' : (def as any).tier}
      </text>
      {/* Activated indicator */}
      {unit.hasActivatedThisRound && (
        <circle cx={x - r * 0.7} cy={y - r * 0.7} r={2.5}
          fill="#ef4444" opacity={0.8}
        />
      )}
      {/* Ascension marks */}
      {unit.ascMarks > 0 && (
        <text x={x} y={y - r - 2} textAnchor="middle" fill="#fbbf24"
          fontSize="8" fontFamily="monospace">
          {unit.ascMarks}
        </text>
      )}
    </g>
  );
}
