import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { fitnessProfileError, getFitnessProfile } from '../../services/fitnessProfileService';
import { workoutPlans } from './workoutPlansData';
import { getWorkoutPlanSuggestion } from './workoutPlanRecommendation';
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

function PlanCard({ plan, isRecommended }) {
  const navigate = useNavigate();
  return (
    <article className={`workout-plan-card workout-plan-card--${plan.slug}`}>
      <div className="workout-plan-card__image">
        <img decoding="async" loading="lazy" src={plan.image} alt={plan.imageAlt} />
        <span className={`workout-plan-card__level workout-plan-card__level--${plan.level.toLowerCase()}`}>{plan.level}</span>
        {isRecommended && <span className="workout-plan-card__recommended"><i className="fa-solid fa-star" aria-hidden="true" />Recommended for you</span>}
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
        <button className={isRecommended ? 'plan-details-button plan-details-button--featured' : 'plan-details-button'} type="button" onClick={() => navigate(plan.detailsRoute)}>
          <span>View Plan Details</span>
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function SuggestionPanel({ profileState, suggestion, onRetry, onViewPlan, onEditProfile }) {
  if (profileState.status === 'loading') {
    return (
      <section className="workout-suggestion workout-suggestion--status" aria-live="polite">
        <span className="workout-suggestion__status-icon is-loading" aria-hidden="true"><i className="fa-solid fa-spinner" /></span>
        <div><h2>Preparing your plan suggestion</h2><p>Checking your fitness level and preferred workout focus.</p></div>
      </section>
    );
  }

  if (profileState.status === 'error') {
    return (
      <section className="workout-suggestion workout-suggestion--status" role="alert">
        <span className="workout-suggestion__status-icon is-error" aria-hidden="true"><i className="fa-solid fa-circle-exclamation" /></span>
        <div className="workout-suggestion__status-copy"><h2>Personalized suggestion unavailable</h2><p>{profileState.message}</p></div>
        <div className="workout-suggestion__status-actions">
          <button type="button" className="is-secondary" onClick={onEditProfile}>Edit fitness profile</button>
          <button type="button" className="is-primary" onClick={onRetry}>Try again</button>
        </div>
      </section>
    );
  }

  if (suggestion?.status === 'opted_out') return null;

  if (!suggestion || suggestion.status !== 'ready') {
    return (
      <section className="workout-suggestion workout-suggestion--status">
        <span className="workout-suggestion__status-icon" aria-hidden="true"><i className="fa-solid fa-user-pen" /></span>
        <div className="workout-suggestion__status-copy">
          <h2>{suggestion?.status === 'unavailable' ? 'Matching plan unavailable' : 'Complete your fitness profile'}</h2>
          <p>{suggestion?.reason || 'Add your fitness level and workout focus to receive a personalized plan suggestion.'}</p>
        </div>
        <div className="workout-suggestion__status-actions">
          <button type="button" className="is-primary" onClick={onEditProfile}>{suggestion?.status === 'unavailable' ? 'Review profile' : 'Complete profile'}</button>
        </div>
      </section>
    );
  }

  const { plan, considerations } = suggestion;
  const hasConsiderations = considerations.items.length > 0 || Boolean(considerations.notice);
  return (
    <section className={`workout-suggestion${hasConsiderations ? ' workout-suggestion--with-considerations' : ''}`} aria-labelledby="workout-suggestion-title">
      <div className="workout-suggestion__main">
        <div className="workout-suggestion__heading">
          <span className="workout-suggestion__icon" aria-hidden="true"><i className="fa-solid fa-bullseye" /></span>
          <div>
            <span className="workout-suggestion__eyebrow">Personalized plan match</span>
            <h2 id="workout-suggestion-title">Suggested plan — {plan.title}</h2>
          </div>
          <span className={`workout-suggestion__level is-${plan.level.toLowerCase()}`}>{plan.level}</span>
        </div>
        <p className="workout-suggestion__reason">{suggestion.reason}</p>
        <div className="workout-suggestion__facts" aria-label="Suggested plan schedule and duration">
          <span><i className="fa-regular fa-calendar" aria-hidden="true" /><strong>{plan.length}</strong><small>Plan length</small></span>
          <span><i className="fa-solid fa-calendar-days" aria-hidden="true" /><strong>{plan.schedule}</strong><small>Schedule</small></span>
          <span><i className="fa-regular fa-clock" aria-hidden="true" /><strong>{plan.duration}</strong><small>Per workout</small></span>
        </div>
        <div className="workout-suggestion__actions">
          <button type="button" className="is-primary" onClick={() => onViewPlan(plan.detailsRoute)}>View plan details <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
          <button type="button" className="is-secondary" onClick={onEditProfile}><i className="fa-solid fa-pen" aria-hidden="true" />Edit fitness profile</button>
        </div>
      </div>

      {hasConsiderations && (
        <aside className="workout-suggestion__considerations" aria-label="Exercise considerations">
          <div className="workout-suggestion__considerations-title">
            <span aria-hidden="true"><i className="fa-solid fa-shield-heart" /></span>
            <div><h3>Exercise considerations</h3><p>Based on your reported affected areas</p></div>
          </div>
          {considerations.items.map((exercise) => (
            <div className="workout-suggestion__consideration" key={exercise.exerciseId}>
              <h4>{exercise.exerciseName} <span>{exercise.items.map((item) => item.label).join(', ')}</span></h4>
              {exercise.items.map((item) => <p key={item.area}>{item.message}</p>)}
            </div>
          ))}
          <p className="workout-suggestion__notice"><i className="fa-solid fa-circle-info" aria-hidden="true" />{considerations.notice}</p>
        </aside>
      )}
    </section>
  );
}

export default function WorkoutPlansPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('All Plans');
  const [sortBy, setSortBy] = useState('recommended');
  const [profileRequest, setProfileRequest] = useState(0);
  const [profileState, setProfileState] = useState({ status: 'loading', data: null, message: '' });

  useEffect(() => {
    let active = true;
    setProfileState({ status: 'loading', data: null, message: '' });
    getFitnessProfile()
      .then((data) => {
        if (active) setProfileState({ status: 'ready', data, message: '' });
      })
      .catch((error) => {
        if (!active) return;
        setProfileState({
          status: 'error',
          data: null,
          message: fitnessProfileError(error, 'PoseFit could not load your fitness profile. You can still browse every available plan below.'),
        });
      });

    const handleProfileUpdate = (event) => {
      if (!active) return;
      if (event.detail?.profile) setProfileState({ status: 'ready', data: event.detail, message: '' });
      else setProfileRequest((version) => version + 1);
    };
    window.addEventListener('posefit:fitness-profile-updated', handleProfileUpdate);
    return () => {
      active = false;
      window.removeEventListener('posefit:fitness-profile-updated', handleProfileUpdate);
    };
  }, [profileRequest]);

  const suggestion = useMemo(() => (
    profileState.status === 'ready'
      ? getWorkoutPlanSuggestion(profileState.data?.profile, workoutPlans)
      : null
  ), [profileState]);
  const suggestedPlanId = suggestion?.status === 'ready' ? suggestion.plan.slug : '';

  const visiblePlans = useMemo(() => {
    const matchingPlans = activeFilter === 'All Plans'
      ? workoutPlans
      : workoutPlans.filter((plan) => plan.level === activeFilter);
    if (sortBy === 'name') return [...matchingPlans].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === 'duration') return [...matchingPlans].sort((a, b) => Number.parseInt(a.duration, 10) - Number.parseInt(b.duration, 10));
    if (!suggestedPlanId) return matchingPlans;
    return [...matchingPlans].sort((a, b) => Number(b.slug === suggestedPlanId) - Number(a.slug === suggestedPlanId));
  }, [activeFilter, sortBy, suggestedPlanId]);

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

        <SuggestionPanel
          profileState={profileState}
          suggestion={suggestion}
          onRetry={() => setProfileRequest((version) => version + 1)}
          onViewPlan={(route) => navigate(route)}
          onEditProfile={() => navigate('/user')}
        />

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
            {visiblePlans.map((plan) => <PlanCard plan={plan} isRecommended={plan.slug === suggestedPlanId} key={plan.slug} />)}
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
