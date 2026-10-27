import React, { useEffect, useState } from 'react';
import { getFitnessProfile } from '../../services/fitnessProfileService';
import { getExerciseConsiderations } from './exerciseConsiderations';
import './ExerciseConsideration.css';

export default function ExerciseConsideration({ exerciseId }) {
  const [consideration, setConsideration] = useState(null);

  useEffect(() => {
    let active = true;
    if (!localStorage.getItem('user')) return () => { active = false; };

    getFitnessProfile()
      .then((data) => {
        if (!active) return;
        const profile = data.profile || {};
        if (!profile.onboardingCompleted || profile.physicalLimitations !== 'yes') {
          setConsideration(null);
          return;
        }
        setConsideration(getExerciseConsiderations(exerciseId, profile.affectedAreas));
      })
      .catch(() => {
        if (active) setConsideration(null);
      });
    return () => { active = false; };
  }, [exerciseId]);

  if (!consideration) return null;

  return (
    <aside className="exercise-consideration" aria-labelledby={`${exerciseId}-consideration-title`}>
      <header>
        <span aria-hidden="true"><i className="fa-solid fa-circle-info" /></span>
        <h2 id={`${exerciseId}-consideration-title`}>Exercise Consideration</h2>
      </header>
      <div className="exercise-consideration__items">
        {consideration.items.map((item) => (
          <div className="exercise-consideration__item" key={item.area}>
            <strong>{item.label}</strong>
            <p>
              {item.area === 'other'
                ? 'You indicated another physical limitation without identifying a body area.'
                : `You indicated a physical limitation involving your ${item.area}.`}
            </p>
            <p>{item.message}</p>
          </div>
        ))}
      </div>
      <p className="exercise-consideration__footer"><strong>Important:</strong> {consideration.footer}</p>
    </aside>
  );
}
