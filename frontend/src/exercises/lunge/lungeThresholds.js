// PoseFit Implementation Plan, section 8.4. The accepted bottom band uses
// the documented observed front-knee values surrounding the ~90° target.
export const LUNGE_DEPTH = {
  target: 90,
  goodMin: 82.91,
  goodMax: 103,
  startMin: 160,
  incompleteAttemptMax: 135,
};

export const LUNGE_VISIBILITY = {
  required: 0.5,
  sidePair: 0.35,
};

export const LUNGE_POSITION = {
  minBodySpan: 0.28,
  maxSideProfileWidthRatio: 0.3,
};

export const LUNGE_STABILITY = {
  validBottomFrames: 3,
};
