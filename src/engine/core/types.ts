// ============================================================
// Fractured Veil – Core Types
// ============================================================

export type TerrainType =
  | 'PLAIN'
  | 'FOREST'
  | 'HILL'
  | 'CRYPT'
  | 'VILLAGE'
  | 'CITY'
  | 'FORTRESS'
  | 'CAMP'
  | 'WATER';

export type CycleAffinity = 'SUN' | 'MOON' | 'NEUTRAL';
export type Faction = 'HUMAN' | 'ELF' | 'ORC' | 'UNDEAD';
export type Tier = 1 | 2 | 3;
export type UnitTier = Tier | 'LEADER';
export type AttackMode = 'MELEE' | 'RANGED';
export type DieFaceResult = 'HIT' | 'MISS';
export type DieQuality = 'ADVANTAGE' | 'NORMAL' | 'DISADVANTAGE';
export type CyclePhase = 'DAY' | 'NIGHT';
export type MapDifficulty = 'EASY' | 'INTERMEDIATE' | 'HARD';

// ── Hex Coordinates (axial) ──
export interface HexCoord {
  q: number;
  r: number;
}

// ── Trait / Ability System ──
export type TraitTrigger =
  | 'ON_ROUND_START'
  | 'ON_TURN_START'
  | 'ON_ACTIVATION_START'
  | 'ON_MOVE_COST_QUERY'
  | 'ON_BEFORE_ATTACK_DECLARE'
  | 'ON_BUILD_ATTACK_DICE_POOL'
  | 'ON_AFTER_DAMAGE_APPLIED'
  | 'ON_UNIT_KILLED'
  | 'ON_HEAL_ATTEMPT'
  | 'ON_TURN_END'
  | 'ON_ROUND_END'
  | 'ON_ACTIVATION_END'
  | 'ON_DAMAGE_RECEIVED';

export interface TraitDefinition {
  id: string;
  name: string;
  description: string;
  trigger: TraitTrigger;
  /** Additional trait-specific config - gradually moving to discriminated union pattern */
  config?: Record<string, unknown>;
}

// ── Unit Definitions ──
export interface UnitDefinition {
  id: string;
  name: string;
  faction: Faction;
  tier: UnitTier;
  costGold?: number;
  maxHp: number;
  move: number;
  meleeDice: number;
  rangedDice: number;
  ascRequired?: number;
  cycleAffinity: CycleAffinity;
  goodTerrain: TerrainType;
  badTerrain: TerrainType;
  traits: TraitDefinition[];
  evolvesTo?: string[];
}

export interface LeaderDefinition {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  move: number;
  meleeDice: number;
  rangedDice: number;
  cycleAffinity: 'NEUTRAL';
  traits: TraitDefinition[];
}

// ── Status Effects ──
export interface StatusEffect {
  type: string;
  sourcePlayerId: string;
  sourceUnitId?: string;
  expiresOnRound?: number;
  expiresOnTurnOf?: string;
  data?: Record<string, unknown>;
}

// ── Unit Instance (runtime) ──
export interface UnitInstance {
  instanceId: string;
  defId: string;
  ownerPlayerId: string;
  hp: number;
  maxHp: number;
  ascMarks: number;
  exhausted: boolean;
  hasActivatedThisRound: boolean;
  position: HexCoord;
  statusEffects: StatusEffect[];
  remainsToken?: boolean;
  /** Track per-round trait usages */
  traitUsages: Record<string, number>;
  /** Track if unit moved during current activation */
  movedThisActivation: boolean;
  /** Track if unit attacked during current activation */
  attackedThisActivation: boolean;
  /** Track hexes moved this activation for charge abilities */
  hexesMovedThisActivation: number;
  /** Damage reduction remaining this round */
  damageReductionThisRound: number;
  /** Track first attack of the round for buffs */
  hasAttackedThisRound: boolean;
}

// ── Remains Token ──
export interface RemainsToken {
  position: HexCoord;
  defId: string;
  ownerPlayerId: string;
  instanceId: string;
}

// ── Map ──
export interface HexCell {
  q: number;
  r: number;
  terrain: TerrainType;
  metadata?: {
    spawnOwner?: string; // 'PLAYER1' | 'PLAYER2'
    fortressOwner?: string;
    cityId?: string;
    villageId?: string;
  };
}

export interface MapDefinition {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  description: string;
  strategyText: string;
  cells: HexCell[];
  spawnZones: {
    PLAYER1: HexCoord[];
    PLAYER2: HexCoord[];
  };
  recommendedScenario?: string;
}

