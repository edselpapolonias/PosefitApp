import { SIT_UP_HIP, SIT_UP_STABILITY } from './sitUpThresholds';

export function createSitUpCycleState() {
  return { hasStart: false, attemptStarted: false, activeSide: null, minimumHipAngle: 180, validTopFrames: 0, invalidKneeFrames: 0, validTopConfirmed: false, kneeIssue: false };
}

function readyState() { return { ...createSitUpCycleState(), hasStart: true }; }

export function advanceSitUpCycle(previous, analysis) {
  const state = { ...previous };
  if (!state.hasStart) {
    if (analysis.phase === 'start' && analysis.kneeValid) state.hasStart = true;
    return { state, event: null };
  }
  if (!state.attemptStarted && analysis.phase !== 'start') {
    state.attemptStarted = true;
    state.activeSide = analysis.activeSide;
  }
  if (!state.attemptStarted) return { state, event: null };
  state.minimumHipAngle = Math.min(state.minimumHipAngle, analysis.hipAngle);
  state.invalidKneeFrames = analysis.kneeValid ? 0 : state.invalidKneeFrames + 1;
  state.kneeIssue = state.kneeIssue || state.invalidKneeFrames >= SIT_UP_STABILITY.validTopFrames;
  if (analysis.phase === 'top' && analysis.kneeValid) {
    state.validTopFrames += 1;
    if (state.validTopFrames >= SIT_UP_STABILITY.validTopFrames) state.validTopConfirmed = true;
  } else {
    state.validTopFrames = 0;
  }
  if (analysis.phase !== 'start') return { state, event: null };
  const meaningful = state.validTopConfirmed || state.minimumHipAngle <= SIT_UP_HIP.incompleteAttemptMax;
  if (!meaningful) return { state: readyState(), event: null };
  const reasons = [];
  if (!state.validTopConfirmed) reasons.push('Sit Up did not reach the required top position');
  if (state.kneeIssue) reasons.push('Knee position moved outside the accepted range');
  return {
    state: readyState(),
    event: { type: state.validTopConfirmed && !state.kneeIssue ? 'correct' : 'incorrect', minimumHipAngle: state.minimumHipAngle, activeSide: state.activeSide, reasons },
  };
}

export function finalizeSitUpCycle(state) {
  if (!state.attemptStarted) return null;
  return { type: 'incorrect', minimumHipAngle: state.minimumHipAngle, activeSide: state.activeSide, reasons: ['Sit Up was not completed by returning to the lying position'] };
}
