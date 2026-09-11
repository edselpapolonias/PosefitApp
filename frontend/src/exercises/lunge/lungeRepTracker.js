import { LUNGE_DEPTH, LUNGE_STABILITY } from './lungeThresholds';

export function createLungeCycleState() {
  return {
    hasStart: false,
    attemptStarted: false,
    bottomReached: false,
    validBottomFrames: 0,
    validBottomConfirmed: false,
    excessiveDepthDetected: false,
    workingLeg: null,
    minimumAngle: 180,
  };
}

function readyState() {
  return { ...createLungeCycleState(), hasStart: true };
}

export function advanceLungeCycle(previousState, analysis) {
  const state = { ...previousState };
  if (!state.hasStart) {
    if (analysis.phase === 'start') state.hasStart = true;
    return { state, event: null };
  }
  if (!state.attemptStarted && analysis.phase !== 'start') {
    state.attemptStarted = true;
    state.workingLeg = analysis.frontLeg;
  }
  if (!state.attemptStarted) return { state, event: null };
  state.minimumAngle = Math.min(state.minimumAngle, analysis.frontKneeAngle);
  state.bottomReached = state.bottomReached || analysis.phase === 'bottom';
  if (analysis.phase === 'bottom' && analysis.depthClass === 'good') {
    state.validBottomFrames += 1;
    if (state.validBottomFrames >= LUNGE_STABILITY.validBottomFrames) state.validBottomConfirmed = true;
  } else {
    state.validBottomFrames = 0;
  }
  if (analysis.phase === 'bottom' && analysis.depthClass === 'too_deep') {
    state.excessiveDepthDetected = true;
  }
  if (analysis.phase !== 'start') return { state, event: null };

  const meaningful = state.bottomReached || state.minimumAngle <= LUNGE_DEPTH.incompleteAttemptMax;
  if (!meaningful) return { state: readyState(), event: null };
  const reasons = [];
  if (!state.validBottomConfirmed && !state.excessiveDepthDetected) reasons.push('Lunge depth was too shallow or unstable');
  if (state.excessiveDepthDetected) reasons.push('Lunge depth was excessive');
  const correct = state.validBottomConfirmed && !state.excessiveDepthDetected;
  return {
    state: readyState(),
    event: { type: correct ? 'correct' : 'incorrect', minimumAngle: state.minimumAngle, workingLeg: state.workingLeg, reasons },
  };
}

export function finalizeLungeCycle(state) {
  if (!state.attemptStarted) return null;
  return {
    type: 'incorrect',
    minimumAngle: state.minimumAngle,
    workingLeg: state.workingLeg,
    reasons: [
      'Lunge was not completed by returning to the start position',
      ...(state.excessiveDepthDetected ? ['Lunge depth was excessive'] : []),
      ...(!state.validBottomConfirmed && !state.excessiveDepthDetected
        && state.minimumAngle <= LUNGE_DEPTH.incompleteAttemptMax ? ['Lunge depth was too shallow or unstable'] : []),
    ],
  };
}
