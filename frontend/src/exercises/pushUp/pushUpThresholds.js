// PoseFit Implementation Plan, section 8.2.
export const PUSH_UP_ELBOW = {
  topMin: 150,
  bottomMax: 90,
  optimalBottomMin: 50,
  optimalBottomMax: 70,
  incompleteAttemptMax: 135,
};

export const PUSH_UP_ALIGNMENT = {
  bodyMin: 160,
  bodyMax: 180,
  maxArmDifference: 30,
  readinessVisibility: 0.5,
  bilateralVisibility: 0.55,
};

// Camera-position checks are kept separate from biomechanical form thresholds.
export const PUSH_UP_POSITION = {
  minBodyAxisLength: 0.22,
  maxHorizontalAngle: 30,
  pairedLandmarkVisibility: 0.35,
  maxSideProfileWidthRatio: 0.3,
  maxSegmentVerticalRatio: 0.45,
};
