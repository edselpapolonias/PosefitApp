import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import sitUpIcon from '../../images/icon-sit-up.png';

const exerciseLibrary = {
  'push-up': { id: 'push-up', name: 'Push-up', focus: 'Chest, Shoulders, Triceps', icon: pushUpIcon },
  plank: { id: 'plank', name: 'Plank', focus: 'Core', icon: plankIcon },
  'sit-up': { id: 'sit-up', name: 'Sit-up', focus: 'Core', icon: sitUpIcon },
};

export const coreUpperExercises = [exerciseLibrary['push-up'], exerciseLibrary.plank, exerciseLibrary['sit-up']];

export const coreUpperSchedule = [
  {
    label: 'DAY 1',
    day: 'Monday',
    estimate: '25–35 min',
    exercises: [
      { ...exerciseLibrary['push-up'], prescription: '3 sets × 8 reps' },
      { ...exerciseLibrary.plank, prescription: '3 sets × 20 sec' },
      { ...exerciseLibrary['sit-up'], prescription: '3 sets × 10 reps' },
    ],
  },
  {
    label: 'DAY 2',
    day: 'Wednesday',
    estimate: '25–35 min',
    exercises: [
      { ...exerciseLibrary['sit-up'], prescription: '3 sets × 10 reps' },
      { ...exerciseLibrary['push-up'], prescription: '3 sets × 8 reps' },
      { ...exerciseLibrary.plank, prescription: '3 sets × 20 sec' },
    ],
  },
  {
    label: 'DAY 3',
    day: 'Friday',
    estimate: '25–35 min',
    exercises: [
      { ...exerciseLibrary['push-up'], prescription: '3 sets × 10 reps' },
      { ...exerciseLibrary.plank, prescription: '3 sets × 25 sec' },
      { ...exerciseLibrary['sit-up'], prescription: '3 sets × 12 reps' },
    ],
  },
];

export const coreUpperProgression = [
  { week: 'Week 1', icon: 'fa-calendar-day', text: 'Build consistency and learn proper form.' },
  { week: 'Week 2', icon: 'fa-chart-line', text: 'Increase reps or hold time.' },
  { week: 'Week 3', icon: 'fa-bullseye', text: 'Add intensity and improve execution.' },
  { week: 'Week 4', icon: 'fa-trophy', text: 'Push your limits and stay consistent!' },
];