// ── Shop ──
export interface ShopSlot {
  unitDefId: string;
  addedOnRound: number;
  slotIndex: number;
}

export interface ShopState {
  deck: string[];
  visible: (ShopSlot | null)[];
  refreshUsedThisTurn: boolean;
}

// ── Reserve ──
export interface ReserveState {
  remainingTier2: string[];
  remainingTier3: string[];
}

// ── Blessing ──
export interface BlessingState {
  type: 'FREE_ACTIVATION' | 'FREE_RECRUIT' | 'FREE_REFRESH' | 'GOLD_AND_MOVE';
  consumed: boolean;
  goldAmount?: number;
}

// ── Player ──
export interface PlayerState {
  id: string;
  faction: Faction;
  leaderDefId: string;
  gold: number;
  actionsRemaining: number;
  extraActionsPurchasedThisRound: number;
  blessing: BlessingState | null;
}

// ── Log ──
export interface LogEntry {
  round: number;
  playerId?: string;
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Winner ──
export interface WinnerState {
  playerId: string;
  reason: 'LEADER_KILLED' | 'CITY_DOMINATION';
}

// ── Game State ──
export interface GameState {
  round: number;
  activePlayerId: string;
  initiativePlayerId: string;
  cycle: CyclePhase;
  phase: GamePhase;
  players: [PlayerState, PlayerState];
  units: UnitInstance[];
  remainsTokens: RemainsToken[];
  map: MapDefinition;
  shop: ShopState;
  reserve: ReserveState;
  log: LogEntry[];
  winner: WinnerState | null;
  /** Pre-game draft state */
  preDraftPurchasesRemaining: number;
  preDraftCurrentPlayer: string;
}

export type GamePhase =
  | 'SETUP'
  | 'PRE_DRAFT'
  | 'PLAYING'
  | 'ROUND_END'
  | 'GAME_OVER';

// ── Actions ──
export type GameAction =
  | ActivateUnitAction
  | MoveUnitAction
  | AttackAction
  | RecruitAction
  | AscendAction
  | BuyExtraActionAction
  | RefreshShopAction
  | EndTurnAction
  | EndActivationAction
  | PreDraftBuyAction
  | UseBlessingAction;

export interface ActivateUnitAction {
  type: 'ACTIVATE_UNIT';
  unitInstanceId: string;
}

export interface MoveUnitAction {
  type: 'MOVE_UNIT';
  unitInstanceId: string;
  path: HexCoord[];
}

export interface AttackAction {
  type: 'ATTACK';
  attackerInstanceId: string;
  targetInstanceId: string;
  mode: AttackMode;
}

export interface RecruitAction {
  type: 'RECRUIT';
  shopSlotIndex: number;
  targetHex: HexCoord;
}

export interface AscendAction {
  type: 'ASCEND';
  unitInstanceId: string;
  targetDefId: string;
}

export interface BuyExtraActionAction {
  type: 'BUY_EXTRA_ACTION';
}

export interface RefreshShopAction {
  type: 'REFRESH_SHOP';
  slotIndex: number;
}

export interface EndTurnAction {
  type: 'END_TURN';
}

export interface EndActivationAction {
  type: 'END_ACTIVATION';
  unitInstanceId: string;
}

export interface PreDraftBuyAction {
  type: 'PRE_DRAFT_BUY';
  shopSlotIndex: number;
  targetHex: HexCoord;
}

export interface UseBlessingAction {
  type: 'USE_BLESSING';
  /** For GOLD_AND_MOVE: unit to move */
  unitInstanceId?: string;
  targetHex?: HexCoord;
}

// ── Dice pool for combat resolution ──
export interface DicePool {
  dice: DieQuality[];
}

export interface CombatResult {
  attackerInstanceId: string;
  targetInstanceId: string;
  mode: AttackMode;
  dicePool: DicePool;
  rolls: number[];
  results: DieFaceResult[];
  totalHits: number;
  damageDealt: number;
  targetKilled: boolean;
  breakdown: CombatBreakdown;
}

export interface CombatBreakdown {
  baseDice: number;
  terrainAdvantage: number;
  terrainDisadvantage: number;
  cycleAdvantage: number;
  cycleDisadvantage: number;
  traitAdvantage: number;
  traitDisadvantage: number;
  netModifier: number;
}

// ── Validation result ──
export interface ActionValidation {
  valid: boolean;
  reason?: string;
}
