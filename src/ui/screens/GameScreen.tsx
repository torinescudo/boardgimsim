import React, { useState, useCallback, useMemo } from 'react';
import { GameState, UnitInstance, HexCoord, AttackMode } from '../../engine/core/types';
import { executeAction, getGameRng } from '../../engine/actions/executor';
import { validateAction } from '../../engine/rules/validation';
import { getLegalMoves, getLegalAttacks, getAvailableSpawnHexes } from '../../engine/selectors/selectors';
import {
  hexEquals, hexDistance,
  buildCellMap as buildCellMapFn,
  hexNeighbors as hexNeighborsFn,
  hexKey as hexKeyFn,
  terrainMoveCost as terrainMoveCostFn,
} from '../../engine/map/hex';
import { getUnitDef, getLeaderDef } from '../../content/units/index';
import { HexBoard } from '../board/HexBoard';
import { PlayerPanel } from '../panels/PlayerPanel';
import { UnitPanel } from '../panels/UnitPanel';
import { ShopPanel } from '../panels/ShopPanel';
import { ReservePanel } from '../panels/ReservePanel';
import { LogPanel } from '../panels/LogPanel';
import { AscendPanel } from '../panels/AscendPanel';

type UIMode = 'IDLE' | 'UNIT_SELECTED' | 'MOVE_TARGET' | 'ATTACK_TARGET' | 'RECRUIT_PLACE' | 'BLESSING_MOVE';

interface GameScreenProps {
  state: GameState;
  onUpdate: (state: GameState) => void;
}

