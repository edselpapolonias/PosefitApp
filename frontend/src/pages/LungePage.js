import React from 'react';
import ExerciseConfigurationPage from '../components/ExerciseConfigurationPage';
import lungePhoto from '../images/exercise-card-lunge.png';
import lungeAnatomyFront from '../images/anatomy-lunge.png';
import lungeAnatomyBack from '../images/anatomy-lunge-back.png';
import coreAnatomy from '../images/anatomy-leg-raise.png';
import './SquatPage.css';
import './LungePage.css';

const lungeExercise = {
  id: 'lunge',
  name: 'Lunge',
  pageClass: 'lunge-page',
  category: 'Lower Body',
  description: 'Build lower-body strength, improve balance, and enhance stability with proper lunge form.',
  photo: lungePhoto,
  photoAlt: 'Athlete demonstrating a proper forward lunge',
  storageKey: 'posefitLungeWorkoutConfig',
  startRoute: '/exercises/lunge/start',
  primaryMuscles: 'Quadriceps, Hamstrings, Glutes',
  facts: [
    { icon: 'fa-bullseye', title: 'Primary Muscles', text: 'Quadriceps, Glutes, Hamstrings' },
    { icon: 'fa-chart-column', title: 'Difficulty', text: 'Beginner to Advanced' },
    { icon: 'fa-star', title: 'Great For', text: 'Strength, Balance, Stability' },
  ],
  presets: [
    { id: 'beginner', name: 'Beginner', sets: 3, reps: 10, rest: 60 },
    { id: 'intermediate', name: 'Intermediate', sets: 4, reps: 12, rest: 60 },
    { id: 'strength', name: 'Strength', sets: 4, reps: 12, rest: 90 },
    { id: 'endurance', name: 'Endurance', sets: 3, reps: 20, rest: 45 },
    { id: 'custom', name: 'Custom' },
  ],
  about: 'The lunge is a unilateral lower-body exercise that strengthens your quadriceps, glutes, and hamstrings while improving balance, stability, and coordination for everyday movement.',
  benefits: [
    { icon: 'fa-hand-fist', text: 'Builds lower body strength' },
    { icon: 'fa-scale-balanced', text: 'Improves balance and stability' },
    { icon: 'fa-person-running', text: 'Enhances functional movement' },
    { icon: 'fa-chart-column', text: 'Suitable for all fitness levels' },
  ],
  reminders: [
    { text: 'Keep your chest up and your torso controlled.', correct: true },
    { text: 'Track your front knee naturally over your toes.', correct: true },
    { text: 'Lower your rear knee toward the floor with control.', correct: true },
    { text: 'Push through your front foot to return to standing.', correct: true },
    { text: 'Avoid letting your front knee collapse inward.', correct: false },
    { text: 'Avoid leaning your torso too far forward.', correct: false },
  ],
  anatomy: { front: lungeAnatomyFront, back: lungeAnatomyBack },
  musclesIntro: 'The lunge primarily trains your lower body while your core stabilizes your torso and helps maintain balance.',
  muscles: [
    { name: 'Quadriceps', role: 'Extend the knee and control both the lowering and rising phases.', type: 'Primary', image: lungeAnatomyFront, crop: 'lunge-quadriceps' },
    { name: 'Gluteus Maximus', role: 'Extends and stabilizes the hips as you drive back to the starting position.', type: 'Primary', image: lungeAnatomyBack, crop: 'lunge-glutes' },
    { name: 'Hamstrings', role: 'Support hip extension, knee control, and lower-body stability.', type: 'Primary', image: lungeAnatomyBack, crop: 'lunge-hamstrings' },
    { name: 'Core', role: 'Keeps your torso stable and helps maintain balance and upright posture.', type: 'Secondary', image: coreAnatomy, crop: 'core' },
  ],
  tip: 'Keep your upper body upright, engage your core, and make sure your front knee stays aligned naturally over your toes.',
  motivation: {
    title: 'Stronger Legs, Better Stability',
    text: 'Lunges activate multiple lower-body muscles to build strength, improve balance, and enhance functional movement.',
  },
};

export default function LungePage() {
  return <ExerciseConfigurationPage exercise={lungeExercise} />;
}
