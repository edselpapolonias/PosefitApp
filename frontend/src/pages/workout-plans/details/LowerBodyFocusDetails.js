import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import lungePhoto from '../../../images/exercise-card-lunge.png';
import {
  lowerBodyExercises,
  lowerBodyFocusPlan,
  lowerBodyProgression,
  lowerBodyScheduleByWeek,
} from './lowerBodyFocusData';
import { PlanFact, WorkoutDayCard } from '../../../components/workout-plans/PlanDetailsShared';
import './BeginnerFullBodyDetails.css';
import './LowerBodyFocusDetails.css';

const planFacts = [
  { icon: 'fa-calendar-days', value: '3 Days/Week', label: 'Schedule' },
  { icon: 'fa-clock', value: '30\u201340 min', label: 'Per Workout' },
  { icon: 'fa-arrows-rotate', value: '4 Weeks', label: 'Duration' },
  { icon: 'fa-chart-simple', value: 'Intermediate', label: 'Fitness Level' },
];

const expectations = [
  { icon: 'fa-dumbbell', text: 'Build stronger legs and glutes' },
  { icon: 'fa-scale-balanced', text: 'Improve lower-body balance and stability' },
  { icon: 'fa-clock', text: 'Develop muscular endurance' },
  { icon: 'fa-person-running', text: 'Improve confidence in lower-body movements' },
];

