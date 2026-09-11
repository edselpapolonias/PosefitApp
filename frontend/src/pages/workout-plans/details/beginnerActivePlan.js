import { beginnerScheduleByWeek } from './beginnerFullBodyData';

export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const workoutDayOffsets = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export function planMonday(value = new Date()) {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`) : new Date(value);
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  valid.setHours(12, 0, 0, 0);
  return addDays(valid, -((valid.getDay() + 6) % 7));
}

export function activePlanSchedule(plan, scheduleByWeek = beginnerScheduleByWeek) {
  const start = planMonday(plan.startDate);
  return Object.values(scheduleByWeek).map((workouts, index) => ({
    week: index + 1,
    start: addDays(start, index * 7),
    end: addDays(start, index * 7 + 6),
    workouts: workouts.map((workout, day) => ({
      ...workout,
      date: addDays(start, index * 7 + (workoutDayOffsets[workout.day] ?? day * 2)),
    })),
  }));
}

export function activePlanProgress(plan, weeks) {
  const workouts = weeks.flatMap((week) => week.workouts);
  const completedIds = new Set(plan.completedWorkoutIds || []);
  const completed = workouts.filter((workout) => completedIds.has(workout.id)).length;
  return { completed, total: workouts.length, remaining: workouts.length - completed,
    percent: Math.round(completed / workouts.length * 100),
    weeksCompleted: weeks.filter((week) => week.workouts.every((workout) => completedIds.has(workout.id))).length,
    nextId: workouts.find((workout) => !completedIds.has(workout.id))?.id,
    completedIds };
}
