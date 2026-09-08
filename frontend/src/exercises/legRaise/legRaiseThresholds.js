// PoseFit Implementation Plan, section 15.
export const LEG_RAISE_HIP = {
  resting: 0,
  loweredMax: 10,
  effectiveMin: 30,
  effectiveMax: 60,
  target: 60,
};

// Section 15 requires a nearly straight Hip -> Knee -> Ankle line and leaves
// the implementation cutoff to system validation. 160 degrees provides a
// conservative initial tolerance while still identifying visible knee bend.
export const LEG_RAISE_KNEE = {
  straight: 180,
  extensionMin: 160,
};

export const LEG_RAISE_STABILITY = {
  loweredFrames: 3,
  validRaisedFrames: 3,
  invalidKneeFrames: 3,
};

export const LEG_RAISE_VISIBILITY = { required: 0.5, sidePair: 0.35 };
export const LEG_RAISE_POSITION = { minBodySpan: 0.25, maxSideProfileWidthRatio: 0.3 };
