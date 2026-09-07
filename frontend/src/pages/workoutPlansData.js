import pushUpPhoto from '../images/exercise-push-up.png';
import lungePhoto from '../images/exercise-lunge.png';
import plankPhoto from '../images/exercise-plank.png';
import squatIcon from '../images/icon-squat.png';
import pushUpIcon from '../images/icon-push-up.png';
import plankIcon from '../images/icon-plank.png';
import lungeIcon from '../images/icon-lunge.png';
import sitUpIcon from '../images/icon-sit-up.png';

export const workoutPlans = [
  {
    slug: 'beginner-full-body',
    detailsRoute: '/workout-plans/beginner-full-body',
    title: 'Beginner Full Body',
    description: 'A balanced introduction to fitness using all five PoseFit exercises. Build strength, improve endurance, and create a healthy routine.',
    schedule: '3 Days/Week',
    duration: '30–45 min',
    length: '4 Weeks',
    image: pushUpPhoto,
    imageAlt: 'Athlete performing a push-up',
    exercises: [
      { name: 'Squat', icon: squatIcon },
      { name: 'Push-up', icon: pushUpIcon },
      { name: 'Plank', icon: plankIcon },
      { name: 'Lunge', icon: lungeIcon },
      { name: 'Sit-up', icon: sitUpIcon },
    ],
  },
  {
    slug: 'lower-body-focus',
    detailsRoute: '/workout-plans/lower-body-focus',
    title: 'Lower Body Focus',
    description: 'Focus on building strong legs and glutes with squats and lunges, supported by core work.',
    schedule: '3 Days/Week',
    duration: '30–40 min',
    length: '4 Weeks',
    image: lungePhoto,
    imageAlt: 'Athlete performing a lunge',
    overlayIcon: lungeIcon,
    exercises: [
      { name: 'Squat', icon: squatIcon },
      { name: 'Lunge', icon: lungeIcon },
      { name: 'Plank', icon: plankIcon },
    ],
  },
  {
    slug: 'core-upper-body',
    detailsRoute: '/workout-plans/core-upper-body',
    title: 'Core & Upper Body',
    description: 'Strengthen your core and upper body with effective bodyweight exercises.',
    schedule: '3 Days/Week',
    duration: '25–40 min',
    length: '4 Weeks',
    image: plankPhoto,
    imageAlt: 'Athlete holding a plank',
    overlayIcon: plankIcon,
    exercises: [
      { name: 'Push-up', icon: pushUpIcon },
      { name: 'Plank', icon: plankIcon },
      { name: 'Sit-up', icon: sitUpIcon },
    ],
  },
];
