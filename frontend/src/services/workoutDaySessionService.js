import axios from 'axios';
import { apiUrl } from './apiConfig';
import { getCsrfToken } from './sessionHistoryService';

export const WORKOUT_DAY_SESSIONS_KEY = 'posefitWorkoutDaySessions';

const exerciseRoutes = {
  squat: '/exercises/squat/start',
  'push-up': '/exercises/push-up/start',
  plank: '/exercises/plank/start',
  lunge: '/exercises/lunge/start',
  'leg-raise': '/exercises/leg-raise/start',
};

const planRoutes = {
  'beginner-full-body': '/workout-plans/beginner-full-body',
  'lower-body-focus': '/workout-plans/lower-body-focus',
  'core-upper-body': '/workout-plans/core-upper-body',
};

function readSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(WORKOUT_DAY_SESSIONS_KEY));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}

function writeSession(session) {
  const sessions = readSessions();
  sessions[session.id] = session;
  localStorage.setItem(WORKOUT_DAY_SESSIONS_KEY, JSON.stringify(sessions));
  return session;
}

function positiveInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeExercise(exercise, index) {
  const exerciseId = String(exercise.exerciseId || exercise.id || '').trim().toLowerCase();
  const metricType = exercise.type === 'duration' || exercise.type === 'time' || exerciseId === 'plank'
    ? 'time'
    : 'reps';
  return {
    exerciseId,
    name: exercise.name || exerciseId.replace(/(^|-)(\w)/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`),
    order: positiveInteger(exercise.order, index + 1),
    metricType,
    setsRequired: positiveInteger(exercise.sets, 1),
    repsPerSet: metricType === 'reps' ? positiveInteger(exercise.reps, 1) : null,
    durationPerSet: metricType === 'time' ? positiveInteger(exercise.holdTime, 1) : null,
    restSeconds: positiveInteger(exercise.restTime, null),
    perLeg: Boolean(exercise.perLeg),
    completedSets: 0,
    results: [],
  };
}

export function readWorkoutDaySession(sessionId) {
  if (!sessionId) return null;
  return readSessions()[sessionId] || null;
}

export function getNextExerciseIndex(session, afterIndex = -1) {
  const exercises = session?.exercises || [];
  if (!exercises.length) return -1;
  for (let offset = 1; offset <= exercises.length; offset += 1) {
    const index = (afterIndex + offset + exercises.length) % exercises.length;
    if (exercises[index].completedSets < exercises[index].setsRequired) return index;
  }
  return -1;
}

export function getWorkoutStep(session) {
  if (!session || session.status === 'completed') return null;
  const preferred = Number.isInteger(session.currentExerciseIndex) ? session.currentExerciseIndex : 0;
  const exercise = session.exercises?.[preferred];
  const index = exercise && exercise.completedSets < exercise.setsRequired
    ? preferred
    : getNextExerciseIndex(session, preferred - 1);
  if (index < 0) return null;
  const current = session.exercises[index];
  return {
    index,
    exercise: current,
    currentSet: current.completedSets + 1,
    totalSets: current.setsRequired,
    round: current.completedSets + 1,
  };
}

function sessionIdFor(plan, workout) {
  return `plan-${plan.instanceId || plan.id}-${workout.id}`;
}

export function startOrResumeWorkoutDay(plan, workout) {
  const id = sessionIdFor(plan, workout);
  const stored = readWorkoutDaySession(id);
  if (stored?.status === 'active' && stored.exercises?.length) return stored;

  const session = {
    version: 1,
    id,
    planId: plan.id,
    planInstanceId: plan.instanceId || null,
    planName: plan.name || 'Workout Plan',
    detailsRoute: planRoutes[plan.id] || '/workout-plans',
    workoutId: workout.id,
    week: workout.week,
    workoutDay: workout.day,
    workoutLabel: workout.label,
    scheduledDate: workout.date instanceof Date
      ? `${workout.date.getFullYear()}-${String(workout.date.getMonth() + 1).padStart(2, '0')}-${String(workout.date.getDate()).padStart(2, '0')}`
      : workout.scheduledDate || workout.date || null,
    exercises: (workout.exercises || []).map(normalizeExercise),
    currentExerciseIndex: 0,
    status: 'active',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
  writeSession(session);
  syncDaySession('/api/users/workout-plans/day-sessions/start/', session).catch(() => {});
  return session;
}

export function workoutStepNavigation(session) {
  const step = getWorkoutStep(session);
  if (!step) return null;
  const { exercise } = step;
  const workoutContext = {
    source: 'workout-plan',
    workoutSessionId: session.id,
    planId: session.planId,
    planInstanceId: session.planInstanceId,
    planName: session.planName,
    detailsRoute: session.detailsRoute,
    workoutId: session.workoutId,
    week: session.week,
    workoutDay: session.workoutDay,
    workoutLabel: session.workoutLabel,
    scheduledDate: session.scheduledDate,
    currentExercise: exercise.exerciseId,
    currentExerciseIndex: step.index,
    currentSet: step.currentSet,
    totalSets: step.totalSets,
    currentRound: step.round,
    exerciseOrder: session.exercises.map(({ exerciseId }) => exerciseId),
    target: {
      metricType: exercise.metricType,
      reps: exercise.repsPerSet,
      duration: exercise.durationPerSet,
      rest: exercise.restSeconds,
      perLeg: exercise.perLeg,
    },
  };
  return {
    pathname: exerciseRoutes[exercise.exerciseId],
    search: `?workoutSession=${encodeURIComponent(session.id)}`,
    state: {
      workoutContext,
      workoutConfig: {
        sets: 1,
        reps: exercise.repsPerSet,
        holdTime: exercise.durationPerSet,
        rest: exercise.restSeconds || 60,
      },
    },
    workoutContext,
  };
}

export function resolveWorkoutContext(incomingContext, sessionId, expectedExerciseId) {
  const id = incomingContext?.workoutSessionId || sessionId;
  const session = readWorkoutDaySession(id);
  const navigation = workoutStepNavigation(session);
  const context = navigation?.workoutContext || incomingContext || null;
  return context?.source === 'workout-plan' && context.currentExercise === expectedExerciseId ? context : null;
}

function targetReached(result, exercise) {
  if (result?.status !== 'completed') return false;
  if (exercise.metricType === 'time') return Number(result.totalHoldTime) >= exercise.durationPerSet;
  return Number(result.correctReps) >= exercise.repsPerSet;
}

export function recordWorkoutSetResult(sessionResult) {
  const context = sessionResult?.workoutContext;
  const session = readWorkoutDaySession(context?.workoutSessionId);
  if (!session) return null;
  const index = session.exercises.findIndex(({ exerciseId }) => exerciseId === context.currentExercise);
  if (index < 0) return null;
  const exercise = session.exercises[index];
  if (exercise.results.some(({ sessionResultId }) => sessionResultId === sessionResult.id)) {
    return { session, next: workoutStepNavigation(session), complete: !getWorkoutStep(session), syncPromise: Promise.resolve() };
  }
  if (!targetReached(sessionResult, exercise) || exercise.completedSets >= exercise.setsRequired) {
    return { session, next: workoutStepNavigation(session), complete: false, syncPromise: Promise.resolve() };
  }

  const completedSet = exercise.completedSets + 1;
  exercise.results.push({
    setNumber: completedSet,
    sessionResultId: sessionResult.id,
    target: exercise.metricType === 'time' ? exercise.durationPerSet : exercise.repsPerSet,
    completed: exercise.metricType === 'time' ? sessionResult.totalHoldTime : sessionResult.correctReps,
    accuracy: sessionResult.accuracy,
    duration: sessionResult.duration,
    formIssues: sessionResult.formIssues,
    completedAt: sessionResult.completedAt,
  });
  exercise.completedSets = completedSet;
  const nextIndex = getNextExerciseIndex(session, index);
  session.currentExerciseIndex = nextIndex;
  session.updatedAt = new Date().toISOString();
  writeSession(session);
  const syncPromise = syncDaySession('/api/users/workout-plans/day-sessions/set-complete/', {
    sessionId: session.id,
    exerciseId: exercise.exerciseId,
    sessionResult,
  });
  syncPromise.catch(() => {});
  return { session, next: workoutStepNavigation(session), complete: nextIndex < 0, syncPromise };
}

export function workoutProgress(session) {
  return (session?.exercises || []).map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    completedSets: exercise.completedSets,
    setsRequired: exercise.setsRequired,
  }));
}

async function syncDaySession(path, payload) {
  if (!payload?.planInstanceId && !payload?.sessionId) return null;
  const csrfToken = await getCsrfToken();
  const response = await axios.post(apiUrl(path), payload, {
    withCredentials: true,
    timeout: 15000,
    headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
  });
  return response.data;
}

export async function finishWorkoutDay(sessionId) {
  const session = readWorkoutDaySession(sessionId);
  if (!session || getWorkoutStep(session)) throw new Error('Complete every prescribed set before finishing this workout.');
  if (session.status === 'completed') return { session, plan: null };
  let response = null;
  if (session.planInstanceId) {
    await syncDaySession('/api/users/workout-plans/day-sessions/start/', session);
    const rounds = Math.max(...session.exercises.map(({ setsRequired }) => setsRequired));
    for (let round = 1; round <= rounds; round += 1) {
      for (const exercise of session.exercises) {
        const savedResult = exercise.results.find(({ setNumber }) => setNumber === round);
        if (!savedResult) continue;
        await syncDaySession('/api/users/workout-plans/day-sessions/set-complete/', {
          sessionId: session.id,
          exerciseId: exercise.exerciseId,
          sessionResult: {
            id: savedResult.sessionResultId,
            status: 'completed',
            correctReps: exercise.metricType === 'reps' ? savedResult.completed : null,
            totalHoldTime: exercise.metricType === 'time' ? savedResult.completed : null,
            accuracy: savedResult.accuracy,
            duration: savedResult.duration,
            formIssues: savedResult.formIssues,
            completedAt: savedResult.completedAt,
          },
        });
      }
    }
    response = await syncDaySession('/api/users/workout-plans/day-sessions/finish/', { sessionId });
  }
  session.status = 'completed';
  session.completedAt = new Date().toISOString();
  writeSession(session);
  return { session, plan: response?.plan || null };
}
