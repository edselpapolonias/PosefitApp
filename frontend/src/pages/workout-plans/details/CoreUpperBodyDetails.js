import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import plankPhoto from '../../../images/exercise-plank.png';
import { coreUpperExercises, coreUpperProgression, coreUpperSchedule } from './coreUpperBodyData';
import { PlanFact, WorkoutDayCard } from '../../../components/workout-plans/PlanDetailsShared';
import './BeginnerFullBodyDetails.css';
import './CoreUpperBodyDetails.css';

const planFacts = [
  { icon: 'fa-calendar-days', value: '3 Days/Week', label: 'Schedule' },
  { icon: 'fa-clock', value: '25–40 min', label: 'Per Workout' },
  { icon: 'fa-arrows-rotate', value: '4 Weeks', label: 'Duration' },
  { icon: 'fa-chart-simple', value: 'Beginner', label: 'Level' },
];

const expectations = [
  { icon: 'fa-dumbbell', text: 'Stronger upper body and core muscles' },
  { icon: 'fa-person', text: 'Better posture and stability' },
  { icon: 'fa-clock', text: 'Improved muscle endurance' },
  { icon: 'fa-chart-line', text: 'Visible progress in just 4 weeks!' },
];

export default function CoreUpperBodyDetails() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(() => localStorage.getItem('posefitSavedCoreUpperPlan') === 'true');

  const toggleSaved = () => {
    setSaved((current) => {
      const next = !current;
      localStorage.setItem('posefitSavedCoreUpperPlan', String(next));
      return next;
    });
  };

  return (
    <div className="beginner-detail-page core-upper-detail-page">
      <Navbar activeItem="Workout Plans" />

      <main className="beginner-detail-page__main">
        <button className="beginner-detail-page__back" type="button" onClick={() => navigate('/workout-plans')}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Workout Plans
        </button>

        <div className="beginner-detail-layout">
          <div className="beginner-detail-layout__primary">
            <section className="beginner-plan-overview" aria-labelledby="core-upper-plan-title">
              <div className="beginner-plan-overview__content">
                <span className="beginner-plan-overview__badge">
                  <i className="fa-solid fa-star" aria-hidden="true" />
                  FOCUS PLAN
                </span>
                <h1 id="core-upper-plan-title">Core &amp; Upper Body</h1>
                <p>Strengthen your core and upper body with effective bodyweight exercises.</p>
                <div className="beginner-plan-overview__facts">
                  {planFacts.map((fact) => <PlanFact fact={fact} key={fact.label} />)}
                </div>
              </div>
              <div className="beginner-plan-overview__image">
                <img src={plankPhoto} alt="Athlete holding a forearm plank" />
              </div>
            </section>

            <section className="beginner-exercises-panel" aria-labelledby="core-upper-exercises-title">
              <h2 id="core-upper-exercises-title">Exercises in This Plan</h2>
              <div className="beginner-exercises-panel__list core-upper-exercises-list">
                {coreUpperExercises.map((exercise) => (
                  <div className="beginner-exercise-summary" key={exercise.id}>
                    <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
                    <strong>{exercise.name}</strong>
                    <small>{exercise.focus}</small>
                  </div>
                ))}
              </div>
              <div className="beginner-exercises-panel__tip">
                <i className="fa-regular fa-lightbulb" aria-hidden="true" />
                <span><strong>Tip:</strong> Control your movements and engage your core in every rep!</span>
              </div>
            </section>

            <section className="beginner-schedule" aria-labelledby="core-upper-schedule-title">
              <h2 id="core-upper-schedule-title">Weekly Schedule (4 Weeks)</h2>
              <p>Workouts repeat every week. Each day targets different muscle groups for balanced progress.</p>
              <div className="beginner-schedule__grid">
                {coreUpperSchedule.map((workout) => <WorkoutDayCard workout={workout} key={workout.day} />)}
              </div>
            </section>

            <section className="beginner-progression" aria-labelledby="core-upper-progression-title">
              <h2 id="core-upper-progression-title">Plan Progression</h2>
              <p>Gradually challenge yourself as you move through the weeks.</p>
              <div className="beginner-progression__track">
                {coreUpperProgression.map((item, index) => (
                  <React.Fragment key={item.week}>
                    <div className="beginner-progression__step">
                      <span className="beginner-progression__icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                      <span className="beginner-progression__copy"><strong>{item.week}</strong><small>{item.text}</small></span>
                    </div>
                    {index < coreUpperProgression.length - 1 && <i className="fa-solid fa-arrow-right beginner-progression__arrow" aria-hidden="true" />}
                  </React.Fragment>
                ))}
              </div>
            </section>
          </div>

          <aside className="beginner-detail-sidebar">
            <section className="beginner-sidebar-card beginner-about-card">
              <h2><i className="fa-solid fa-circle-info" aria-hidden="true" /> About This Plan</h2>
              <p>This plan targets your upper body strength and core stability using effective bodyweight movements.<br /><br />Perfect for improving posture, building muscle endurance, and supporting daily activities.</p>
              <div className="beginner-about-card__need">
                <h3>You Will Need</h3>
                <div>
                  <i className="fa-regular fa-circle-check" aria-hidden="true" />
                  <span><strong>Your Body</strong><small>No equipment needed!</small></span>
                </div>
              </div>
              <button className="beginner-start-button" type="button" onClick={() => navigate('/exercises/push-up')}>
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
              <div><h2>Remember</h2><p>Focus on form over speed. Engage your core, breathe, and be consistent. Small steps lead to big results!</p></div>
            </section>

            <section className="beginner-help-card">
              <i className="fa-solid fa-headphones" aria-hidden="true" />
              <div>
                <h2>Need Help?</h2>
                <p>Check out our guide for form tips, nutrition advice, and more.</p>
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
