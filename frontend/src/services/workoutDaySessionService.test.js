import {
  getWorkoutStep,
  recordWorkoutSetResult,
  startOrResumeWorkoutDay,
  workoutStepNavigation,
} from './workoutDaySessionService';

jest.mock('axios', () => ({ post: jest.fn(() => Promise.resolve({ data: {} })), get: jest.fn() }));

const plan = { id: 'test-plan', instanceId: 7, name: 'Test Plan' };
const workout = { id: 'week-1-monday', week: 1, day: 'Monday', label: 'DAY 1', date: '2026-09-14', exercises: [
  { exerciseId: 'squat', name: 'Squat', type: 'reps', sets: 3, reps: 10, restTime: 60 },
  { exerciseId: 'push-up', name: 'Push-up', type: 'reps', sets: 3, reps: 8, restTime: 60 },
  { exerciseId: 'plank', name: 'Plank', type: 'duration', sets: 2, holdTime: 20, restTime: 60 },
] };

function result(context, id) {
  const timed = context.currentExercise === 'plank';
  return { id, status: 'completed', correctReps: timed ? null : context.target.reps,
    totalHoldTime: timed ? context.target.duration : null, accuracy: 90, duration: 12,
    completedAt: '2026-09-14T00:00:00Z', formIssues: [], workoutContext: context };
}

beforeEach(() => localStorage.clear());

test('cycles in plan order and skips exercises with fewer prescribed sets', () => {
  let session = startOrResumeWorkoutDay(plan, workout);
  const sequence = [];
  for (let count = 0; count < 8; count += 1) {
    const navigation = workoutStepNavigation(session);
    sequence.push(`${navigation.workoutContext.currentExercise}:${navigation.workoutContext.currentSet}`);
    session = recordWorkoutSetResult(result(navigation.workoutContext, `result-${count}`)).session;
  }
  expect(sequence).toEqual(['squat:1', 'push-up:1', 'plank:1', 'squat:2', 'push-up:2', 'plank:2', 'squat:3', 'push-up:3']);
  expect(getWorkoutStep(session)).toBeNull();
});

test('does not advance an incomplete set and ignores duplicate results', () => {
  let session = startOrResumeWorkoutDay(plan, workout);
  const context = workoutStepNavigation(session).workoutContext;
  recordWorkoutSetResult({ ...result(context, 'short'), correctReps: 9 });
  expect(getWorkoutStep(session).exercise.completedSets).toBe(0);
  session = recordWorkoutSetResult(result(context, 'complete')).session;
  recordWorkoutSetResult(result(context, 'complete'));
  expect(session.exercises[0].completedSets).toBe(1);
});
