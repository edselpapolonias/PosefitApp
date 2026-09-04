export const PLANK_LANDMARKS = {
  left: { shoulder: 11, hip: 23, ankle: 27 },
  right: { shoulder: 12, hip: 24, ankle: 28 },
};

export const PLANK_CLASS_COLORS = {
  good: {
    skeleton: '#22c55e',
    hex: '#22c55e',
    label: 'Good Alignment',
  },
  low: {
    skeleton: '#ef4444',
    hex: '#ef4444',
    label: 'Hips Too Low',
  },
  high: {
    skeleton: '#f59e0b',
    hex: '#f59e0b',
    label: 'Hips Too High',
  },
};

export const PLANK_SESSION_STATES = {
  WAITING_FOR_POSITION: 'WAITING_FOR_POSITION',
  VALIDATING_POSITION: 'VALIDATING_POSITION',
  PLANK_ACTIVE: 'PLANK_ACTIVE',
  RESTING: 'RESTING',
  SET_COMPLETE: 'SET_COMPLETE',
  SESSION_COMPLETE: 'SESSION_COMPLETE',
};
