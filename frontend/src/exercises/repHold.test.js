import { advanceRepHold, createRepHold } from './repHold';
import { advanceSquatHold, squatAttemptReasons } from './squat/squatHoldValidation';
import { advanceLegRaiseCycle, createLegRaiseCycleState } from './legRaise/legRaiseRepTracker';

const bottom = { phase: 'bottom', overallClass: 'good', isBilateral: true, leftAngle: 90, rightAngle: 90 };
const standing = { ...bottom, phase: 'standing' };

describe('continuous Squat hold', () => {
  test.each([500, 900, 1000, 1500])('%i ms qualifies only at one second', (duration) => {
    let hold = createRepHold();
    for (let time = 0; time <= duration; time += 100) hold = advanceSquatHold(hold, bottom, time);
    expect(hold.qualified).toBe(duration >= 1000);
    hold = advanceSquatHold(hold, standing, duration + 100);
    expect(hold.qualified).toBe(duration >= 1000);
    if (duration < 1000) expect(squatAttemptReasons(hold, ['Poor form detected'])).toEqual(['Hold for one second.']);
  });

  test('invalid form resets timing and keeps form feedback primary', () => {
    let hold = advanceSquatHold(createRepHold(), bottom, 0);
    hold = advanceSquatHold(hold, bottom, 500);
    hold = advanceSquatHold(hold, { ...bottom, leftAngle: 75, overallClass: 'bad' }, 600);
    expect(hold.elapsed).toBe(0);
    hold = advanceSquatHold(hold, bottom, 700);
    hold = advanceSquatHold(hold, bottom, 1200);
    expect(hold.qualified).toBe(false);
    expect(squatAttemptReasons(hold, ['Uneven leg movement'])).toEqual(['Uneven leg movement']);
  });
});

describe('hold timing safeguards', () => {
  test('does not accumulate separate holds or a stalled camera interval', () => {
    let hold = advanceRepHold(createRepHold(), true, 0);
    hold = advanceRepHold(hold, true, 500);
    hold = advanceRepHold(hold, false, 600);
    hold = advanceRepHold(hold, true, 700);
    hold = advanceRepHold(hold, true, 1200);
    expect(hold.qualified).toBe(false);
    hold = advanceRepHold(hold, true, 5000);
    expect(hold.elapsed).toBe(0);
    expect(createRepHold().qualified).toBe(false);
  });
});

function legSession() {
  let state = createLegRaiseCycleState();
  let time = 0;
  const events = [];
  const send = (position, legExtended = true) => {
    const result = advanceLegRaiseCycle(state, { position, legExtended, hipFlexion: position === 'lowered' ? 5 : 45, activeSide: 'left' }, time);
    time += 100;
    state = result.state;
    if (result.event) events.push(result.event);
    return state;
  };
  const lower = () => { for (let i = 0; i < 3; i += 1) send('lowered'); };
  lower();
  return { send, lower, events };
}

describe('Leg Raise qualified rep cycle', () => {
  test.each([500, 900, 1000, 1500])('%i ms needs a complete return and emits exactly once', (duration) => {
    const session = legSession();
    for (let time = 0; time <= duration; time += 100) session.send('valid_raised');
    expect(session.events).toHaveLength(0);
    session.lower();
    session.lower();
    expect(session.events).toHaveLength(1);
    expect(session.events[0].type).toBe(duration >= 1000 ? 'correct' : 'incorrect');
    expect(session.events[0].reasons).toEqual(duration >= 1000 ? [] : ['Hold for one second.']);
    expect(session.send('valid_raised').hold.elapsed).toBe(0);
    session.lower();
    expect(session.events[1].type).toBe('incorrect');
  });

  test('separate short holds cannot qualify together', () => {
    const session = legSession();
    for (let i = 0; i < 6; i += 1) session.send('valid_raised');
    session.send('raising');
    for (let i = 0; i < 6; i += 1) session.send('valid_raised');
    session.lower();
    expect(session.events[0].reasons).toEqual(['Hold for one second.']);
  });

  test('bent knees reset the hold and preserve the form error', () => {
    const session = legSession();
    for (let i = 0; i < 6; i += 1) session.send('valid_raised');
    for (let i = 0; i < 3; i += 1) expect(session.send('valid_raised', false).hold.elapsed).toBe(0);
    session.lower();
    expect(session.events[0].reasons).toEqual(['Knees bent during the Leg Raise']);
  });
});
