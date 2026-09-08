import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';

export const beginnerExercises = [
  { id: 'squat', name: 'Squat', focus: 'Legs', icon: squatIcon },
  { id: 'push-up', name: 'Push-up', focus: 'Chest, Arms', icon: pushUpIcon },
  { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  { id: 'lunge', name: 'Lunge', focus: 'Legs, Glutes', icon: lungeIcon },
  { id: 'leg-raise', name: 'Leg Raise', focus: 'Hip Flexors, Core', icon: legRaiseIcon },
];

const exercisesById = Object.fromEntries(beginnerExercises.map((exercise) => [exercise.id, exercise]));

export const beginnerSchedule = [
  {
    label: 'DAY 1',
    day: 'Monday',
    estimate: '30–40 min',
    exercises: [
      { ...exercisesById.squat, prescription: '3 sets × 10 reps' },
      { ...exercisesById['push-up'], prescription: '3 sets × 8 reps' },
      { ...exercisesById.plank, prescription: '3 sets × 20 sec' },
    ],
  },
  {
    label: 'DAY 2',
    day: 'Wednesday',
    estimate: '30–40 min',
    exercises: [
      { ...exercisesById.lunge, prescription: '2–3 sets × 8 reps (each leg)' },
      { ...exercisesById['leg-raise'], prescription: '3 sets × 10 reps' },
      { ...exercisesById.plank, prescription: '3 sets × 20 sec' },
    ],
  },
  {
    label: 'DAY 3',
    day: 'Friday',
    estimate: '30–45 min',
    exercises: [
      { ...exercisesById.squat, prescription: '3 sets × 10 reps' },
      { ...exercisesById['push-up'], prescription: '3 sets × 8 reps' },
      { ...exercisesById.lunge, prescription: '2 sets × 8 reps (each leg)' },
      { ...exercisesById['leg-raise'], prescription: '2 sets × 10 reps' },
    ],
  },
];

export const planProgression = [
  { week: 'Week 1', icon: 'fa-calendar-day', text: 'Learn the movements and build consistency.' },
  { week: 'Week 2', icon: 'fa-chart-line', text: 'Improve form and increase stamina.' },
  { week: 'Week 3', icon: 'fa-bullseye', text: 'Build strength and increase endurance.' },
  { week: 'Week 4', icon: 'fa-trophy', text: 'Challenge yourself and stay consistent!' },
];
