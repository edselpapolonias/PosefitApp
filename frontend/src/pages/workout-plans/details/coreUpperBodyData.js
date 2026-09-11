import pushUpIcon from '../../../images/icon-push-up.png';
import plankIcon from '../../../images/icon-plank.png';
import legRaiseIcon from '../../../images/icon-leg-raise.png';

export const CORE_UPPER_PLAN_ID = 'core-upper-body';
export const CORE_UPPER_PLAN_REST_SECONDS = 60;
export const coreUpperWorkoutDays = [
  { label: 'MON', name: 'Monday', offset: 0 },
  { label: 'WED', name: 'Wednesday', offset: 2 },
  { label: 'FRI', name: 'Friday', offset: 4 },
];

const exerciseLibrary = {
  'push-up': { id: 'push-up', name: 'Push-up', focus: 'Chest, Arms', icon: pushUpIcon },
  plank: { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  'leg-raise': { id: 'leg-raise', name: 'Leg Raise', focus: 'Hip Flexors, Core', icon: legRaiseIcon },
};

export const coreUpperExercises = [
  exerciseLibrary['push-up'],
  exerciseLibrary.plank,
  exerciseLibrary['leg-raise'],
];

function repetition(exerciseId, sets, reps) {
  const exercise = exerciseLibrary[exerciseId];
  return {
    ...exercise,
    planId: CORE_UPPER_PLAN_ID,
    exerciseId,
    type: 'reps',
    sets,
    reps,
    restTime: CORE_UPPER_PLAN_REST_SECONDS,
    perLeg: false,
    prescription: `${sets} sets \u00d7 ${reps} reps`,
  };
}

function duration(exerciseId, sets, holdTime) {
  const exercise = exerciseLibrary[exerciseId];
  return {
    ...exercise,
    planId: CORE_UPPER_PLAN_ID,
    exerciseId,
    type: 'duration',
    sets,
    holdTime,
    restTime: CORE_UPPER_PLAN_REST_SECONDS,
    perLeg: false,
    prescription: `${sets} sets \u00d7 ${holdTime} sec`,
  };
}

function workout(week, dayOrder, label, day, focus, estimate, exercises) {
  return {
    id: `core-upper-week-${week}-${day.toLowerCase()}`,
    planId: CORE_UPPER_PLAN_ID,
    week,
    dayOrder,
    label,
    day,
    focus,
    estimate,
    exercises: exercises.map((exercise, index) => ({
      ...exercise,
      week,
      day,
      dayOrder,
      order: index + 1,
    })),
  };
}

export const coreUpperScheduleByWeek = {
  1: [
    workout(1, 1, 'DAY 1', 'Monday', 'Upper Body & Core', '25\u201335 min', [
      repetition('push-up', 3, 8),
      duration('plank', 3, 20),
      repetition('leg-raise', 3, 10),
    ]),
    workout(1, 2, 'DAY 2', 'Wednesday', 'Core & Upper Body', '25\u201335 min', [
      repetition('leg-raise', 3, 10),
      repetition('push-up', 3, 8),
      duration('plank', 3, 20),
    ]),
    workout(1, 3, 'DAY 3', 'Friday', 'Upper Body Endurance', '25\u201335 min', [
      repetition('push-up', 3, 10),
      duration('plank', 3, 25),
      repetition('leg-raise', 3, 12),
    ]),
  ],
  2: [
    workout(2, 1, 'DAY 4', 'Monday', 'Upper Body & Core', '25\u201335 min', [
      repetition('push-up', 3, 10),
      duration('plank', 3, 25),
      repetition('leg-raise', 3, 12),
    ]),
    workout(2, 2, 'DAY 5', 'Wednesday', 'Core & Upper Body', '25\u201335 min', [
      repetition('leg-raise', 3, 12),
      repetition('push-up', 3, 10),
      duration('plank', 3, 25),
    ]),
    workout(2, 3, 'DAY 6', 'Friday', 'Upper Body Endurance', '25\u201335 min', [
      repetition('push-up', 3, 12),
      duration('plank', 3, 30),
      repetition('leg-raise', 3, 12),
    ]),
  ],
  3: [
    workout(3, 1, 'DAY 7', 'Monday', 'Upper Body & Core', '30\u201340 min', [
      repetition('push-up', 4, 10),
      duration('plank', 3, 30),
      repetition('leg-raise', 3, 15),
    ]),
    workout(3, 2, 'DAY 8', 'Wednesday', 'Core & Upper Body', '30\u201340 min', [
      repetition('leg-raise', 3, 15),
      repetition('push-up', 4, 10),
      duration('plank', 3, 30),
    ]),
    workout(3, 3, 'DAY 9', 'Friday', 'Upper Body Endurance', '30\u201340 min', [
      repetition('push-up', 4, 12),
      duration('plank', 3, 35),
      repetition('leg-raise', 3, 15),
    ]),
  ],
  4: [
    workout(4, 1, 'DAY 10', 'Monday', 'Upper Body & Core', '30\u201340 min', [
      repetition('push-up', 4, 12),
      duration('plank', 3, 35),
      repetition('leg-raise', 4, 15),
    ]),
    workout(4, 2, 'DAY 11', 'Wednesday', 'Core & Upper Body', '30\u201340 min', [
      repetition('leg-raise', 4, 15),
      repetition('push-up', 4, 12),
      duration('plank', 3, 35),
    ]),
    workout(4, 3, 'DAY 12', 'Friday', 'Upper Body Endurance', '30\u201340 min', [
      repetition('push-up', 4, 15),
      duration('plank', 3, 40),
      repetition('leg-raise', 4, 15),
    ]),
  ],
};

export const coreUpperSchedule = coreUpperScheduleByWeek[1];

export const coreUpperProgression = [
  { week: 'Week 1', title: 'Foundation', icon: 'fa-calendar-day', text: 'Learn the movements and establish consistent form.' },
  { week: 'Week 2', title: 'Build Strength', icon: 'fa-chart-line', text: 'Increase repetitions and improve upper-body and core strength.' },
  { week: 'Week 3', title: 'Increase Volume', icon: 'fa-bullseye', text: 'Perform more total work and build muscular endurance.' },
  { week: 'Week 4', title: 'Core & Upper Body Challenge', icon: 'fa-trophy', text: 'Complete the highest workload while maintaining proper form.' },
];

export const coreUpperBodyPlan = {
  id: CORE_UPPER_PLAN_ID,
  name: 'Core & Upper Body',
  level: 'Intermediate',
  durationWeeks: 4,
  restTime: CORE_UPPER_PLAN_REST_SECONDS,
  scheduleDays: coreUpperWorkoutDays,
  weeks: Object.values(coreUpperScheduleByWeek),
};
