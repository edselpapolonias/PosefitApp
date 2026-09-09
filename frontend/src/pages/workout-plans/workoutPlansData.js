import squatPhoto from '../../images/exercise-card-squat.png';
import pushUpPhoto from '../../images/exercise-card-push-up.png';
import lungePhoto from '../../images/exercise-card-lunge.png';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';

export const workoutPlans = [
  {
    slug: 'beginner-full-body',
    detailsRoute: '/workout-plans/beginner-full-body',
    level: 'Beginner',
    popular: true,
    title: 'Beginner Full Body',
    description: 'A balanced introduction to fitness using all five PoseFit exercises. Build strength, improve endurance, and create a healthy routine.',
    schedule: '3 Days/Week',
    duration: '30-45 min',
    length: '4 Weeks',
    image: squatPhoto,
    imageAlt: 'Athlete demonstrating a squat',
    exercises: [
      { id: 'squat', name: 'Squat', icon: squatIcon },
      { id: 'push-up', name: 'Push-up', icon: pushUpIcon },
      { id: 'plank', name: 'Plank', icon: plankIcon },
      { id: 'lunge', name: 'Lunge', icon: lungeIcon },
      { id: 'leg-raise', name: 'Leg Raise', icon: legRaiseIcon },
    ],
  },
  {
    slug: 'lower-body-focus',
    detailsRoute: '/workout-plans/lower-body-focus',
    level: 'Intermediate',
    title: 'Lower Body Focus',
    description: 'Focus on building strong legs and glutes with squats and lunges, supported by core work.',
    schedule: '3 Days/Week',
    duration: '30-40 min',
    length: '4 Weeks',
    image: lungePhoto,
    imageAlt: 'Athlete demonstrating a lunge',
    exercises: [
      { id: 'squat', name: 'Squat', icon: squatIcon },
      { id: 'lunge', name: 'Lunge', icon: lungeIcon },
      { id: 'plank', name: 'Plank', icon: plankIcon },
    ],
  },
  {
    slug: 'core-upper-body',
    detailsRoute: '/workout-plans/core-upper-body',
    level: 'Intermediate',
    title: 'Core & Upper Body',
    description: 'Strengthen your core and upper body with effective bodyweight exercises.',
    schedule: '3 Days/Week',
    duration: '25-40 min',
    length: '4 Weeks',
    image: pushUpPhoto,
    imageAlt: 'Athlete demonstrating a push-up',
    exercises: [
      { id: 'push-up', name: 'Push-up', icon: pushUpIcon },
      { id: 'plank', name: 'Plank', icon: plankIcon },
      { id: 'leg-raise', name: 'Leg Raise', icon: legRaiseIcon },
    ],
  },
];
