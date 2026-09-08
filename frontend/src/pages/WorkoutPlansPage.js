import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { workoutPlans } from './workoutPlansData';
import './WorkoutPlansPage.css';

const featureItems = [
  {
    icon: 'fa-bolt',
    title: 'Beginner Friendly',
    text: 'Designed for all fitness levels and beginners.',
  },
  {
    icon: 'fa-shield-halved',
    title: 'Safe & Effective',
    text: 'Exercises selected for safety and results.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Progressive',
    text: 'Gradually build strength over 4 weeks.',
  },
  {
    icon: 'fa-house',
    title: 'Home Based',
    text: 'No equipment needed. Train anytime, anywhere.',
  },
];

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
          <span>
            <strong>{fact.value}</strong>
            <small>{fact.label}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function ExerciseList({ exercises }) {
  return (
    <div className="plan-exercises">
      {exercises.map((exercise) => (
        <div className="plan-exercise" key={exercise.name}>
          <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
          <span>{exercise.name}</span>
        </div>
      ))}
    </div>
  );
}

function PlanButton({ plan, featured = false }) {
  const navigate = useNavigate();
  const hasDetailsPage = Boolean(plan.detailsRoute);

  return (
    <button
      className={`plan-details-button${featured ? ' plan-details-button--featured' : ''}`}
      type="button"
      disabled={!hasDetailsPage}
      onClick={() => navigate(plan.detailsRoute)}
    >
      <span>View Plan Details</span>
      <i className="fa-solid fa-arrow-right" aria-hidden="true" />
    </button>
  );
}

function FocusedPlanCard({ plan }) {
  return (
    <article className="focused-plan-card">
      <div className="focused-plan-card__image">
        <img src={plan.image} alt={plan.imageAlt} />
        <span className="focused-plan-card__badge" aria-hidden="true">
          <img src={plan.overlayIcon} alt="" />
        </span>
      </div>

      <div className="focused-plan-card__body">
        <h2>{plan.title}</h2>
        <p>{plan.description}</p>
        <PlanFacts plan={plan} />

        <div className="focused-plan-card__exercises">
          <h3>EXERCISES INCLUDED</h3>
          <ExerciseList exercises={plan.exercises} />
        </div>

        <PlanButton plan={plan} />
      </div>
    </article>
  );
}

export default function WorkoutPlansPage() {
  const [featuredPlan, ...focusedPlans] = workoutPlans;

  return (
    <div className="workout-plans-page">
      <Navbar activeItem="Workout Plans" />

      <main className="workout-plans-page__main">
        <article className="featured-plan-card">
          <div className="featured-plan-card__content">
            <div className="featured-plan-card__intro">
              <span className="featured-plan-card__recommendation">
                <i className="fa-solid fa-star" aria-hidden="true" />
                RECOMMENDED
              </span>
              <h1>{featuredPlan.title}</h1>
              <p>{featuredPlan.description}</p>
            </div>
            <PlanFacts plan={featuredPlan} />

            <div className="featured-plan-card__exercises">
              <h2>EXERCISES INCLUDED</h2>
              <ExerciseList exercises={featuredPlan.exercises} />
            </div>

            <PlanButton plan={featuredPlan} featured />
          </div>

          <div className="featured-plan-card__image">
            <img src={featuredPlan.image} alt={featuredPlan.imageAlt} />
          </div>
        </article>

        <div className="focused-plans-divider" aria-label="Or choose a focused plan">
          <span />
          <p>Or choose a focused plan</p>
          <span />
        </div>

        <section className="focused-plans-grid" aria-label="Focused workout plans">
          {focusedPlans.map((plan) => <FocusedPlanCard plan={plan} key={plan.slug} />)}
        </section>

        <section className="workout-plan-features" aria-label="Plan benefits">
          {featureItems.map((item) => (
            <div className="workout-plan-feature" key={item.title}>
              <span className="workout-plan-feature__icon" aria-hidden="true">
                <i className={`fa-solid ${item.icon}`} />
              </span>
              <span className="workout-plan-feature__copy">
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
