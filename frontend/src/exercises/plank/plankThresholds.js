// PoseFit Implementation Plan, section 8.3.
export const PLANK_ALIGNMENT = {
  goodMin: 170,
  goodMax: 210,
  sideVisibility: 0.55,
  readinessVisibility: 0.5,
  maxFrameDeltaMs: 250,
};

// Position-entry thresholds are deliberately separate from the biomechanical
// alignment range above. They answer whether the person is actually in a
// horizontal, side-view Plank before form quality is evaluated.
export const PLANK_POSITION = {
  validationMs: 1500,
  pairedLandmarkVisibility: 0.35,
  minBodyAxisLength: 0.22,
  maxHorizontalAngle: 30,
  maxSideProfileWidthRatio: 0.3,
  maxSegmentVerticalRatio: 0.42,
};
