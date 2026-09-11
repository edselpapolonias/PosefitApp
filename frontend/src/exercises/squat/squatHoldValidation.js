import { advanceRepHold, HOLD_FAILURE_REASON } from '../repHold';
import { SQUAT_DEPTH } from './squatThresholds';

export function advanceSquatHold(hold, analysis, now = performance.now()) {
  const uneven = analysis.isBilateral && Math.abs(analysis.leftAngle - analysis.rightAngle) > SQUAT_DEPTH.unevenLegDifference;
  const valid = analysis.phase === 'bottom' && analysis.overallClass === 'good' && !uneven;
  return {
    ...advanceRepHold(hold, valid, now),
    formInterrupted: hold.formInterrupted || (hold.startedAt !== null && analysis.phase === 'bottom' && !valid),
  };
}

export function squatAttemptReasons(hold, formReasons) {
  const onlyFallback = formReasons.length === 1 && formReasons[0] === 'Poor form detected';
  return hold.seenValid && !hold.qualified && !hold.formInterrupted && onlyFallback
    ? [HOLD_FAILURE_REASON] : formReasons;
}
