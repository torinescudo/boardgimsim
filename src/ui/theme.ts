// ============================================================
// Design Tokens – Centralized theme/branding
// ============================================================

export const COLORS = {
  faction: {
    HUMAN: '#d4a017',
    ELF: '#22c55e',
    ORC: '#dc2626',
    UNDEAD: '#8b5cf6',
  },
  terrain: {
    PLAIN: '#2d3436',
    FOREST: '#1a5f3d',
    HILL: '#5a4a3a',
    WATER: '#1e4d6b',
    CRYPT: '#3d2d3d',
    VILLAGE: '#6b4423',
    CITY: '#4a5568',
    FORTRESS: '#2d3d4d',
    CAMP: '#5a3a2a',
  },
  ui: {
    bg: '#0d1117',
    bgPanel: '#161b22',
    border: '#30363d',
    borderLight: '#21262d',
    text: '#c9d1d9',
    textDim: '#8b949e',
    error: '#f85149',
    success: '#3fb950',
  },
  log: {
    ACTIVATE: '#c9d1d9',
    MOVE: '#79c0ff',
    COMBAT: '#ff7b72',
    DAMAGE: '#ff7b72',
    HEAL: '#3fb950',
    DEATH: '#f85149',
    REVIVE: '#a371f7',
    REMAINS: '#d29922',
    DEBUFF: '#ff7b72',
    INCOME: '#3fb950',
    VICTORY: '#58a6ff',
    PHASE_CHANGE: '#79c0ff',
    PRE_DRAFT: '#79c0ff',
    ROUND_END: '#8b949e',
    ROUND_START: '#3fb950',
  },
};

export const SIZES = {
  hexRadius: 32,
  hexStrokeWidth: 2,
  fontSize: {
    lg: 14,
    md: 12,
    sm: 10,
    xs: 8,
  },
  spacing: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
  border: {
    sm: 1,
    md: 2,
    radius: {
      sm: 4,
      md: 6,
      lg: 8,
    },
  },
  panel: {
    width: 320,
    padding: 12,
  },
};

export const STYLES = {
  button: {
    padding: '6px 12px',
    borderRadius: SIZES.border.radius.md,
    border: `1px solid ${COLORS.ui.border}`,
    background: COLORS.ui.bgPanel,
    color: COLORS.ui.text,
    cursor: 'pointer',
    fontSize: SIZES.fontSize.sm,
  },
  buttonHover: {
    background: COLORS.ui.border,
  },
  panel: {
    padding: SIZES.panel.padding,
    background: COLORS.ui.bgPanel,
    borderRadius: SIZES.border.radius.lg,
    border: `1px solid ${COLORS.ui.border}`,
    color: COLORS.ui.text,
  },
  panelTitle: {
    fontSize: SIZES.fontSize.md,
    fontWeight: 'bold' as const,
    marginBottom: SIZES.spacing.md,
    color: COLORS.ui.text,
  },
};
