import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import lungePhoto from '../../../images/exercise-lunge.png';
import { lowerBodyExercises, lowerBodyProgression, lowerBodySchedule } from './lowerBodyFocusData';
import { PlanFact, WorkoutDayCard } from '../../../components/workout-plans/PlanDetailsShared';
import './BeginnerFullBodyDetails.css';
import './LowerBodyFocusDetails.css';

const planFacts = [
  { icon: 'fa-calendar-days', value: '3 Days/Week', label: 'Schedule' },
  { icon: 'fa-clock', value: '30–40 min', label: 'Per Workout' },
  { icon: 'fa-arrows-rotate', value: '4 Weeks', label: 'Duration' },
  { icon: 'fa-chart-simple', value: 'Beginner', label: 'Level' },
];

const expectations = [
  { icon: 'fa-dumbbell', text: 'Stronger legs and glutes for daily activities' },
  { icon: 'fa-medal', text: 'Better balance and core stability' },
  { icon: 'fa-clock', text: 'Improved lower body endurance' },
  { icon: 'fa-chart-line', text: 'Visible progress in just 4 weeks!' },
];

export default function LowerBodyFocusDetails() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => localStorage.getItem('posefitSavedLowerBodyPlan') === 'true');

  const toggleSaved = () => {
    setSaved((current) => {
      const next = !current;
      localStorage.setItem('posefitSavedLowerBodyPlan', String(next));
      return next;
    });
  };

  return (
    <div className="beginner-detail-page lower-body-detail-page">
      <Navbar activeItem="Workout Plans" />

      <main className="beginner-detail-page__main">
        <button className="beginner-detail-page__back" type="button" onClick={() => navigate('/workout-plans')}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Workout Plans
        </button>

        <div className="beginner-detail-layout">
          <div className="beginner-detail-layout__primary">
            <section className="beginner-plan-overview" aria-labelledby="lower-body-plan-title">
              <div className="beginner-plan-overview__content">
                <span className="beginner-plan-overview__badge">
                  <i className="fa-solid fa-star" aria-hidden="true" />
                  FOCUS PLAN
                </span>
                <h1 id="lower-body-plan-title">Lower Body Focus</h1>
                <p>Focus on building strong legs and glutes with squats and lunges, supported by core work.</p>
                <div className="beginner-plan-overview__facts">
                  {planFacts.map((fact) => <PlanFact fact={fact} key={fact.label} />)}
                </div>
              </div>
              <div className="beginner-plan-overview__image">
                <img src={lungePhoto} alt="Athlete performing a forward lunge" />
              </div>
            </section>

            <section className="beginner-exercises-panel" aria-labelledby="lower-body-exercises-title">
              <h2 id="lower-body-exercises-title">Exercises in This Plan</h2>
              <div className="beginner-exercises-panel__list lower-body-exercises-list">
                {lowerBodyExercises.map((exercise) => (
                  <div className="beginner-exercise-summary" key={exercise.id}>
                    <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
                    <strong>{exercise.name}</strong>
                    <small>{exercise.focus}</small>
                  </div>
                ))}
              </div>
              <div className="beginner-exercises-panel__tip">
                <i className="fa-regular fa-lightbulb" aria-hidden="true" />
                <span><strong>Tip:</strong> Focus on depth, control, and stability. Quality over speed!</span>
              </div>
            </section>

            <section className="beginner-schedule" aria-labelledby="lower-body-schedule-title">
              <h2 id="lower-body-schedule-title">Weekly Schedule (4 Weeks)</h2>
              <p>Workouts repeat every week. Each day targets different muscle groups for balanced progress.</p>
              <div className="beginner-schedule__grid">
                {lowerBodySchedule.map((workout) => <WorkoutDayCard workout={workout} key={workout.day} />)}
              </div>
            </section>

            <section className="beginner-progression" aria-labelledby="lower-body-progression-title">
              <h2 id="lower-body-progression-title">Plan Progression</h2>
              <p>Gradually challenge yourself as you move through the weeks.</p>
              <div className="beginner-progression__track">
                {lowerBodyProgression.map((item, index) => (
                  <React.Fragment key={item.week}>
                    <div className="beginner-progression__step">
                      <span className="beginner-progression__icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                      <span className="beginner-progression__copy"><strong>{item.week}</strong><small>{item.text}</small></span>
                    </div>
                    {index < lowerBodyProgression.length - 1 && <i className="fa-solid fa-arrow-right beginner-progression__arrow" aria-hidden="true" />}
                  </React.Fragment>
                ))}
              </div>
            </section>
          </div>

          <aside className="beginner-detail-sidebar">
            <section className="beginner-sidebar-card beginner-about-card">
              <h2><i className="fa-solid fa-circle-info" aria-hidden="true" /> About This Plan</h2>
              <p>This plan focuses on strengthening your lower body—quads, hamstrings, glutes, and calves—while improving balance and core stability.<br /><br />Perfect for beginners who want stronger, more defined legs.</p>
              <div className="beginner-about-card__need">
                <h3>You Will Need</h3>
                <div>
                  <i className="fa-regular fa-circle-check" aria-hidden="true" />
                  <span><strong>Your Body</strong><small>No equipment needed!</small></span>
                </div>
              </div>
              <button className="beginner-start-button" type="button" onClick={() => navigate('/exercises/squat')}>
                <i className="fa-solid fa-play" aria-hidden="true" />
                Start This Plan
              </button>
              <button className={`beginner-save-button${saved ? ' beginner-save-button--saved' : ''}`} type="button" aria-pressed={saved} onClick={toggleSaved}>
                <i className={`${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} aria-hidden="true" />
                {saved ? 'Plan Saved' : 'Save Plan'}
              </button>
            </section>

            <section className="beginner-sidebar-card beginner-expect-card">
              <h2>What to Expect</h2>
              <div className="beginner-expect-card__list">
                {expectations.map((item) => (
                  <div key={item.text}>
                    <span><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="beginner-reminder-card">
              <i className="fa-regular fa-heart" aria-hidden="true" />
              <div><h2>Remember</h2><p>Consistency and proper form are the keys to building strong, powerful legs. Take it one step at a time!</p></div>
            </section>

            <section className="beginner-help-card">
              <i className="fa-solid fa-headphones" aria-hidden="true" />
              <div>
                <h2>Need Help?</h2>
                <p>Check out our guide for tips on form, nutrition, and more.</p>
                <button type="button" onClick={() => navigate('/exercises')}>View Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              </div>
            </section>
          </aside>
        </div>

        <aside className="beginner-detail-footer-note">
          <i className="fa-solid fa-bolt" aria-hidden="true" />
          <p>All plans are beginner friendly and designed for home workouts. No equipment needed!</p>
        </aside>
      </main>
    </div>
  );
}
