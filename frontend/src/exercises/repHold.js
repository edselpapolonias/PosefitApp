// Opt-in timing for Squat and Leg Raise only. Angles still come from their evaluators.
export const REP_HOLD_MS = 1000;
export const HOLD_FAILURE_REASON = 'Hold for one second.';
// Do not treat a stalled/suspended camera as evidence of a continuous hold.
const MAX_SAMPLE_GAP_MS = 500;

export function createRepHold() {
  return { startedAt: null, lastSampleAt: null, elapsed: 0, qualified: false, seenValid: false };
}

export function advanceRepHold(previous, valid, now = performance.now()) {
  const state = { ...previous, lastSampleAt: now };
  if (!valid) return { ...state, startedAt: null, elapsed: 0 };
  state.seenValid = true;
  if (state.qualified) return state;
  if (state.startedAt === null || previous.lastSampleAt === null
      || now - previous.lastSampleAt > MAX_SAMPLE_GAP_MS || now < previous.lastSampleAt) {
    state.startedAt = now;
  }
  state.elapsed = Math.max(0, now - state.startedAt);
  state.qualified = state.elapsed >= REP_HOLD_MS;
  return state;
}

export function holdFeedback(hold) {
  return hold.qualified ? 'Good! Complete the rep.' : `Hold: ${(Math.min(hold.elapsed, REP_HOLD_MS) / 1000).toFixed(1)}s / 1.0s`;
}
