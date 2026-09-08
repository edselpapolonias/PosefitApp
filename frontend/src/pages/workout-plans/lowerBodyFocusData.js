import squatIcon from '../../images/icon-squat.png';
import lungeIcon from '../../images/icon-lunge.png';
import plankIcon from '../../images/icon-plank.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';

const exerciseLibrary = {
  squat: { id: 'squat', name: 'Squat', focus: 'Legs, Glutes', icon: squatIcon },
  lunge: { id: 'lunge', name: 'Lunge', focus: 'Legs, Glutes', icon: lungeIcon },
  plank: { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  'leg-raise': { id: 'leg-raise', name: 'Leg Raise', focus: 'Hip Flexors, Core', icon: legRaiseIcon },
};

export const lowerBodyExercises = [exerciseLibrary.squat, exerciseLibrary.lunge, exerciseLibrary.plank];

export const lowerBodySchedule = [
  {
    label: 'DAY 1',
    day: 'Monday',
    estimate: '30–35 min',
    exercises: [
      { ...exerciseLibrary.squat, prescription: '3 sets × 10 reps' },
      { ...exerciseLibrary.lunge, prescription: '3 sets × 8 reps (each leg)' },
      { ...exerciseLibrary.plank, prescription: '3 sets × 20 sec' },
    ],
  },
  {
    label: 'DAY 2',
    day: 'Wednesday',
    estimate: '30–35 min',
    exercises: [
      { ...exerciseLibrary.lunge, prescription: '3 sets × 8 reps (each leg)' },
      { ...exerciseLibrary.squat, prescription: '3 sets × 10 reps' },
      { ...exerciseLibrary['leg-raise'], prescription: '3 sets × 10 reps' },
    ],
  },
  {
    label: 'DAY 3',
    day: 'Friday',
    estimate: '35–40 min',
    exercises: [
      { ...exerciseLibrary.squat, prescription: '3 sets × 10 reps' },
      { ...exerciseLibrary.lunge, prescription: '3 sets × 8 reps (each leg)' },
      { ...exerciseLibrary.plank, prescription: '3 sets × 20 sec' },
    ],
  },
];

export const lowerBodyProgression = [
  { week: 'Week 1', icon: 'fa-weight-hanging', text: 'Build consistency and perfect your form.' },
  { week: 'Week 2', icon: 'fa-chart-line', text: 'Increase reps or hold time.' },
  { week: 'Week 3', icon: 'fa-bullseye', text: 'Add intensity and improve endurance.' },
  { week: 'Week 4', icon: 'fa-trophy', text: 'Push your limits and see progress!' },
];
