import {
  arePushUpArmsBalanced,
  classifyElbowPhase,
  isPushUpBodyAligned,
  validatePushUpPosition,
} from './pushUpEvaluator';
import {
  advancePushUpCycle,
  createPushUpCycleState,
  finalizePushUpCycle,
} from './pushUpRepTracker';

function pose({ horizontal = true, frontFacing = false, reversed = false } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const shoulderX = horizontal ? (reversed ? 0.8 : 0.2) : 0.5;
  const hipX = horizontal ? 0.5 : 0.5;
  const ankleX = horizontal ? (reversed ? 0.2 : 0.8) : 0.5;
  const shoulderY = horizontal ? 0.5 : 0.2;
  const hipY = horizontal ? 0.5 : 0.5;
  const ankleY = horizontal ? 0.5 : 0.85;
  const pairOffset = frontFacing ? 0.24 : 0.014;

  landmarks[11] = { x: shoulderX - pairOffset / 2, y: shoulderY, visibility: 1 };
  landmarks[12] = { x: shoulderX + pairOffset / 2, y: shoulderY, visibility: 1 };
  landmarks[13] = { x: shoulderX, y: shoulderY + 0.1, visibility: 1 };
  landmarks[14] = { x: shoulderX + 0.01, y: shoulderY + 0.1, visibility: 1 };
  landmarks[15] = { x: shoulderX + 0.08, y: shoulderY + 0.1, visibility: 1 };
  landmarks[16] = { x: shoulderX + 0.09, y: shoulderY + 0.1, visibility: 1 };
  landmarks[23] = { x: hipX - pairOffset / 2, y: hipY, visibility: 1 };
  landmarks[24] = { x: hipX + pairOffset / 2, y: hipY, visibility: 1 };
  landmarks[27] = { x: ankleX - pairOffset / 2, y: ankleY, visibility: 1 };
  landmarks[28] = { x: ankleX + pairOffset / 2, y: ankleY, visibility: 1 };
  return landmarks;
}

function analysis(phase, elbowAngle, overrides = {}) {
  return {
    phase,
    elbowAngle,
    bodyAligned: true,
    armsBalanced: true,
    ...overrides,
  };
}

function runCycle(frames) {
  let state = createPushUpCycleState();
  let event = null;
  frames.forEach((frame) => {
    const result = advancePushUpCycle(state, frame);
    state = result.state;
    event = result.event || event;
  });
  return { state, event };
}

describe('Push Up detection', () => {
  test('uses the documented top and bottom elbow thresholds', () => {
    expect(classifyElbowPhase(151)).toBe('top');
    expect(classifyElbowPhase(150)).toBe('transition');
    expect(classifyElbowPhase(90)).toBe('transition');
    expect(classifyElbowPhase(89)).toBe('bottom');
  });

  test('uses the documented body alignment and arm symmetry limits', () => {
    expect(isPushUpBodyAligned(159.9)).toBe(false);
    expect(isPushUpBodyAligned(160)).toBe(true);
    expect(isPushUpBodyAligned(180)).toBe(true);
    expect(arePushUpArmsBalanced(29.9)).toBe(true);
    expect(arePushUpArmsBalanced(30)).toBe(false);
  });

  test('requires side-view horizontal body positioning', () => {
    expect(validatePushUpPosition(pose({ frontFacing: true })).status).toBe('turn_sideways');
    expect(validatePushUpPosition(pose({ horizontal: false })).status).toBe('get_into_position');
    expect(validatePushUpPosition(pose()).status).toBe('ready');
    expect(validatePushUpPosition(pose({ reversed: true })).status).toBe('ready');
  });

  test('counts only a complete top to bottom to top cycle', () => {
    const { event } = runCycle([
      analysis('top', 165),
      analysis('transition', 120),
      analysis('bottom', 75),
      analysis('transition', 120),
      analysis('top', 165),
    ]);
    expect(event).toMatchObject({ type: 'correct', minimumElbowAngle: 75 });
  });

  test('does not count a cycle that did not begin from the top', () => {
    const { event } = runCycle([
      analysis('bottom', 75),
      analysis('transition', 120),
      analysis('top', 165),
    ]);
    expect(event).toBeNull();
  });

  test('ignores small arm movement and records meaningful incomplete depth', () => {
    expect(runCycle([
      analysis('top', 165),
      analysis('transition', 145),
      analysis('top', 165),
    ]).event).toBeNull();

    expect(runCycle([
      analysis('top', 165),
      analysis('transition', 130),
      analysis('top', 165),
    ]).event).toMatchObject({ type: 'incorrect', reasons: ['Incomplete Push Up depth'] });
  });

  test('marks a full cycle incorrect when body alignment fails', () => {
    const { event } = runCycle([
      analysis('top', 165),
      analysis('transition', 120, { bodyAligned: false }),
      analysis('bottom', 75),
      analysis('top', 165),
    ]);
    expect(event.type).toBe('incorrect');
    expect(event.reasons).toContain('Body alignment outside 160°–180°');
  });

  test('records missing arm extension when an open cycle is ended', () => {
    const { state } = runCycle([
      analysis('top', 165),
      analysis('bottom', 75),
      analysis('transition', 120),
    ]);
    expect(finalizePushUpCycle(state).reasons).toContain('Arms not fully extended above 150°');
  });
});
