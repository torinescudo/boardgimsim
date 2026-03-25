import React, { useState, useCallback } from 'react';
import { GameState, Faction } from '../engine/core/types';
import { createGameState } from '../engine/state/gameState';
import { setGameRng } from '../engine/actions/executor';
import { createRng } from '../engine/rng/rng';
import { ALL_MAPS } from '../content/maps/maps';
import { SCENARIOS } from '../content/scenarios/scenarios';
import { LEADERS } from '../content/leaders/leaders';
import { MainMenu } from '../ui/screens/MainMenu';
import { SetupScreen } from '../ui/screens/SetupScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { VictoryScreen } from '../ui/screens/VictoryScreen';

type AppScreen = 'MENU' | 'SETUP' | 'GAME' | 'VICTORY';

export function App() {
  const [screen, setScreen] = useState<AppScreen>('MENU');
  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStartSetup = useCallback(() => {
    setScreen('SETUP');
  }, []);

  const handleStartGame = useCallback((
    mapId: string,
    p1Faction: Faction,
    p2Faction: Faction,
  ) => {
    const map = ALL_MAPS.find(m => m.id === mapId)!;
    const seed = Date.now();
    const rng = createRng(seed);
    setGameRng(rng);
    const state = createGameState(map, p1Faction, p2Faction, seed);
    setGameState(state);
    setScreen('GAME');
  }, []);

  const handleGameUpdate = useCallback((newState: GameState) => {
    setGameState({ ...newState });
    if (newState.winner) {
      setScreen('VICTORY');
    }
  }, []);

  const handleReturnToMenu = useCallback(() => {
    setGameState(null);
    setScreen('MENU');
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {screen === 'MENU' && <MainMenu onStart={handleStartSetup} />}
      {screen === 'SETUP' && (
        <SetupScreen
          onStartGame={handleStartGame}
          onBack={() => setScreen('MENU')}
        />
      )}
      {screen === 'GAME' && gameState && (
        <GameScreen
          state={gameState}
          onUpdate={handleGameUpdate}
        />
      )}
      {screen === 'VICTORY' && gameState && (
        <VictoryScreen
          state={gameState}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}
