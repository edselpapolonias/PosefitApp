import React from 'react';
import ExerciseConfigurationPage from '../components/ExerciseConfigurationPage';
import plankPhoto from '../images/exercise-card-plank.png';
import plankAnatomyFront from '../images/anatomy-plank.png';
import plankAnatomyBack from '../images/anatomy-plank-back.png';
import './SquatPage.css';
import './PlankPage.css';

const plankExercise = {
  id: 'plank',
  name: 'Plank',
  pageClass: 'plank-page',
  category: 'Core',
  description: 'Improve core stability, posture, and overall body control with a proper plank.',
  photo: plankPhoto,
  photoAlt: 'Athlete demonstrating a proper forearm plank',
  storageKey: 'posefitPlankWorkoutConfig',
  startRoute: '/exercises/plank/start',
  primaryMuscles: 'Core, Shoulders, Lower Back',
  metric: {
    key: 'hold',
    queryKey: 'hold',
    label: 'Hold Time',
    description: 'Duration to hold the plank per set.',
    suffix: ' sec',
    presetSuffix: ' sec',
    icon: 'fa-clock',
    min: 10,
    max: 180,
    step: 5,
  },
  facts: [
    { icon: 'fa-bullseye', title: 'Primary Muscles', text: 'Core, Shoulders, Lower Back' },
    { icon: 'fa-chart-column', title: 'Difficulty', text: 'Beginner to Advanced' },
    { icon: 'fa-star', title: 'Great For', text: 'Core Strength, Stability, Posture' },
  ],
  presets: [
    { id: 'beginner', name: 'Beginner', sets: 3, hold: 20, rest: 60 },
    { id: 'intermediate', name: 'Intermediate', sets: 3, hold: 40, rest: 60 },
    { id: 'strength', name: 'Strength', sets: 4, hold: 60, rest: 90 },
    { id: 'endurance', name: 'Endurance', sets: 4, hold: 90, rest: 60 },
    { id: 'custom', name: 'Custom' },
  ],
  about: 'The plank is an isometric core exercise that strengthens your abdominal muscles, lower back, shoulders, and glutes. Holding proper alignment builds endurance, improves posture, and develops whole-body stability.',
  benefits: [
    { icon: 'fa-dumbbell', text: 'Builds core strength' },
    { icon: 'fa-shield-halved', text: 'Improves posture' },
    { icon: 'fa-person-rays', text: 'Enhances stability' },
    { icon: 'fa-chart-column', text: 'Suitable for all fitness levels' },
  ],
  reminders: [
    { text: 'Keep your body in a straight line from head to heels.', correct: true },
    { text: 'Engage your core and avoid letting your hips sag.', correct: true },
    { text: 'Keep your shoulders directly above your elbows.', correct: true },
    { text: 'Breathe normally and hold the position with control.', correct: true },
    { text: 'Avoid raising your hips too high or arching your back.', correct: false },
  ],
  anatomy: { front: plankAnatomyFront, back: plankAnatomyBack },
  musclesIntro: 'The plank primarily targets your core muscles while also engaging your shoulders, back, and glutes for overall stability.',
  muscles: [
    { name: 'Rectus Abdominis', role: 'Stabilizes your torso and helps maintain a straight body line.', type: 'Primary', image: plankAnatomyFront, crop: 'plank-rectus' },
    { name: 'External Obliques', role: 'Resist rotation and support stable alignment throughout the hold.', type: 'Primary', image: plankAnatomyFront, crop: 'plank-obliques' },
    { name: 'Transverse Abdominis', role: 'Provides deep core support and helps keep your spine stable.', type: 'Primary', image: plankAnatomyFront, crop: 'plank-transverse' },
    { name: 'Shoulders (Deltoids)', role: 'Maintain upper-body stability while your forearms support your weight.', type: 'Secondary', image: plankAnatomyBack, crop: 'plank-shoulders' },
    { name: 'Lower Back', role: 'Supports spinal alignment and helps keep your body straight.', type: 'Secondary', image: plankAnatomyBack, crop: 'plank-lower-back' },
    { name: 'Glutes', role: 'Maintain hip stability and help prevent your hips from sagging.', type: 'Secondary', image: plankAnatomyBack, crop: 'plank-glutes' },
  ],
  tip: 'Keep your body in a straight line from head to heels. Engage your core and avoid letting your hips sag or rise too high.',
  motivation: {
    title: 'A Stronger Core for a Stronger You',
    text: 'The plank activates multiple muscle groups, helping build core strength, improve posture, and enhance overall stability.',
  },
};

export default function PlankPage() {
  return <ExerciseConfigurationPage exercise={plankExercise} />;
}
