import { classifySitUpPhase, isSitUpKneeValid, validateSitUpPosition } from './sitUpEvaluator';
import { advanceSitUpCycle, createSitUpCycleState, finalizeSitUpCycle } from './sitUpRepTracker';

function pose({ frontFacing = false, hidden = false } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const offset = frontFacing ? 0.22 : 0.018;
  const visibility = hidden ? 0.2 : 1;
  landmarks[11] = { x: 0.34 - offset / 2, y: 0.61, visibility };
  landmarks[12] = { x: 0.34 + offset / 2, y: 0.61, visibility };
  landmarks[23] = { x: 0.51 - offset / 2, y: 0.67, visibility };
  landmarks[24] = { x: 0.51 + offset / 2, y: 0.67, visibility };
  landmarks[25] = { x: 0.67, y: 0.52, visibility };
  landmarks[26] = { x: 0.67, y: 0.52, visibility };
  landmarks[27] = { x: 0.82, y: 0.67, visibility };
  landmarks[28] = { x: 0.82, y: 0.67, visibility };
  return landmarks;
}

function frame(phase, hipAngle, kneeValid = true) {
  return { phase, hipAngle, kneeValid, activeSide: 'left' };
}

function run(frames) {
  let state = createSitUpCycleState();
  const events = [];
  frames.forEach((analysis) => {
    const result = advanceSitUpCycle(state, analysis);
    state = result.state;
    if (result.event) events.push(result.event);
  });
  return { state, events };
}

describe('Sit Up detection', () => {
  test('uses the documented below-90-degree top boundary', () => {
    expect(classifySitUpPhase(89.99)).toBe('top');
    expect(classifySitUpPhase(90)).toBe('transition');
    expect(classifySitUpPhase(149.99)).toBe('transition');
    expect(classifySitUpPhase(150)).toBe('start');
  });

  test('keeps the knee near 90 degrees', () => {
    expect(isSitUpKneeValid(74.99)).toBe(false);
    expect(isSitUpKneeValid(75)).toBe(true);
    expect(isSitUpKneeValid(105)).toBe(true);
    expect(isSitUpKneeValid(105.01)).toBe(false);
  });

  test('requires a side-view pose with reliable full-body landmarks', () => {
    expect(validateSitUpPosition(null).status).toBe('no_person');
    expect(validateSitUpPosition(pose({ hidden: true })).status).toBe('full_body_required');
    expect(validateSitUpPosition(pose({ frontFacing: true })).status).toBe('turn_sideways');
    expect(validateSitUpPosition(pose()).status).toBe('ready');
  });

  test('counts one stable lying to top to lying cycle', () => {
    const { events } = run([
      frame('start', 170), frame('transition', 125),
      frame('top', 86), frame('top', 85), frame('top', 84),
      frame('transition', 120), frame('start', 165),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'correct', minimumHipAngle: 84, activeSide: 'left' });
  });

  test('rejects a top position seen for only one unstable frame', () => {
    const { events } = run([
      frame('start', 170), frame('transition', 120), frame('top', 86),
      frame('transition', 120), frame('start', 165),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('incorrect');
  });

  test('does not count a cycle that did not begin from the lying position', () => {
    expect(run([frame('top', 85), frame('top', 84), frame('top', 83), frame('start', 165)]).events).toHaveLength(0);
  });

  test('debounces a brief knee measurement error but rejects a sustained one', () => {
    const brief = run([
      frame('start', 170), frame('transition', 120, false),
      frame('top', 86), frame('top', 85), frame('top', 84), frame('start', 165),
    ]);
    const sustained = run([
      frame('start', 170), frame('transition', 130, false), frame('transition', 120, false), frame('transition', 110, false),
      frame('top', 86), frame('top', 85), frame('top', 84), frame('start', 165),
    ]);
    expect(brief.events[0].type).toBe('correct');
    expect(sustained.events[0].type).toBe('incorrect');
  });

  test('does not double count while holding the top and resets after each attempt', () => {
    const { events } = run([
      frame('start', 170), frame('transition', 118), frame('start', 165),
      frame('transition', 120), frame('top', 86), frame('top', 85), frame('top', 84),
      frame('top', 83), frame('top', 82), frame('transition', 120), frame('start', 165),
    ]);
    expect(events.map(({ type }) => type)).toEqual(['incorrect', 'correct']);
  });

  test('records an unfinished movement when the session ends', () => {
    const { state } = run([frame('start', 170), frame('transition', 120), frame('top', 85)]);
    expect(finalizeSitUpCycle(state).reasons[0]).toContain('returning to the lying position');
  });
});
