import { PUSH_UP_ELBOW } from './pushUpThresholds';

export function createPushUpCycleState() {
  return {
    hasTop: false,
    attemptStarted: false,
    bottomReached: false,
    minimumElbowAngle: 180,
    bodyAlignmentIssue: false,
    armSymmetryIssue: false,
  };
}

function reasonsFor(state) {
  const reasons = [];
  if (!state.bottomReached) reasons.push('Incomplete Push Up depth');
  if (state.bodyAlignmentIssue) reasons.push('Body alignment outside 160°–180°');
  if (state.armSymmetryIssue) reasons.push('Arm angle difference exceeded 30°');
  return reasons;
}

export function advancePushUpCycle(previousState, analysis) {
  const state = { ...previousState };
  if (!state.hasTop) {
    if (analysis.phase === 'top') state.hasTop = true;
    return { state, event: null };
  }

  if (!state.attemptStarted && analysis.phase !== 'top') state.attemptStarted = true;
  if (!state.attemptStarted) return { state, event: null };

  state.minimumElbowAngle = Math.min(state.minimumElbowAngle, analysis.elbowAngle);
  state.bottomReached = state.bottomReached || analysis.phase === 'bottom';
  state.bodyAlignmentIssue = state.bodyAlignmentIssue || !analysis.bodyAligned;
  state.armSymmetryIssue = state.armSymmetryIssue || !analysis.armsBalanced;

  if (analysis.phase !== 'top') return { state, event: null };

  const meaningfulAttempt = state.bottomReached
    || state.minimumElbowAngle <= PUSH_UP_ELBOW.incompleteAttemptMax;
  if (!meaningfulAttempt) return { state: createPushUpCycleStateWithTop(), event: null };

  const reasons = reasonsFor(state);
  const correct = state.bottomReached && reasons.length === 0;
  return {
    state: createPushUpCycleStateWithTop(),
    event: {
      type: correct ? 'correct' : 'incorrect',
      minimumElbowAngle: state.minimumElbowAngle,
      reasons,
    },
  };
}

export function finalizePushUpCycle(state) {
  if (!state.attemptStarted) return null;
  const reasons = reasonsFor(state);
  if (state.bottomReached) reasons.push('Arms not fully extended above 150°');
  return {
    type: 'incorrect',
    minimumElbowAngle: state.minimumElbowAngle,
    reasons,
  };
}

function createPushUpCycleStateWithTop() {
  return { ...createPushUpCycleState(), hasTop: true };
}
