import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import pushUpPhoto from '../../../images/exercise-card-push-up.png';
import {
  beginnerExercises,
  beginnerFullBodyPlan,
  beginnerScheduleByWeek,
  planProgression,
} from './beginnerFullBodyData';
import { PlanFact, WorkoutDayCard } from '../../../components/workout-plans/PlanDetailsShared';
import './BeginnerFullBodyDetails.css';

const planFacts = [
  { icon: 'fa-calendar-days', value: '3 Days/Week', label: 'Schedule' },
  { icon: 'fa-clock', value: '30–45 min', label: 'Per Workout' },
  { icon: 'fa-arrows-rotate', value: '4 Weeks', label: 'Duration' },
  { icon: 'fa-chart-simple', value: 'Beginner', label: 'Fitness Level' },
];

const expectations = [
  { icon: 'fa-dumbbell', text: 'Improve overall strength and endurance' },
  { icon: 'fa-heart', text: 'Build healthy habits and consistency' },
  { icon: 'fa-chart-line', text: 'Increase confidence in your fitness journey' },
  { icon: 'fa-star', text: 'See visible progress over 4 weeks' },
];

export default function BeginnerFullBodyDetails() {
  const navigate = useNavigate();
  const scheduleRef = useRef(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [saved, setSaved] = useState(() => localStorage.getItem('posefitSavedBeginnerPlan') === 'true');
  const activeSchedule = beginnerScheduleByWeek[activeWeek];
  const activeProgression = planProgression[activeWeek - 1];

  const selectWeek = (week) => {
    if (beginnerScheduleByWeek[week]) setActiveWeek(week);
  };

  const toggleSaved = () => {
    setSaved((current) => {
      const next = !current;
      localStorage.setItem('posefitSavedBeginnerPlan', String(next));
      return next;
    });
  };

  const preparePlan = () => {
    sessionStorage.setItem('posefitActiveWorkoutPlan', JSON.stringify({
      ...beginnerFullBodyPlan,
      activeWeek,
      activeDay: activeSchedule[0].day,
      activeWorkout: activeSchedule[0],
    }));
    scheduleRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="beginner-detail-page beginner-full-body-detail-page">
      <Navbar activeItem="Workout Plans" />

      <main className="beginner-detail-page__main">
        <button className="beginner-detail-page__back" type="button" onClick={() => navigate('/workout-plans')}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Workout Plans
        </button>

        <div className="beginner-detail-layout">
          <div className="beginner-detail-layout__primary">
            <section className="beginner-plan-overview" aria-labelledby="beginner-plan-title">
              <div className="beginner-plan-overview__content">
                <span className="beginner-plan-overview__badge"><i className="fa-solid fa-star" aria-hidden="true" />RECOMMENDED PLAN</span>
                <h1 id="beginner-plan-title">Beginner Full Body</h1>
                <p>A balanced plan for beginners to build strength, improve endurance, and create a healthy routine using all five PoseFit exercises.</p>
                <div className="beginner-plan-overview__facts">
                  {planFacts.map((fact) => <PlanFact fact={fact} key={fact.label} />)}
                </div>
                <div className="beginner-plan-overview__quote">
                  <i className="fa-solid fa-quote-left" aria-hidden="true" />
                  <span>Small steps every day lead to big results.</span>
                  <strong>A healthier, stronger you!</strong>
                </div>
              </div>
              <div className="beginner-plan-overview__image">
                <img src={pushUpPhoto} alt="Athlete demonstrating a push-up" />
                <p>Start<br />Stronger<br />Today</p>
              </div>
            </section>

            <section className="beginner-exercises-panel" aria-labelledby="beginner-exercises-title">
              <header className="beginner-section-heading">
                <div><h2 id="beginner-exercises-title">Exercises in This Plan</h2><p>Five essential exercises to build a stronger, healthier you.</p></div>
                <button type="button" onClick={() => navigate('/exercises')}>View Exercise Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              </header>
              <div className="beginner-exercises-panel__list">
                {beginnerExercises.map((exercise) => (
                  <div className="beginner-exercise-summary" key={exercise.id}>
                    <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
                    <strong>{exercise.name}</strong>
                    <small>{exercise.focus}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="beginner-schedule" ref={scheduleRef} aria-labelledby="beginner-schedule-title">
              <header className="beginner-schedule__header">
                <div>
                  <h2 id="beginner-schedule-title">Weekly Schedule (4 Weeks)</h2>
                  <p><strong>Week {activeWeek}: {activeProgression.title}.</strong> {activeProgression.text}</p>
                </div>
                <div className="beginner-week-tabs" role="tablist" aria-label="Choose workout week">
                  {[1, 2, 3, 4].map((week) => (
                    <button
                      className={activeWeek === week ? 'is-active' : ''}
                      id={`beginner-week-${week}-tab`}
                      type="button"
                      role="tab"
                      aria-selected={activeWeek === week}
                      aria-controls="beginner-week-panel"
                      onClick={() => selectWeek(week)}
                      key={week}
                    >Week {week}</button>
                  ))}
                </div>
              </header>
              <div
                className="beginner-schedule__grid"
                id="beginner-week-panel"
                key={`beginner-week-${activeWeek}-panel`}
                role="tabpanel"
                aria-labelledby={`beginner-week-${activeWeek}-tab`}
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
              <p>This plan introduces all five PoseFit exercises and helps you build a solid foundation. Follow the schedule, complete each workout, and track your progress over 4 weeks.</p>
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
              <p>Consistency<br />today, a stronger<br />you tomorrow.</p>
              <span className="beginner-motivation-card__mountain" aria-hidden="true" />
              <i className="fa-solid fa-flag" aria-hidden="true" />
            </section>

            <section className="beginner-help-card">
              <i className="fa-solid fa-headphones" aria-hidden="true" />
              <div><h2>Need Help?</h2><p>Check out our guide for tips on form, nutrition, and more.</p><button type="button" onClick={() => navigate('/exercises')}>View Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></div>
            </section>
          </aside>
        </div>

        <section className="beginner-progression" aria-labelledby="beginner-progression-title">
          <div className="beginner-progression__main">
            <h2 id="beginner-progression-title">Plan Progression</h2>
            <p>Follow the 4 week journey and see your improvement.</p>
            <div className="beginner-progression__track">
              {planProgression.map((item, index) => (
                <React.Fragment key={item.week}>
                  <div className="beginner-progression__step">
                    <span className="beginner-progression__icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                    <span className="beginner-progression__copy"><strong>{item.week}</strong><b>{item.title}</b><small>{item.text}</small></span>
                  </div>
                  {index < planProgression.length - 1 && <i className="fa-solid fa-arrow-right beginner-progression__arrow" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <aside className="beginner-progression__quote"><i className="fa-solid fa-quote-left" aria-hidden="true" /><p>Discipline now<br />leads to the progress<br />you'll be proud of later.</p></aside>
        </section>
      </main>
    </div>
  );
}
