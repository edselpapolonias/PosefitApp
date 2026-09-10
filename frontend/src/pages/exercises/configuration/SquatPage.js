import React from 'react';
import ExerciseConfigurationPage from '../../../components/ExerciseConfigurationPage';
import squatPhoto from '../../../images/exercise-card-squat.png';
import squatAnatomyFront from '../../../images/anatomy-squat.png';
import squatAnatomyBack from '../../../images/anatomy-squat-back.png';
import coreAnatomy from '../../../images/anatomy-leg-raise.png';
import './SquatPage.css';

const squatExercise = {
  id: 'squat',
  name: 'Squat',
  demoVideo: '/videos/how-to-perform/Squat.mp4',
  category: 'Lower Body',
  description: 'Build lower-body strength and improve balance and mobility.',
  photo: squatPhoto,
  photoAlt: 'Athlete demonstrating proper squat form',
  storageKey: 'posefitSquatWorkoutConfig',
  startRoute: '/exercises/squat/start',
  primaryMuscles: 'Quadriceps, Hamstrings, Glutes',
  facts: [
    { icon: 'fa-bullseye', title: 'Primary Muscles', text: 'Quadriceps, Hamstrings, Glutes' },
    { icon: 'fa-chart-column', title: 'Difficulty', text: 'Beginner to Advanced' },
    { icon: 'fa-star', title: 'Great For', text: 'Strength, Balance, Mobility' },
  ],
  presets: [
    { id: 'beginner', name: 'Beginner', sets: 3, reps: 10, rest: 60 },
    { id: 'intermediate', name: 'Intermediate', sets: 4, reps: 12, rest: 60 },
    { id: 'strength', name: 'Strength', sets: 4, reps: 8, rest: 90 },
    { id: 'endurance', name: 'Endurance', sets: 3, reps: 15, rest: 45 },
    { id: 'custom', name: 'Custom' },
  ],
  about: 'The squat is a fundamental lower-body exercise that builds strength, stability, and overall mobility. It targets your thighs, glutes, and core while improving balance and functional movement.',
  reminders: [
    { text: 'Keep your chest up and back straight.', correct: true },
    { text: 'Your knees should track naturally over your toes.', correct: true },
    { text: 'Lower your hips until your thighs are parallel to the floor or lower.', correct: true },
    { text: 'Push through your heels to stand up.', correct: true },
    { text: 'Avoid letting your knees collapse inward.', correct: false },
  ],
  anatomy: { front: squatAnatomyFront, back: squatAnatomyBack },
  musclesIntro: 'The squat primarily targets the muscles in your lower body while also engaging your core for stability.',
  muscles: [
    { name: 'Quadriceps', role: 'Responsible for knee extension and helping you stand up from the squat.', type: 'Primary', image: squatAnatomyFront, crop: 'quadriceps' },
    { name: 'Glutes', role: 'Help with hip extension and build overall lower-body strength.', type: 'Primary', image: squatAnatomyBack, crop: 'glutes' },
    { name: 'Hamstrings', role: 'Assist hip extension and knee flexion, working together with the glutes.', type: 'Primary', image: squatAnatomyBack, crop: 'hamstrings' },
    { name: 'Core', role: 'Stabilizes your body and helps maintain proper posture throughout the movement.', type: 'Secondary', image: coreAnatomy, crop: 'core' },
  ],
  tip: 'Focus on proper form over speed. Keep your chest up, knees tracking naturally, and go as low as you can while maintaining control.',
  motivation: {
    title: 'Stronger Legs, A Stronger You',
    text: 'Squats build key lower-body muscles that improve everyday movement, balance, and athletic performance.',
  },
};

export default function SquatPage() {
  return <ExerciseConfigurationPage exercise={squatExercise} />;
}
