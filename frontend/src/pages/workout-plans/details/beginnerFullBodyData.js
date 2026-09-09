import squatIcon from '../../../images/icon-squat.png';
import pushUpIcon from '../../../images/icon-push-up.png';
import plankIcon from '../../../images/icon-plank.png';
import lungeIcon from '../../../images/icon-lunge.png';
import legRaiseIcon from '../../../images/icon-leg-raise.png';

export const BEGINNER_PLAN_REST_SECONDS = 60;

export const beginnerExercises = [
  { id: 'squat', name: 'Squat', focus: 'Legs', icon: squatIcon },
  { id: 'push-up', name: 'Push-up', focus: 'Chest, Arms', icon: pushUpIcon },
  { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  { id: 'lunge', name: 'Lunge', focus: 'Legs, Glutes', icon: lungeIcon },
  { id: 'leg-raise', name: 'Leg Raise', focus: 'Hip Flexors, Core', icon: legRaiseIcon },
];

const exercisesById = Object.fromEntries(beginnerExercises.map((exercise) => [exercise.id, exercise]));

function repetition(exerciseId, sets, reps, perLeg = false) {
  const exercise = exercisesById[exerciseId];
  return {
    ...exercise,
    exerciseId,
    type: 'reps',
    sets,
    reps,
    restTime: BEGINNER_PLAN_REST_SECONDS,
    perLeg,
    prescription: `${sets} sets \u00d7 ${reps} reps${perLeg ? ' each leg' : ''}`,
  };
}

function duration(exerciseId, sets, holdTime) {
  const exercise = exercisesById[exerciseId];
  return {
    ...exercise,
    exerciseId,
    type: 'duration',
    sets,
    holdTime,
    restTime: BEGINNER_PLAN_REST_SECONDS,
    perLeg: false,
    prescription: `${sets} sets \u00d7 ${holdTime} sec`,
  };
}

function workout(week, label, day, focus, estimate, exercises) {
  return {
    id: `week-${week}-${day.toLowerCase()}`,
    week,
    label,
    day,
    focus,
    estimate,
    exercises: exercises.map((exercise, index) => ({ ...exercise, week, day, order: index + 1 })),
  };
}

export const beginnerScheduleByWeek = {
  1: [
    workout(1, 'DAY 1', 'Monday', 'Lower & Upper Body', '30–40 min', [
      repetition('squat', 3, 10),
      repetition('push-up', 3, 8),
      duration('plank', 3, 20),
    ]),
    workout(1, 'DAY 2', 'Wednesday', 'Lower Body & Core', '30–40 min', [
      repetition('lunge', 2, 8, true),
      repetition('leg-raise', 3, 10),
      duration('plank', 3, 20),
    ]),
    workout(1, 'DAY 3', 'Friday', 'Full Body', '30–45 min', [
      repetition('squat', 3, 10),
      repetition('push-up', 3, 8),
      repetition('lunge', 2, 8, true),
      repetition('leg-raise', 2, 10),
    ]),
  ],
  2: [
    workout(2, 'DAY 1', 'Monday', 'Lower & Upper Body', '30–40 min', [
      repetition('squat', 3, 12),
      repetition('push-up', 3, 10),
      duration('plank', 3, 25),
    ]),
    workout(2, 'DAY 2', 'Wednesday', 'Lower Body & Core', '30–40 min', [
      repetition('lunge', 3, 8, true),
      repetition('leg-raise', 3, 12),
      duration('plank', 3, 25),
    ]),
    workout(2, 'DAY 3', 'Friday', 'Full Body', '30–45 min', [
      repetition('squat', 3, 12),
      repetition('push-up', 3, 10),
      repetition('lunge', 2, 10, true),
      repetition('leg-raise', 2, 12),
    ]),
  ],
  3: [
    workout(3, 'DAY 1', 'Monday', 'Lower & Upper Body', '30–40 min', [
      repetition('squat', 3, 15),
      repetition('push-up', 3, 10),
      duration('plank', 3, 30),
    ]),
    workout(3, 'DAY 2', 'Wednesday', 'Lower Body & Core', '30–40 min', [
      repetition('lunge', 3, 10, true),
      repetition('leg-raise', 3, 12),
      duration('plank', 3, 30),
    ]),
    workout(3, 'DAY 3', 'Friday', 'Full Body', '30–45 min', [
      repetition('squat', 3, 15),
      repetition('push-up', 3, 10),
      repetition('lunge', 3, 10, true),
      repetition('leg-raise', 3, 12),
    ]),
  ],
  4: [
    workout(4, 'DAY 1', 'Monday', 'Lower & Upper Body', '30–40 min', [
      repetition('squat', 3, 15),
      repetition('push-up', 3, 12),
      duration('plank', 3, 35),
    ]),
    workout(4, 'DAY 2', 'Wednesday', 'Lower Body & Core', '30–40 min', [
      repetition('lunge', 3, 12, true),
      repetition('leg-raise', 3, 15),
      duration('plank', 3, 35),
    ]),
    workout(4, 'DAY 3', 'Friday', 'Full Body', '30–45 min', [
      repetition('squat', 3, 15),
      repetition('push-up', 3, 12),
      repetition('lunge', 3, 12, true),
      repetition('leg-raise', 3, 15),
    ]),
  ],
};

export const beginnerSchedule = beginnerScheduleByWeek[1];

export const planProgression = [
  { week: 'Week 1', title: 'Foundation', icon: 'fa-calendar-day', text: 'Learn the movements and build consistency.' },
  { week: 'Week 2', title: 'Build Consistency', icon: 'fa-chart-line', text: 'Improve form and increase stamina.' },
  { week: 'Week 3', title: 'Increase Volume', icon: 'fa-bullseye', text: 'Build strength and increase endurance.' },
  { week: 'Week 4', title: 'Beginner Challenge', icon: 'fa-trophy', text: 'Challenge yourself while maintaining good form.' },
];

export const beginnerFullBodyPlan = {
  id: 'beginner-full-body',
  name: 'Beginner Full Body',
  durationWeeks: 4,
  restTime: BEGINNER_PLAN_REST_SECONDS,
  weeks: Object.values(beginnerScheduleByWeek),
};
