import { classifyLungeDepth, classifyLungePhase, inferLungeFrontLeg, validateLungePosition } from './lungeEvaluator';
import { advanceLungeCycle, createLungeCycleState, finalizeLungeCycle } from './lungeRepTracker';

function pose({ frontFacing = false } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const offset = frontFacing ? 0.24 : 0.018;
  landmarks[0] = { x: 0.56, y: 0.1, visibility: 1 };
  landmarks[11] = { x: 0.5 - offset / 2, y: 0.2, visibility: 1 };
  landmarks[12] = { x: 0.5 + offset / 2, y: 0.2, visibility: 1 };
  landmarks[23] = { x: 0.5 - offset / 2, y: 0.48, visibility: 1 };
  landmarks[24] = { x: 0.5 + offset / 2, y: 0.48, visibility: 1 };
  landmarks[25] = { x: 0.62, y: 0.66, visibility: 1 };
  landmarks[26] = { x: 0.38, y: 0.66, visibility: 1 };
  landmarks[27] = { x: 0.68, y: 0.88, visibility: 1 };
  landmarks[28] = { x: 0.32, y: 0.88, visibility: 1 };
  return landmarks;
}

function analysis(phase, angle, overrides = {}) {
  return { phase, frontKneeAngle: angle, frontLeg: 'left', depthClass: classifyLungeDepth(angle), ...overrides };
}

function run(frames) {
  let state = createLungeCycleState();
  let event = null;
  frames.forEach((frame) => {
    const result = advanceLungeCycle(state, frame);
    state = result.state;
    event = result.event || event;
  });
  return { state, event };
}

describe('Lunge detection', () => {
  test('uses the documented front-knee depth band around 90 degrees', () => {
    expect(classifyLungeDepth(82.9)).toBe('too_deep');
    expect(classifyLungeDepth(82.91)).toBe('good');
    expect(classifyLungeDepth(103)).toBe('good');
    expect(classifyLungeDepth(103.01)).toBe('shallow');
    expect(classifyLungePhase(103)).toBe('bottom');
  });

  test('requires a side-view pose with reliable full-body landmarks', () => {
    expect(validateLungePosition(null).status).toBe('no_person');
    expect(validateLungePosition(pose({ frontFacing: true })).status).toBe('turn_sideways');
    expect(validateLungePosition(pose()).status).toBe('ready');
  });

  test('identifies the forward leg in either facing direction', () => {
    const facingRight = pose();
    const facingLeft = pose();
    facingLeft[0].x = 0.44;

    expect(inferLungeFrontLeg(facingRight, 100, 110)).toBe('left');
    expect(inferLungeFrontLeg(facingLeft, 100, 110)).toBe('right');
  });

  test('counts one complete start to bottom to start cycle', () => {
    const { event } = run([
      analysis('start', 170),
      analysis('transition', 125),
      analysis('bottom', 90),
      analysis('bottom', 90),
      analysis('bottom', 90),
      analysis('transition', 125),
      analysis('start', 170),
    ]);
    expect(event).toMatchObject({ type: 'correct', minimumAngle: 90, workingLeg: 'left' });
  });

  test('does not count a movement that did not begin from the start position', () => {
    expect(run([analysis('bottom', 90), analysis('start', 170)]).event).toBeNull();
  });

  test('rejects shallow and excessively deep completed cycles', () => {
    expect(run([analysis('start', 170), analysis('transition', 125), analysis('start', 170)]).event.type).toBe('incorrect');
    expect(run([analysis('start', 170), analysis('bottom', 75), analysis('start', 170)]).event.type).toBe('incorrect');
  });

  test('does not validate a bottom position from only one unstable frame', () => {
    const { event } = run([
      analysis('start', 170),
      analysis('bottom', 90),
      analysis('transition', 120),
      analysis('start', 170),
    ]);
    expect(event.type).toBe('incorrect');
    expect(event.reasons[0]).toContain('unstable');
  });

  test('holds at the bottom without double counting and resets after an invalid attempt', () => {
    let state = createLungeCycleState();
    const events = [];
    [
      analysis('start', 170),
      analysis('transition', 125),
      analysis('start', 170),
      analysis('transition', 120),
      analysis('bottom', 90),
      analysis('bottom', 90),
      analysis('bottom', 90),
      analysis('bottom', 90),
      analysis('transition', 125),
      analysis('start', 170),
    ].forEach((frame) => {
      const result = advanceLungeCycle(state, frame);
      state = result.state;
      if (result.event) events.push(result.event);
    });

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('incorrect');
    expect(events[1].type).toBe('correct');
  });

  test('records an unfinished movement when the session ends', () => {
    const { state } = run([analysis('start', 170), analysis('bottom', 90)]);
    expect(finalizeLungeCycle(state).reasons[0]).toContain('returning to the start');
  });
});
