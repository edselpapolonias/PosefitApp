import React from 'react';
import ExerciseConfigurationPage from '../../../components/ExerciseConfigurationPage';
import legRaisePhoto from '../../../images/exercise-leg-raise.png';
import legRaiseAnatomyFront from '../../../images/anatomy-leg-raise.png';
import legRaiseAnatomyBack from '../../../images/anatomy-leg-raise-back.png';
import './SquatPage.css';
import './LegRaisePage.css';

const legRaiseExercise = {
  id: 'leg-raise',
  name: 'Leg Raise',
  pageClass: 'leg-raise-page',
  category: 'Core',
  description: 'Strengthen your core and hip flexors with controlled leg raises.',
  photo: legRaisePhoto,
  photoAlt: 'Athlete demonstrating a controlled lying leg raise',
  storageKey: 'posefitLegRaiseWorkoutConfig',
  startRoute: '/exercises/leg-raise/start',
  primaryMuscles: 'Abs, Hip Flexors',
  facts: [
    { icon: 'fa-bullseye', title: 'Primary Muscles', text: 'Abs, Hip Flexors' },
    { icon: 'fa-chart-column', title: 'Difficulty', text: 'Beginner to Advanced' },
    { icon: 'fa-star', title: 'Great For', text: 'Core Strength, Lower Abdominal Control' },
  ],
  presets: [
    { id: 'beginner', name: 'Beginner', sets: 3, reps: 10, rest: 60 },
    { id: 'intermediate', name: 'Intermediate', sets: 4, reps: 12, rest: 60 },
    { id: 'strength', name: 'Strength', sets: 4, reps: 15, rest: 90 },
    { id: 'endurance', name: 'Endurance', sets: 3, reps: 20, rest: 45 },
    { id: 'custom', name: 'Custom' },
  ],
  about: 'The leg raise is a core exercise that lifts your extended legs through controlled hip flexion. It strengthens your lower abdominals and hip flexors while steady body positioning helps protect your lower back.',
  benefits: [
    { icon: 'fa-dumbbell', text: 'Strengthens lower abs' },
    { icon: 'fa-person', text: 'Activates hip flexors' },
    { icon: 'fa-person-rays', text: 'Improves core stability' },
    { icon: 'fa-person-running', text: 'Enhances overall body control' },
  ],
  reminders: [
    { text: 'Begin with both legs straight and close to the floor.', correct: true },
    { text: 'Raise your legs smoothly until you reach the target position.', correct: true },
    { text: 'Keep your knees extended throughout the movement.', correct: true },
    { text: 'Lower your legs under control to complete each repetition.', correct: true },
    { text: 'Avoid bending your knees.', correct: false },
    { text: 'Avoid using momentum or lifting your hips from the floor.', correct: false },
  ],
  anatomy: { front: legRaiseAnatomyFront, back: legRaiseAnatomyBack },
  musclesIntro: 'Leg raises primarily train the abdominals and hip flexors while the obliques and deep core help stabilize your pelvis and torso.',
  muscles: [
    { name: 'Rectus Abdominis', role: 'Stabilizes your torso and controls pelvic position as your legs move.', type: 'Primary', image: legRaiseAnatomyFront, crop: 'leg-raise-rectus' },
    { name: 'Lower Abdominals', role: 'Help control the pelvis and support the lowering phase of each repetition.', type: 'Primary', image: legRaiseAnatomyFront, crop: 'leg-raise-lower-abs' },
    { name: 'Hip Flexors', role: 'Lift your legs through hip flexion during the raising phase.', type: 'Primary', image: legRaiseAnatomyFront, crop: 'leg-raise-hip-flexors' },
    { name: 'External Obliques', role: 'Provide side-to-side stability and help prevent unwanted torso movement.', type: 'Secondary', image: legRaiseAnatomyBack, crop: 'leg-raise-obliques' },
    { name: 'Transverse Abdominis', role: 'Supports your deep core and helps maintain a steady trunk position.', type: 'Secondary', image: legRaiseAnatomyFront, crop: 'leg-raise-transverse' },
  ],
  tip: 'Keep your lower back supported, extend your legs, and move with control. Avoid using momentum.',
  motivation: {
    title: 'A Stronger Core for Better Control',
    text: 'Leg raises strengthen your lower abs and hip flexors to improve core stability, posture, and control in everyday movement.',
  },
};

export default function LegRaisePage() {
  return <ExerciseConfigurationPage exercise={legRaiseExercise} />;
}
