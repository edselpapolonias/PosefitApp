import React from 'react';

export function PlanFact({ fact }) {
  return (
    <div className="beginner-detail-fact">
      <i className={`fa-solid ${fact.icon}`} aria-hidden="true" />
      <span>
        <strong>{fact.value}</strong>
        <small>{fact.label}</small>
      </span>
    </div>
  );
}

export function WorkoutDayCard({ workout }) {
  return (
    <article className="beginner-day-card">
      <span className="beginner-day-card__label">{workout.label}</span>
      <h3>{workout.day}</h3>
      {workout.focus && <p className="beginner-day-card__focus">{workout.focus}</p>}
      <div className="beginner-day-card__exercises">
        {workout.exercises.map((exercise) => (
          <div className="beginner-day-exercise" key={exercise.id}>
            <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
            <span>
              <strong>{exercise.name}</strong>
              <small>{exercise.prescription}</small>
            </span>
          </div>
        ))}
      </div>
      <div className="beginner-day-card__estimate">
        <i className="fa-regular fa-clock" aria-hidden="true" />
        <span>Est. Time: {workout.estimate}</span>
      </div>
    </article>
  );
}
