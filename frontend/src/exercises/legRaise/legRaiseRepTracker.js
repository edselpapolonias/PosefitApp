import { LEG_RAISE_STABILITY } from './legRaiseThresholds';
import { advanceRepHold, createRepHold, HOLD_FAILURE_REASON } from '../repHold';

export function createLegRaiseCycleState() {
  return {
    phase: 'waiting',
    loweredFrames: 0,
    returnLoweredFrames: 0,
    armed: false,
    attemptStarted: false,
    activeSide: null,
    maximumHipFlexion: 0,
    validRaisedFrames: 0,
    invalidKneeFrames: 0,
    validRaisedConfirmed: false,
    kneeIssue: false,
    excessiveElevation: false,
    hold: createRepHold(),
  };
}

function armedState() {
  return {
    ...createLegRaiseCycleState(),
    phase: 'lowered',
    loweredFrames: LEG_RAISE_STABILITY.loweredFrames,
    armed: true,
  };
}

function reasonsFor(state) {
  const reasons = [];
  if (!state.validRaisedConfirmed) reasons.push('Leg Raise did not reach a stable 30°–60° hip-flexion position');
  if (state.kneeIssue) reasons.push('Knees bent during the Leg Raise');
  if (state.excessiveElevation) reasons.push('Legs were raised above the 60° target range');
  if (reasons.length === 0 && !state.hold.qualified) reasons.push(HOLD_FAILURE_REASON);
  return reasons;
}

export function advanceLegRaiseCycle(previous, analysis, now = performance.now()) {
  const state = { ...previous };

  if (!state.armed) {
    state.loweredFrames = analysis.position === 'lowered' && analysis.legExtended ? state.loweredFrames + 1 : 0;
    if (state.loweredFrames >= LEG_RAISE_STABILITY.loweredFrames) {
      state.armed = true;
      state.phase = 'lowered';
    }
    return { state, event: null };
  }

  if (!state.attemptStarted && analysis.position !== 'lowered') {
    state.attemptStarted = true;
    state.activeSide = analysis.activeSide;
    state.phase = 'raising';
  }
  if (!state.attemptStarted) return { state: { ...state, phase: 'lowered' }, event: null };

  state.hold = advanceRepHold(state.hold, analysis.position === 'valid_raised' && analysis.legExtended, now);

  state.maximumHipFlexion = Math.max(state.maximumHipFlexion, analysis.hipFlexion);
  state.invalidKneeFrames = analysis.legExtended ? 0 : state.invalidKneeFrames + 1;
  if (state.invalidKneeFrames >= LEG_RAISE_STABILITY.invalidKneeFrames) state.kneeIssue = true;
  if (analysis.position === 'too_high') state.excessiveElevation = true;

  if (analysis.position === 'valid_raised' && analysis.legExtended) {
    state.validRaisedFrames += 1;
    if (state.validRaisedFrames >= LEG_RAISE_STABILITY.validRaisedFrames) state.validRaisedConfirmed = true;
  } else {
    state.validRaisedFrames = 0;
  }

  if (analysis.position !== 'lowered') {
    state.returnLoweredFrames = 0;
    state.phase = state.validRaisedConfirmed ? 'valid_raised' : 'raising';
    return { state, event: null };
  }

  state.phase = 'lowering';
  state.returnLoweredFrames += 1;
  if (state.returnLoweredFrames < LEG_RAISE_STABILITY.loweredFrames) return { state, event: null };
  const reasons = reasonsFor(state);
  const correct = state.validRaisedConfirmed && state.hold.qualified && reasons.length === 0;
  return {
    state: armedState(),
    event: {
      type: correct ? 'correct' : 'incorrect',
      maximumHipFlexion: state.maximumHipFlexion,
      activeSide: state.activeSide,
      reasons,
    },
  };
}

export function finalizeLegRaiseCycle(state) {
  if (!state.attemptStarted) return null;
  const reasons = reasonsFor(state);
  reasons.push('Leg Raise was not completed by returning to the lowered position');
  return {
    type: 'incorrect',
    maximumHipFlexion: state.maximumHipFlexion,
    activeSide: state.activeSide,
    reasons,
  };
}
