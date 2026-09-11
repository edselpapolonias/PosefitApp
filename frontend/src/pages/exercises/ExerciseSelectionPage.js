import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import squatPhoto from '../../images/exercise-card-squat.png';
import pushUpPhoto from '../../images/exercise-card-push-up.png';
import plankPhoto from '../../images/exercise-card-plank.png';
import lungePhoto from '../../images/exercise-card-lunge.png';
import legRaisePhoto from '../../images/exercise-leg-raise.png';
import squatAnatomy from '../../images/anatomy-squat.png';
import pushUpAnatomy from '../../images/anatomy-push-up.png';
import plankAnatomy from '../../images/anatomy-plank.png';
import lungeAnatomy from '../../images/anatomy-lunge.png';
import legRaiseAnatomy from '../../images/anatomy-leg-raise.png';
import './ExerciseSelectionPage.css';

const exercises = [
  {
    id: 'squat', number: '01', name: 'Squat', category: 'Lower Body', tone: 'orange', anatomy: squatAnatomy,
    description: 'Build lower body strength and improve balance and mobility.',
    muscles: ['Quadriceps', 'Hamstrings', 'Glutes'], image: squatPhoto, route: '/exercises/squat',
  },
  {
    id: 'push-up', number: '02', name: 'Push-up', category: 'Upper Body', tone: 'blue', anatomy: pushUpAnatomy,
    description: 'Strengthen your chest, shoulders, arms, and core.',
    muscles: ['Chest', 'Shoulders', 'Triceps'], image: pushUpPhoto, route: '/exercises/push-up',
  },
  {
    id: 'plank', number: '03', name: 'Plank', category: 'Core', tone: 'purple', anatomy: plankAnatomy,
    description: 'Improve core stability and overall body control.',
    muscles: ['Core', 'Shoulders', 'Lower Back'], image: plankPhoto, route: '/exercises/plank',
  },
  {
    id: 'lunge', number: '04', name: 'Lunge', category: 'Lower Body', tone: 'orange', anatomy: lungeAnatomy,
    description: 'Improve leg strength, balance, and coordination.',
    muscles: ['Quadriceps', 'Hamstrings', 'Glutes'], image: lungePhoto, route: '/exercises/lunge',
  },
  {
    id: 'leg-raise', number: '05', name: 'Leg Raise', category: 'Core', tone: 'purple', anatomy: legRaiseAnatomy,
    description: 'Strengthen your core and improve hip flexor strength.',
    muscles: ['Abs', 'Hip Flexors'], image: legRaisePhoto, route: '/exercises/leg-raise',
  },
];

const filters = ['All Exercises (5)', 'Lower Body', 'Upper Body', 'Core', 'Full Body'];

const steps = [
  { icon: 'fa-bullseye', title: '1. Choose Exercise', text: 'Select an exercise from the list above.' },
  { icon: 'fa-sliders', title: '2. Set Your Goals', text: 'Set your reps, sets, and rest time.' },
  { icon: 'fa-circle-play', title: '3. Start Workout', text: 'Follow the real-time feedback and do your best!' },
  { icon: 'fa-chart-simple', title: '4. See Results', text: 'Review your performance and track your progress.' },
];

export default function ExerciseSelectionPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const visibleExercises = useMemo(() => {
    const category = activeFilter.replace(' (5)', '');
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return exercises
      .filter((exercise) => category === 'All Exercises' || exercise.category === category)
      .filter((exercise) => !normalizedSearch || exercise.name.toLowerCase().includes(normalizedSearch));
  }, [activeFilter, searchTerm]);

  return (
    <div className="exercise-page">
      <Navbar activeItem="Exercises" />

      <main className="exercise-page__main">
        <section className="exercise-hero" aria-labelledby="exercise-page-title">
          <div className="exercise-hero__copy">
            <p className="exercise-hero__eyebrow">EXERCISES</p>
            <h1 id="exercise-page-title">Choose Your Exercise</h1>
            <p className="exercise-hero__intro">Start your training, improve your form, and reach your fitness goals.</p>
          </div>
          <div className="exercise-hero__motivation" aria-hidden="true">
            <p className="exercise-hero__script">Better Form<br />A Stronger You</p>
            <span className="exercise-hero__stroke" />
          </div>
          <div className="exercise-hero__consistency" aria-hidden="true">
            <p>CONSISTENCY<br />CREATES<br />PROGRESS</p>
            <span className="exercise-hero__bars"><i /><i /><i /></span>
          </div>
        </section>

        <section className="exercise-toolbar" aria-label="Exercise filters and search">
          <div className="exercise-toolbar__filters">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`exercise-filter${activeFilter === filter ? ' exercise-filter--active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="exercise-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <span className="sr-only">Search exercises</span>
            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search exercises..." />
          </label>
        </section>

        <section className="exercise-grid" aria-label="Available exercises">
          {visibleExercises.map((exercise) => (
            <article className={`exercise-card exercise-card--${exercise.tone} exercise-card--${exercise.id}`} key={exercise.id}>
              <div className="exercise-card__photo">
                <img decoding="async" loading="lazy" className="exercise-card__photo-image" src={exercise.image} alt={`${exercise.name} exercise demonstration`} />
                <span className="exercise-card__number" aria-hidden="true">{exercise.number}</span>
                <img decoding="async" loading="lazy" className="exercise-card__anatomy" src={exercise.anatomy} alt={`${exercise.name} primary muscle areas`} />
              </div>
              <div className="exercise-card__content">
                <h2>{exercise.name}</h2>
                <span className="exercise-card__category">{exercise.category}</span>
                <p>{exercise.description}</p>
                <div className="exercise-card__muscles">
                  <strong>Primary Muscles</strong>
                  <div className="exercise-card__muscle-tags">
                    {exercise.muscles.map((muscle) => <span key={muscle}>{muscle}</span>)}
                  </div>
                </div>
                <button className="exercise-card__start" type="button" onClick={() => navigate(exercise.route)}>
                  <i className="fa-solid fa-play" aria-hidden="true" />
                  Start Exercise
                </button>
              </div>
            </article>
          ))}
        </section>

        {visibleExercises.length === 0 && <p className="exercise-page__empty">No exercises match your search.</p>}

        <section className="exercise-guidance" aria-label="How PoseFit works">
          <div className="exercise-steps">
            {steps.map((step) => (
              <div className="exercise-step" key={step.title}>
                <span className="exercise-step__icon" aria-hidden="true"><i className={`fa-solid ${step.icon}`} /></span>
                <span className="exercise-step__copy"><strong>{step.title}</strong><small>{step.text}</small></span>
              </div>
            ))}
          </div>
          <blockquote className="exercise-guidance__quote">“Small Steps<br />Lead to Big Results.”<span /></blockquote>
        </section>
      </main>
    </div>
  );
}