export default function LowerBodyFocusDetails() {
  const navigate = useNavigate();
  const scheduleRef = useRef(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [saved, setSaved] = useState(() => localStorage.getItem('posefitSavedLowerBodyPlan') === 'true');
  const activeSchedule = lowerBodyScheduleByWeek[activeWeek];
  const activeProgression = lowerBodyProgression[activeWeek - 1];

  const selectWeek = (week) => {
    if (lowerBodyScheduleByWeek[week]) setActiveWeek(week);
  };

  const toggleSaved = () => {
    setSaved((current) => {
      const next = !current;
      localStorage.setItem('posefitSavedLowerBodyPlan', String(next));
      return next;
    });
  };

  const preparePlan = () => {
    sessionStorage.setItem('posefitActiveWorkoutPlan', JSON.stringify({
      ...lowerBodyFocusPlan,
      activeWeek,
      activeDay: activeSchedule[0].day,
      activeWorkout: activeSchedule[0],
    }));
    scheduleRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="beginner-detail-page beginner-full-body-detail-page lower-body-detail-page">
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
                <span className="beginner-plan-overview__badge"><i className="fa-solid fa-star" aria-hidden="true" />FOCUS PLAN</span>
                <h1 id="lower-body-plan-title">Lower Body Focus</h1>
                <p>Focus on building strong legs and glutes with squats and lunges, supported by core work.</p>
                <div className="beginner-plan-overview__facts">
                  {planFacts.map((fact) => <PlanFact fact={fact} key={fact.label} />)}
                </div>
                <div className="beginner-plan-overview__quote">
                  <i className="fa-solid fa-quote-left" aria-hidden="true" />
                  <span>Strong legs build a strong foundation.</span>
                  <strong>Balance. Power. Progress.</strong>
                </div>
              </div>
              <div className="beginner-plan-overview__image">
                <img src={lungePhoto} alt="Athlete demonstrating a forward lunge" />
                <p>Build<br />Strength<br />From the Ground Up</p>
              </div>
            </section>

            <section className="beginner-exercises-panel" aria-labelledby="lower-body-exercises-title">
              <header className="beginner-section-heading">
                <div><h2 id="lower-body-exercises-title">Exercises in This Plan</h2><p>Four focused exercises for lower-body strength, balance, and core stability.</p></div>
                <button type="button" onClick={() => navigate('/exercises')}>View Exercise Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              </header>
              <div className="beginner-exercises-panel__list lower-body-exercises-list">
                {lowerBodyExercises.map((exercise) => (
                  <div className="beginner-exercise-summary" key={exercise.id}>
                    <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
                    <strong>{exercise.name}</strong>
                    <small>{exercise.focus}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="beginner-schedule" ref={scheduleRef} aria-labelledby="lower-body-schedule-title">
              <header className="beginner-schedule__header">
                <div>
                  <h2 id="lower-body-schedule-title">Weekly Schedule (4 Weeks)</h2>
                  <p><strong>Week {activeWeek}: {activeProgression.title}.</strong> {activeProgression.text}</p>
                </div>
                <div className="beginner-week-tabs" role="tablist" aria-label="Choose workout week">
                  {[1, 2, 3, 4].map((week) => (
                    <button
                      className={activeWeek === week ? 'is-active' : ''}
                      id={`lower-body-week-${week}-tab`}
                      type="button"
                      role="tab"
                      aria-selected={activeWeek === week}
                      aria-controls="lower-body-week-panel"
                      onClick={() => selectWeek(week)}
                      key={week}
                    >Week {week}</button>
                  ))}
                </div>
              </header>
              <div
                className="beginner-schedule__grid"
                id="lower-body-week-panel"
                key={`lower-body-week-${activeWeek}-panel`}
                role="tabpanel"
                aria-labelledby={`lower-body-week-${activeWeek}-tab`}
                aria-live="polite"
                data-week={activeWeek}
              >
                {activeSchedule.map((workout) => <WorkoutDayCard workout={workout} key={workout.id} />)}
              </div>
            </section>
          </div>

          <aside className="beginner-detail-sidebar">
            <section className="beginner-sidebar-card beginner-about-card">
              <h2><i className="fa-solid fa-circle-info" aria-hidden="true" /> About This Plan</h2>
              <p>This 4-week plan focuses on developing lower-body strength, balance, and stability through progressive Squat and Lunge training, supported by core exercises.</p>
              <div className="beginner-about-card__need">
                <h3>You Will Need</h3>
                <div><i className="fa-solid fa-circle-check" aria-hidden="true" /><span><strong>Your Body</strong><small>No equipment needed</small></span></div>
              </div>
              <button className="beginner-start-button" type="button" onClick={preparePlan}><i className="fa-solid fa-play" aria-hidden="true" />Start This Plan</button>
              <button className={`beginner-save-button${saved ? ' beginner-save-button--saved' : ''}`} type="button" aria-pressed={saved} onClick={toggleSaved}>
                <i className={`${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark`} aria-hidden="true" />
                {saved ? 'Plan Saved' : 'Save Plan'}
              </button>
            </section>

            <section className="beginner-sidebar-card beginner-expect-card">
              <h2>What to Expect</h2>
              <div className="beginner-expect-card__list">
                {expectations.map((item) => <div key={item.text}><span><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span><p>{item.text}</p></div>)}
              </div>
            </section>

            <section className="beginner-motivation-card" aria-label="Motivation">
              <p>Strong legs<br />build a strong<br />foundation.</p>
              <span className="beginner-motivation-card__mountain" aria-hidden="true" />
              <i className="fa-solid fa-flag" aria-hidden="true" />
            </section>

            <section className="beginner-help-card">
              <i className="fa-solid fa-headphones" aria-hidden="true" />
              <div><h2>Need Help?</h2><p>Check out our guide for tips on form, nutrition, and more.</p><button type="button" onClick={() => navigate('/exercises')}>View Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></div>
            </section>
          </aside>
        </div>

        <section className="beginner-progression" aria-labelledby="lower-body-progression-title">
          <div className="beginner-progression__main">
            <h2 id="lower-body-progression-title">Plan Progression</h2>
            <p>Follow the 4-week journey and build a stronger lower-body foundation.</p>
            <div className="beginner-progression__track">
              {lowerBodyProgression.map((item, index) => (
                <React.Fragment key={item.week}>
                  <div className="beginner-progression__step">
                    <span className="beginner-progression__icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                    <span className="beginner-progression__copy"><strong>{item.week}</strong><b>{item.title}</b><small>{item.text}</small></span>
                  </div>
                  {index < lowerBodyProgression.length - 1 && <i className="fa-solid fa-arrow-right beginner-progression__arrow" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <aside className="beginner-progression__quote"><i className="fa-solid fa-quote-left" aria-hidden="true" /><p>Every strong step<br />starts with a solid<br />foundation.</p></aside>
        </section>
      </main>
    </div>
  );
}
