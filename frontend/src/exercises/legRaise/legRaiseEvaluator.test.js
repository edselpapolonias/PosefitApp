import { classifyLegRaisePosition, hipAngleToFlexion, isLegExtended, validateLegRaisePosition } from './legRaiseEvaluator';
import { advanceLegRaiseCycle, createLegRaiseCycleState, finalizeLegRaiseCycle } from './legRaiseRepTracker';

function frame(position, hipFlexion, legExtended = true) {
  return { position, hipFlexion, legExtended, activeSide: 'left' };
}

function pose({ hidden = false, frontFacing = false } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.1 }));
  const points = {
    11: [0.2, 0.5], 12: frontFacing ? [0.5, 0.5] : [0.21, 0.5],
    23: [0.45, 0.5], 24: frontFacing ? [0.75, 0.5] : [0.46, 0.5],
    25: [0.68, 0.5], 26: [0.69, 0.5], 27: [0.9, 0.5], 28: [0.91, 0.5],
  };
  Object.entries(points).forEach(([index, [x, y]]) => {
    landmarks[index] = { x, y, visibility: hidden ? 0.2 : 0.95 };
  });
  return landmarks;
}

function run(frames) {
  let state = createLegRaiseCycleState();
  const events = [];
  frames.forEach((analysis) => {
    const result = advanceLegRaiseCycle(state, analysis);
    state = result.state;
    if (result.event) events.push(result.event);
  });
  return { state, events };
}

const lowered = () => frame('lowered', 5);

describe('Leg Raise detection', () => {
  test('uses the documented 30°–60° effective hip-flexion range', () => {
    expect(classifyLegRaisePosition(10)).toBe('lowered');
    expect(classifyLegRaisePosition(29.99)).toBe('raising');
    expect(classifyLegRaisePosition(30)).toBe('valid_raised');
    expect(classifyLegRaisePosition(60)).toBe('valid_raised');
    expect(classifyLegRaisePosition(60.01)).toBe('too_high');
  });

  test('converts the shoulder-hip-knee angle into hip flexion', () => {
    expect(hipAngleToFlexion(180)).toBe(0);
    expect(hipAngleToFlexion(150)).toBe(30);
    expect(hipAngleToFlexion(120)).toBe(60);
  });

  test('requires a nearly straight knee', () => {
    expect(isLegExtended(159.99)).toBe(false);
    expect(isLegExtended(160)).toBe(true);
  });

  test('requires a side-view pose with reliable full-body landmarks', () => {
    expect(validateLegRaisePosition(null).status).toBe('no_person');
    expect(validateLegRaisePosition(pose({ hidden: true })).status).toBe('full_body_required');
    expect(validateLegRaisePosition(pose({ frontFacing: true })).status).toBe('turn_sideways');
    expect(validateLegRaisePosition(pose()).status).toBe('ready');
  });

  test('counts one complete lowered to raised to lowered cycle', () => {
    const { events } = run([
      lowered(), lowered(), lowered(),
      frame('raising', 20),
      frame('valid_raised', 45), frame('valid_raised', 55), frame('valid_raised', 60),
      frame('raising', 25), lowered(), lowered(), lowered(),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'correct', maximumHipFlexion: 60, activeSide: 'left' });
  });

  test('does not count repeatedly while the legs remain raised', () => {
    const { events } = run([
      lowered(), lowered(), lowered(), frame('raising', 20),
      frame('valid_raised', 40), frame('valid_raised', 50), frame('valid_raised', 60),
      frame('valid_raised', 55), frame('valid_raised', 50), lowered(), lowered(), lowered(),
    ]);
    expect(events).toHaveLength(1);
  });

  test('tracks an incomplete movement as incorrect without advancing valid reps', () => {
    const { events } = run([lowered(), lowered(), lowered(), frame('raising', 20), frame('raising', 25), lowered(), lowered(), lowered()]);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('incorrect');
    expect(events[0].reasons[0]).toContain('30°–60°');
  });

  test('rejects sustained knee bend and excessive elevation', () => {
    const bent = run([
      lowered(), lowered(), lowered(), frame('raising', 20, false),
      frame('valid_raised', 40, false), frame('valid_raised', 50, false), frame('valid_raised', 60),
      frame('valid_raised', 55), frame('valid_raised', 50), lowered(), lowered(), lowered(),
    ]);
    const high = run([
      lowered(), lowered(), lowered(), frame('raising', 20),
      frame('valid_raised', 40), frame('valid_raised', 50), frame('valid_raised', 60),
      frame('too_high', 70), lowered(), lowered(), lowered(),
    ]);
    expect(bent.events[0].type).toBe('incorrect');
    expect(bent.events[0].reasons).toContain('Knees bent during the Leg Raise');
    expect(high.events[0].type).toBe('incorrect');
    expect(high.events[0].reasons).toContain('Legs were raised above the 60° target range');
  });

  test('records an unfinished movement when the session ends', () => {
    const { state } = run([lowered(), lowered(), lowered(), frame('raising', 20), frame('valid_raised', 45)]);
    expect(finalizeLegRaiseCycle(state).reasons).toContain('Leg Raise was not completed by returning to the lowered position');
  });

  test('does not arm from a lowered position with bent knees', () => {
    let state = createLegRaiseCycleState();
    [frame('lowered', 5, false), frame('lowered', 5, false), frame('lowered', 5, false)].forEach((analysis) => {
      state = advanceLegRaiseCycle(state, analysis).state;
    });
    expect(state.armed).toBe(false);
    expect(advanceLegRaiseCycle(state, frame('raising', 20)).event).toBeNull();
  });
});
