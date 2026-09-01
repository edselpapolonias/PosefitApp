import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import squatPhoto from '../images/exercise-squat.png';
import pushUpPhoto from '../images/exercise-push-up.png';
import plankPhoto from '../images/exercise-plank.png';
import lungePhoto from '../images/exercise-lunge.png';
import sitUpPhoto from '../images/exercise-sit-up.png';
import './ExerciseSelectionPage.css';

const exercises = [
  {
    id: 'squat',
    name: 'Squat',
    category: 'Lower Body',
    tone: 'orange',
    description: 'Build lower body strength and improve balance and mobility.',
    muscles: 'Quadriceps, Hamstrings, Glutes',
    image: squatPhoto,
    route: '/exercises/squat',
  },
  {
    id: 'push-up',
    name: 'Push Up',
    category: 'Upper Body',
    tone: 'blue',
    description: 'Strengthen your chest, shoulders, arms, and core.',
    muscles: 'Chest, Shoulders, Triceps, Core',
    image: pushUpPhoto,
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'Core',
    tone: 'purple',
    description: 'Improve core stability and overall body control.',
    muscles: 'Core, Shoulders, Lower Back',
    image: plankPhoto,
  },
  {
    id: 'lunge',
    name: 'Lunge',
    category: 'Lower Body',
    tone: 'orange',
    description: 'Improve leg strength, balance, and coordination.',
    muscles: 'Quadriceps, Hamstrings, Glutes',
    image: lungePhoto,
  },
  {
    id: 'sit-up',
    name: 'Sit Up',
    category: 'Core',
    tone: 'purple',
    description: 'Strengthen your core and improve posture.',
    muscles: 'Abs, Hip Flexors',
    image: sitUpPhoto,
  },
];

const filters = ['All Exercises (5)', 'Lower Body', 'Upper Body', 'Core', 'Full Body'];

const steps = [
  { icon: 'fa-clipboard-list', title: '1. Choose Exercise', text: 'Select an exercise from the list above.' },
  { icon: 'fa-sliders', title: '2. Set Your Goals', text: 'Set your reps, sets, and rest time.' },
  { icon: 'fa-circle-play', title: '3. Start Workout', text: 'Follow the real-time feedback and do your best.' },
  { icon: 'fa-chart-simple', title: '4. See Results', text: 'Review your performance and track your progress.' },
];

const tips = [
  'Ensure good lighting and a clear view of your body.',
  'Keep your device steady during exercises.',
  'Focus on form, not just speed.',
  'Take rest when needed and stay hydrated.',
];

export default function ExerciseSelectionPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('prototype');
  const [selectedExercise, setSelectedExercise] = useState(null);

  const visibleExercises = useMemo(() => {
    const category = activeFilter.replace(' (5)', '');
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return exercises
      .filter((exercise) => category === 'All Exercises' || exercise.category === category)
      .filter((exercise) => !normalizedSearch || exercise.name.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        if (sortOrder === 'az') return a.name.localeCompare(b.name);
        if (sortOrder === 'za') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [activeFilter, searchTerm, sortOrder]);

  const selectExercise = (exercise) => {
    setSelectedExercise(exercise.id);

    if (exercise.route) {
      navigate(exercise.route);
    }
  };

  return (
    <div className="exercise-page">
      <Navbar />

      <main className="exercise-page__main">
        <section className="exercise-toolbar" aria-label="Exercise filters">
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

          <div className="exercise-toolbar__tools">
            <label className="exercise-search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <span className="sr-only">Search exercises</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search exercises..."
              />
            </label>

            <label className="exercise-sort">
              <span className="sr-only">Sort exercises</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
                <option value="prototype">Sort: A - Z</option>
                <option value="za">Sort: Z - A</option>
              </select>
            </label>
          </div>
        </section>

        <section className="exercise-grid" aria-label="Available exercises">
          {visibleExercises.map((exercise) => (
            <article
              key={exercise.id}
              className={`exercise-card exercise-card--${exercise.tone}${selectedExercise === exercise.id ? ' exercise-card--selected' : ''}`}
              onClick={() => selectExercise(exercise)}
            >
              <div className="exercise-card__photo">
                <img
                  className="exercise-card__photo-image"
                  src={exercise.image}
                  alt={`${exercise.name} exercise demonstration`}
                />
                <span className="exercise-card__mini-photo" aria-hidden="true">
                  <img src={exercise.image} alt="" />
                </span>
              </div>

              <div className="exercise-card__content">
                <h2>{exercise.name}</h2>
                <span className="exercise-card__category">{exercise.category}</span>
                <p>{exercise.description}</p>

                <div className="exercise-card__muscles">
                  <strong>Primary Muscles</strong>
                  <span>{exercise.muscles}</span>
                </div>

                <button
                  className="exercise-card__start"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    selectExercise(exercise);
                  }}
                >
                  <i className="fa-solid fa-play" aria-hidden="true" />
                  Start Exercise
                </button>
              </div>
            </article>
          ))}
        </section>

        {visibleExercises.length === 0 && (
          <p className="exercise-page__empty">No exercises match your search.</p>
        )}

        <section className="exercise-guidance">
          <div className="exercise-guidance__steps">
            <h2>How It Works</h2>
            <div className="exercise-steps">
              {steps.map((step, index) => (
                <React.Fragment key={step.title}>
                  <div className="exercise-step">
                    <span className="exercise-step__icon" aria-hidden="true">
                      <i className={`fa-solid ${step.icon}`} />
                    </span>
                    <span>
                      <strong>{step.title}</strong>
                      <small>{step.text}</small>
                    </span>
                  </div>
                  {index < steps.length - 1 && <i className="fa-solid fa-arrow-right exercise-step__arrow" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <aside className="exercise-guidance__tips">
            <h2>Tips for Best Results</h2>
            <ul>
              {tips.map((tip) => (
                <li key={tip}>
                  <i className="fa-solid fa-check" aria-hidden="true" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </main>
    </div>
  );
}
