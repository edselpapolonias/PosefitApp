// PoseFit Implementation Plan, section 8.5.
export const SIT_UP_HIP = {
  topMax: 90,
  startMin: 150,
  incompleteAttemptMax: 120,
};

export const SIT_UP_KNEE = {
  target: 90,
  tolerance: 15,
  min: 75,
  max: 105,
};

export const SIT_UP_STABILITY = { validTopFrames: 3 };
export const SIT_UP_VISIBILITY = { required: 0.5, sidePair: 0.35 };
export const SIT_UP_POSITION = { minBodySpan: 0.25, maxSideProfileWidthRatio: 0.3 };
