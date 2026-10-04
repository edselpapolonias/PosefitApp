import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { workoutPlans } from './workoutPlansData';
import './WorkoutPlansPage.css';

const bottomBenefits = [
  { icon: 'fa-bolt', title: 'Follow Proven Routines', text: 'Designed for real progress.' },
  { icon: 'fa-people-group', title: 'Fits Your Level', text: 'Plans for beginners to advanced.' },
  { icon: 'fa-chart-simple', title: 'Stay Consistent', text: 'Track your progress over time.' },
  { icon: 'fa-heart', title: 'Build a Healthier You', text: 'Stronger, fitter, and more confident.' },
];

const filters = ['All Plans', 'Beginner', 'Intermediate', 'Advanced'];

function PlanFacts({ plan }) {
  const facts = [
    { icon: 'fa-calendar-days', value: plan.schedule, label: 'Schedule' },
    { icon: 'fa-clock', value: plan.duration, label: 'Per Workout' },
    { icon: 'fa-arrows-rotate', value: plan.length, label: 'Duration' },
  ];

  return (
    <div className="plan-facts">
      {facts.map((fact) => (
        <div className="plan-fact" key={fact.label}>
          <i className={`fa-solid ${fact.icon}`} aria-hidden="true" />
          <span><strong>{fact.value}</strong><small>{fact.label}</small></span>
        </div>
      ))}
    </div>
  );
}

function ExerciseList({ exercises }) {
  return (
    <div className="plan-exercises">
      {exercises.map((exercise) => (
        <div className="plan-exercise" key={exercise.id}>
          <img decoding="async" className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
          <span>{exercise.name}</span>
        </div>
      ))}
    </div>
  );
}

function PlanCard({ plan }) {
  const navigate = useNavigate();
  return (
    <article className={`workout-plan-card workout-plan-card--${plan.slug}`}>
      <div className="workout-plan-card__image">
        <img decoding="async" loading="lazy" src={plan.image} alt={plan.imageAlt} />
        <span className={`workout-plan-card__level workout-plan-card__level--${plan.level.toLowerCase()}`}>{plan.level}</span>
        {plan.popular && <span className="workout-plan-card__popular"><i className="fa-solid fa-star" aria-hidden="true" />Recommended</span>}
      </div>

      <div className="workout-plan-card__body">
        <div className="workout-plan-card__intro">
          <h2>{plan.title}</h2>
          <p>{plan.description}</p>
        </div>
        <PlanFacts plan={plan} />
        <section className="workout-plan-card__exercises" aria-label={`Exercises included in ${plan.title}`}>
          <h3>Exercises Included</h3>
          <ExerciseList exercises={plan.exercises} />
        </section>
        <button className={plan.popular ? 'plan-details-button plan-details-button--featured' : 'plan-details-button'} type="button" onClick={() => navigate(plan.detailsRoute)}>
          <span>View Plan Details</span>
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

export default function WorkoutPlansPage() {
  const [activeFilter, setActiveFilter] = useState('All Plans');
  const [sortBy, setSortBy] = useState('recommended');

  const visiblePlans = useMemo(() => {
    const matchingPlans = activeFilter === 'All Plans'
      ? workoutPlans
      : workoutPlans.filter((plan) => plan.level === activeFilter);
    if (sortBy === 'name') return [...matchingPlans].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'duration') return [...matchingPlans].sort((a, b) => Number.parseInt(a.duration, 10) - Number.parseInt(b.duration, 10));
    return matchingPlans;
  }, [activeFilter, sortBy]);

  return (
    <div className="workout-plans-page">
      <Navbar activeItem="Workout Plans" />

      <main className="workout-plans-page__main">
        <section className="workout-plans-hero" aria-labelledby="workout-plans-title">
          <div className="workout-plans-hero__content">
            <p className="workout-plans-hero__eyebrow">WORKOUT PLANS</p>
            <h1 id="workout-plans-title">Choose Your Workout Plan</h1>
            <p className="workout-plans-hero__intro">Choose a plan, stay consistent, and reach your fitness goals<br className="workout-plans-hero__desktop-break" /> with structured routines designed for you.</p>
          </div>
        </section>

        <section className="workout-plan-controls" aria-label="Filter and sort workout plans">
          <div className="workout-plan-filters" role="group" aria-label="Filter plans by level">
            {filters.map((filter) => (
              <button className={activeFilter === filter ? 'is-active' : ''} type="button" aria-pressed={activeFilter === filter} onClick={() => setActiveFilter(filter)} key={filter}>{filter}</button>
            ))}
          </div>
          <label className="workout-plan-sort">
            <span>Sort by</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="name">Name A-Z</option>
              <option value="duration">Shortest workout</option>
            </select>
          </label>
        </section>

        {visiblePlans.length ? (
          <section className="workout-plans-grid" aria-label="Workout plans">
            {visiblePlans.map((plan) => <PlanCard plan={plan} key={plan.slug} />)}
          </section>
        ) : (
          <section className="workout-plans-empty" aria-live="polite">
            <i className="fa-regular fa-calendar-xmark" aria-hidden="true" />
            <h2>No {activeFilter.toLowerCase()} plans yet</h2>
            <p>Choose another level to view the available PoseFit plans.</p>
          </section>
        )}

        <section className="workout-plan-features" aria-label="Plan benefits">
          {bottomBenefits.map((item) => (
            <div className="workout-plan-feature" key={item.title}>
              <span className="workout-plan-feature__icon" aria-hidden="true"><i className={`fa-solid ${item.icon}`} /></span>
              <span className="workout-plan-feature__copy"><strong>{item.title}</strong><small>{item.text}</small></span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