export function GameScreen({ state, onUpdate }: GameScreenProps) {
  const [selectedUnit, setSelectedUnit] = useState<UnitInstance | null>(null);
  const [uiMode, setUiMode] = useState<UIMode>('IDLE');
  const [pendingRecruitSlot, setPendingRecruitSlot] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const doAction = useCallback((action: any) => {
    const result = executeAction(state, action);
    if (result) {
      setStatusMessage(result);
      return false;
    }
    setStatusMessage('');
    onUpdate({ ...state });
    return true;
  }, [state, onUpdate]);

  // Compute legal moves/attacks for selected unit
  const legalMoves = useMemo(() => {
    if (!selectedUnit || uiMode !== 'UNIT_SELECTED') return [];
    if (selectedUnit.movedThisActivation) return [];
    return getLegalMoves(state, selectedUnit).map(r => r.coord);
  }, [selectedUnit, state, uiMode]);

  const legalAttacks = useMemo(() => {
    if (!selectedUnit || uiMode !== 'UNIT_SELECTED') return [];
    const attacks = getLegalAttacks(state, selectedUnit);
    return attacks.map(a => a.target.position);
  }, [selectedUnit, state, uiMode]);

  // Legal spawn hexes when placing recruit
  const spawnHexes = useMemo(() => {
    if (uiMode !== 'RECRUIT_PLACE') return [];
    return getAvailableSpawnHexes(state, state.phase === 'PRE_DRAFT' ? state.preDraftCurrentPlayer : state.activePlayerId);
  }, [state, uiMode]);

  const handleHexClick = useCallback((coord: HexCoord) => {
    if (uiMode === 'RECRUIT_PLACE' && pendingRecruitSlot !== null) {
      if (spawnHexes.some(s => hexEquals(s, coord))) {
        const actionType = state.phase === 'PRE_DRAFT' ? 'PRE_DRAFT_BUY' : 'RECRUIT';
        if (doAction({ type: actionType, shopSlotIndex: pendingRecruitSlot, targetHex: coord })) {
          setUiMode('IDLE');
          setPendingRecruitSlot(null);
          setSelectedUnit(null);
        }
      } else {
        setStatusMessage('Selecciona un hex de despliegue válido.');
      }
      return;
    }

    if (uiMode === 'BLESSING_MOVE' && selectedUnit) {
      if (doAction({ type: 'USE_BLESSING', unitInstanceId: selectedUnit.instanceId, targetHex: coord })) {
        setUiMode('IDLE');
        setSelectedUnit(null);
      }
      return;
    }

    if (uiMode === 'UNIT_SELECTED' && selectedUnit) {
      // Try to move
      if (legalMoves.some(m => hexEquals(m, coord))) {
        // Find path (simple: use direct coord since we validated reachability)
        const path = findSimplePath(selectedUnit.position, coord, state);
        if (path) {
          doAction({ type: 'MOVE_UNIT', unitInstanceId: selectedUnit.instanceId, path });
          // Stay selected for potential attack
        }
        return;
      }
    }

    // Deselect
    setSelectedUnit(null);
    setUiMode('IDLE');
    setStatusMessage('');
  }, [uiMode, selectedUnit, pendingRecruitSlot, spawnHexes, state, legalMoves, doAction]);

  const handleUnitClick = useCallback((unit: UnitInstance) => {
    if (uiMode === 'UNIT_SELECTED' && selectedUnit) {
      // Check if clicking enemy = attack
      if (unit.ownerPlayerId !== state.activePlayerId && legalAttacks.some(a => hexEquals(a, unit.position))) {
        // Determine attack mode
        const dist = hexDistance(selectedUnit.position, unit.position);
        const aDef = getUnitDef(selectedUnit.defId) || getLeaderDef(selectedUnit.defId);
        let mode: AttackMode = 'MELEE';
        if (dist > 1 && aDef && aDef.rangedDice > 0) {
          mode = 'RANGED';
        }
        if (doAction({ type: 'ATTACK', attackerInstanceId: selectedUnit.instanceId, targetInstanceId: unit.instanceId, mode })) {
          // End activation after attack
          doAction({ type: 'END_ACTIVATION', unitInstanceId: selectedUnit.instanceId });
          setSelectedUnit(null);
          setUiMode('IDLE');
        }
        return;
      }
    }

    // Select own unit
    const isOwn = unit.ownerPlayerId === state.activePlayerId ||
      (state.phase === 'PRE_DRAFT' && unit.ownerPlayerId === state.preDraftCurrentPlayer);

    if (isOwn && !unit.exhausted && !unit.hasActivatedThisRound && state.phase === 'PLAYING') {
      // Activate if not already
      if (selectedUnit?.instanceId !== unit.instanceId) {
        // Auto-activate
        const val = validateAction(state, { type: 'ACTIVATE_UNIT', unitInstanceId: unit.instanceId });
        if (val.valid) {
          doAction({ type: 'ACTIVATE_UNIT', unitInstanceId: unit.instanceId });
          const updated = state.units.find(u => u.instanceId === unit.instanceId)!;
          setSelectedUnit(updated);
          setUiMode('UNIT_SELECTED');
        } else {
          setStatusMessage(val.reason || 'No se puede activar.');
          setSelectedUnit(unit);
          setUiMode('IDLE');
        }
      } else {
        // Already selected, deselect
        doAction({ type: 'END_ACTIVATION', unitInstanceId: unit.instanceId });
        setSelectedUnit(null);
        setUiMode('IDLE');
      }
    } else {
      // View enemy or exhausted unit
      setSelectedUnit(unit);
      setUiMode('IDLE');
    }
  }, [uiMode, selectedUnit, state, legalAttacks, doAction]);

  const handleBuyFromShop = useCallback((slotIndex: number) => {
    setPendingRecruitSlot(slotIndex);
    setUiMode('RECRUIT_PLACE');
    setStatusMessage('Selecciona un hex de despliegue para la unidad.');
  }, []);

  const handleRefreshShop = useCallback((slotIndex: number) => {
    doAction({ type: 'REFRESH_SHOP', slotIndex });
  }, [doAction]);

  const handleBuyExtraAction = useCallback(() => {
    doAction({ type: 'BUY_EXTRA_ACTION' });
  }, [doAction]);

  const handleEndTurn = useCallback(() => {
    if (selectedUnit) {
      doAction({ type: 'END_ACTIVATION', unitInstanceId: selectedUnit.instanceId });
    }
    doAction({ type: 'END_TURN' });
    setSelectedUnit(null);
    setUiMode('IDLE');
  }, [doAction, selectedUnit]);

  const handleAscend = useCallback((unitId: string, targetDefId: string) => {
    doAction({ type: 'ASCEND', unitInstanceId: unitId, targetDefId });
  }, [doAction]);

  const handleUseBlessing = useCallback(() => {
    const player = state.players.find(p => p.id === state.activePlayerId)!;
    if (!player.blessing) return;

    if (player.blessing.type === 'GOLD_AND_MOVE') {
      setUiMode('BLESSING_MOVE');
      setStatusMessage('Selecciona una unidad y luego un hex adyacente.');
    } else {
      doAction({ type: 'USE_BLESSING' });
    }
  }, [state, doAction]);

  const displayMoves = uiMode === 'UNIT_SELECTED' ? legalMoves : (uiMode === 'RECRUIT_PLACE' ? spawnHexes : []);
  const displayAttacks = uiMode === 'UNIT_SELECTED' ? legalAttacks : [];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0d1117',
    }}>
      {/* Main board area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Status bar */}
        <div style={{
          padding: '8px 16px',
          background: '#161b22',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#e6edf3', fontSize: '14px' }}>
            {state.phase === 'PRE_DRAFT'
              ? `Draft – Turno de ${state.preDraftCurrentPlayer}`
              : `Ronda ${state.round} – ${state.cycle === 'DAY' ? 'Día' : 'Noche'} – Turno de ${state.activePlayerId}`
            }
          </span>
          {statusMessage && (
            <span style={{ color: '#f59e0b', fontSize: '12px' }}>{statusMessage}</span>
          )}
          {uiMode !== 'IDLE' && (
            <button onClick={() => { setUiMode('IDLE'); setSelectedUnit(null); setPendingRecruitSlot(null); setStatusMessage(''); }}
              style={{ padding: '4px 12px', background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
              Cancelar
            </button>
          )}
        </div>

        {/* Hex Board */}
        <div style={{ flex: 1, padding: '8px' }}>
          <HexBoard
            state={state}
            selectedUnit={selectedUnit}
            legalMoves={displayMoves}
            legalAttacks={displayAttacks}
            onHexClick={handleHexClick}
            onUnitClick={handleUnitClick}
          />
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{
        width: '320px',
        background: '#0d1117',
        borderLeft: '1px solid #30363d',
        padding: '8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <PlayerPanel
          state={state}
          onBuyExtraAction={handleBuyExtraAction}
          onEndTurn={handleEndTurn}
          onUseBlessing={handleUseBlessing}
        />

        {selectedUnit && <UnitPanel unit={selectedUnit} />}

        <AscendPanel state={state} onAscend={handleAscend} />

        <ShopPanel
          state={state}
          onBuy={handleBuyFromShop}
          onRefresh={handleRefreshShop}
        />

        <ReservePanel state={state} />

        <LogPanel state={state} />
      </div>
    </div>
  );
}

/** Simple pathfinding: find any valid path to target within movement */
function findSimplePath(from: HexCoord, to: HexCoord, state: GameState): HexCoord[] | null {
  const cellMap = buildCellMapFn(state.map.cells);

  interface Node { coord: HexCoord; path: HexCoord[]; cost: number }
  const visited = new Set<string>();
  const queue: Node[] = [{ coord: from, path: [], cost: 0 }];
  visited.add(hexKeyFn(from));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = hexNeighborsFn(current.coord);

    for (const n of neighbors) {
      const k = hexKeyFn(n);
      if (visited.has(k)) continue;
      visited.add(k);

      const cell = cellMap.get(k);
      if (!cell || cell.terrain === 'WATER') continue;

      const cost = current.cost + terrainMoveCostFn(cell.terrain);
      const newPath = [...current.path, n];

      if (hexEquals(n, to)) {
        return newPath;
      }

      // Don't path through occupied hexes
      if (state.units.some(u => u.hp > 0 && hexEquals(u.position, n))) continue;

      queue.push({ coord: n, path: newPath, cost });
    }
  }

  return null;
}
