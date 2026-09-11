import squatIcon from '../../../images/icon-squat.png';
import lungeIcon from '../../../images/icon-lunge.png';
import plankIcon from '../../../images/icon-plank.png';
import legRaiseIcon from '../../../images/icon-leg-raise.png';

export const LOWER_BODY_PLAN_ID = 'lower-body-focus';
export const LOWER_BODY_PLAN_REST_SECONDS = 60;
export const lowerBodyWorkoutDays = [
  { label: 'TUE', name: 'Tuesday', offset: 1 },
  { label: 'THU', name: 'Thursday', offset: 3 },
  { label: 'SAT', name: 'Saturday', offset: 5 },
];

const exerciseLibrary = {
  squat: { id: 'squat', name: 'Squat', focus: 'Legs', icon: squatIcon },
  lunge: { id: 'lunge', name: 'Lunge', focus: 'Legs, Glutes', icon: lungeIcon },
  plank: { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  'leg-raise': { id: 'leg-raise', name: 'Leg Raise', focus: 'Hip Flexors, Core', icon: legRaiseIcon },
};

export const lowerBodyExercises = [
  exerciseLibrary.squat,
  exerciseLibrary.lunge,
  exerciseLibrary.plank,
  exerciseLibrary['leg-raise'],
];

function repetition(exerciseId, sets, reps, perLeg = false) {
  const exercise = exerciseLibrary[exerciseId];
  return {
    ...exercise,
    planId: LOWER_BODY_PLAN_ID,
    exerciseId,
    type: 'reps',
    sets,
    reps,
    restTime: LOWER_BODY_PLAN_REST_SECONDS,
    perLeg,
    prescription: `${sets} sets \u00d7 ${reps} reps${perLeg ? ' each leg' : ''}`,
  };
}

function duration(exerciseId, sets, holdTime) {
  const exercise = exerciseLibrary[exerciseId];
  return {
    ...exercise,
    planId: LOWER_BODY_PLAN_ID,
    exerciseId,
    type: 'duration',
    sets,
    holdTime,
    restTime: LOWER_BODY_PLAN_REST_SECONDS,
    perLeg: false,
    prescription: `${sets} sets \u00d7 ${holdTime} sec`,
  };
}

function workout(week, label, day, focus, estimate, exercises) {
  return {
    id: `lower-body-week-${week}-${day.toLowerCase()}`,
    planId: LOWER_BODY_PLAN_ID,
    week,
    label,
    day,
    focus,
    estimate,
    exercises: exercises.map((exercise, index) => ({ ...exercise, week, day, order: index + 1 })),
  };
}

export const lowerBodyScheduleByWeek = {
  1: [
    workout(1, 'DAY 1', 'Tuesday', 'Leg Strength & Core', '30\u201335 min', [
      repetition('squat', 3, 10),
      repetition('lunge', 3, 8, true),
      duration('plank', 3, 20),
    ]),
    workout(1, 'DAY 2', 'Thursday', 'Balance & Stability', '30\u201335 min', [
      repetition('lunge', 3, 8, true),
      repetition('squat', 3, 10),
      repetition('leg-raise', 3, 10),
    ]),
    workout(1, 'DAY 3', 'Saturday', 'Lower Body & Core', '35\u201340 min', [
      repetition('squat', 3, 10),
      repetition('lunge', 3, 8, true),
      duration('plank', 3, 20),
    ]),
  ],
  2: [
    workout(2, 'DAY 4', 'Tuesday', 'Leg Strength & Core', '30\u201335 min', [
      repetition('squat', 3, 12),
      repetition('lunge', 3, 10, true),
      duration('plank', 3, 25),
    ]),
    workout(2, 'DAY 5', 'Thursday', 'Balance & Stability', '30\u201335 min', [
      repetition('lunge', 3, 10, true),
      repetition('squat', 3, 12),
      repetition('leg-raise', 3, 12),
    ]),
    workout(2, 'DAY 6', 'Saturday', 'Lower Body & Core', '35\u201340 min', [
      repetition('squat', 3, 12),
      repetition('lunge', 3, 10, true),
      duration('plank', 3, 25),
    ]),
  ],
  3: [
    workout(3, 'DAY 7', 'Tuesday', 'Leg Strength & Core', '35\u201340 min', [
      repetition('squat', 4, 12),
      repetition('lunge', 3, 10, true),
      duration('plank', 3, 30),
    ]),
    workout(3, 'DAY 8', 'Thursday', 'Balance & Stability', '35\u201340 min', [
      repetition('lunge', 3, 12, true),
      repetition('squat', 4, 12),
      repetition('leg-raise', 3, 15),
    ]),
    workout(3, 'DAY 9', 'Saturday', 'Lower Body & Core', '35\u201340 min', [
      repetition('squat', 4, 12),
      repetition('lunge', 3, 12, true),
      duration('plank', 3, 30),
    ]),
  ],
  4: [
    workout(4, 'DAY 10', 'Tuesday', 'Leg Strength & Core', '35\u201340 min', [
      repetition('squat', 4, 15),
      repetition('lunge', 3, 12, true),
      duration('plank', 3, 35),
    ]),
    workout(4, 'DAY 11', 'Thursday', 'Balance & Stability', '35\u201340 min', [
      repetition('lunge', 3, 12, true),
      repetition('squat', 4, 15),
      repetition('leg-raise', 3, 15),
    ]),
    workout(4, 'DAY 12', 'Saturday', 'Lower Body & Core', '35\u201340 min', [
      repetition('squat', 4, 15),
      repetition('lunge', 3, 12, true),
      duration('plank', 3, 35),
    ]),
  ],
};

export const lowerBodySchedule = lowerBodyScheduleByWeek[1];

export const lowerBodyProgression = [
  { week: 'Week 1', title: 'Foundation', icon: 'fa-weight-hanging', text: 'Build proper movement patterns and establish consistency.' },
  { week: 'Week 2', title: 'Build Strength', icon: 'fa-chart-line', text: 'Increase repetitions and strengthen the lower body.' },
  { week: 'Week 3', title: 'Increase Volume', icon: 'fa-bullseye', text: 'Perform more total work to develop strength and endurance.' },
  { week: 'Week 4', title: 'Lower Body Challenge', icon: 'fa-trophy', text: 'Complete the highest workload while maintaining proper form.' },
];

export const lowerBodyFocusPlan = {
  id: LOWER_BODY_PLAN_ID,
  name: 'Lower Body Focus',
  level: 'Intermediate',
  durationWeeks: 4,
  restTime: LOWER_BODY_PLAN_REST_SECONDS,
  weeks: Object.values(lowerBodyScheduleByWeek),
};
