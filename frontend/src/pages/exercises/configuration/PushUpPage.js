import React from 'react';
import ExerciseConfigurationPage from '../../../components/ExerciseConfigurationPage';
import pushUpPhoto from '../../../images/exercise-card-push-up.png';
import pushUpAnatomyFront from '../../../images/anatomy-push-up.png';
import pushUpAnatomyBack from '../../../images/anatomy-push-up-back.png';
import coreAnatomy from '../../../images/anatomy-leg-raise.png';
import './SquatPage.css';
import './PushUpPage.css';

const pushUpExercise = {
  id: 'push-up',
  name: 'Push-up',
  pageClass: 'push-up-page',
  category: 'Upper Body',
  description: 'Strengthen your chest, shoulders, arms, and core with proper push-up form.',
  photo: pushUpPhoto,
  photoAlt: 'Athlete demonstrating proper push-up form',
  storageKey: 'posefitPushUpWorkoutConfig',
  startRoute: '/exercises/push-up/start',
  primaryMuscles: 'Chest, Shoulders, Triceps',
  facts: [
    { icon: 'fa-bullseye', title: 'Primary Muscles', text: 'Chest, Shoulders, Triceps' },
    { icon: 'fa-chart-column', title: 'Difficulty', text: 'Beginner to Advanced' },
    { icon: 'fa-star', title: 'Great For', text: 'Upper Body Strength, Core Stability' },
  ],
  presets: [
    { id: 'beginner', name: 'Beginner', sets: 3, reps: 8, rest: 60 },
    { id: 'intermediate', name: 'Intermediate', sets: 4, reps: 10, rest: 60 },
    { id: 'strength', name: 'Strength', sets: 4, reps: 15, rest: 90 },
    { id: 'endurance', name: 'Endurance', sets: 3, reps: 20, rest: 45 },
    { id: 'custom', name: 'Custom' },
  ],
  about: 'The push-up is a fundamental upper-body exercise that targets your chest, shoulders, and triceps while also engaging your core. It develops pushing strength, stability, and functional fitness.',
  benefits: [
    { icon: 'fa-dumbbell', text: 'Builds upper body strength' },
    { icon: 'fa-shield-halved', text: 'Improves core stability' },
    { icon: 'fa-person-running', text: 'No equipment needed' },
    { icon: 'fa-chart-column', text: 'Suitable for all fitness levels' },
  ],
  reminders: [
    { text: 'Keep your body in a straight line from head to heels.', correct: true },
    { text: 'Place your hands slightly wider than shoulder width.', correct: true },
    { text: 'Lower your chest with control until your elbows are around 90°.', correct: true },
    { text: 'Keep your core tight and fully extend your arms as you push up.', correct: true },
    { text: 'Avoid sagging hips or flaring your elbows too wide.', correct: false },
  ],
  anatomy: { front: pushUpAnatomyFront, back: pushUpAnatomyBack },
  musclesIntro: 'The push-up primarily targets the muscles in your upper body while also engaging your core for stability.',
  muscles: [
    { name: 'Pectoralis Major', role: 'The main pushing muscle that presses your body away from the floor.', type: 'Primary', image: pushUpAnatomyFront, crop: 'chest' },
    { name: 'Anterior Deltoids', role: 'Support shoulder flexion and stabilize the upper arm during each repetition.', type: 'Primary', image: pushUpAnatomyFront, crop: 'shoulders' },
    { name: 'Triceps Brachii', role: 'Extend the elbows to push your body back to the starting position.', type: 'Primary', image: pushUpAnatomyBack, crop: 'triceps' },
    { name: 'Core', role: 'Stabilizes your body and maintains a straight line from head to heels.', type: 'Secondary', image: coreAnatomy, crop: 'core' },
  ],
  tip: 'Focus on controlled movements and maintain a straight line from head to heels. Quality repetitions matter more than speed.',
  motivation: {
    title: 'Why These Muscles Matter',
    text: 'Push-ups build upper-body strength, improve core stability, and support everyday movement and athletic performance.',
  },
};

export default function PushUpPage() {
  return <ExerciseConfigurationPage exercise={pushUpExercise} />;
}
