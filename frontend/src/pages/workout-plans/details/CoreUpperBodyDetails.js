import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import pushUpPhoto from '../../../images/exercise-card-push-up.png';
import {
  coreUpperBodyPlan,
  coreUpperExercises,
  coreUpperProgression,
  coreUpperScheduleByWeek,
  coreUpperWorkoutDays,
} from './coreUpperBodyData';
import { PlanFact, WorkoutDayCard } from '../../../components/workout-plans/PlanDetailsShared';
import StartPlanDialog from '../../../components/workout-plans/StartPlanDialog';
import { ActiveWorkoutPlan } from './BeginnerFullBodyActive';
import { endWorkoutPlan, fetchActiveWorkoutPlan, startCoreUpperPlan } from '../../../services/workoutPlanService';
import './BeginnerFullBodyDetails.css';
import './CoreUpperBodyDetails.css';

const planFacts = [
  { icon: 'fa-calendar-days', value: '3 Days/Week', label: 'Schedule' },
  { icon: 'fa-clock', value: '25\u201340 min', label: 'Per Workout' },
  { icon: 'fa-arrows-rotate', value: '4 Weeks', label: 'Duration' },
  { icon: 'fa-chart-simple', value: 'Intermediate', label: 'Fitness Level' },
];

const expectations = [
  { icon: 'fa-dumbbell', text: 'Build upper-body strength' },
  { icon: 'fa-shield-halved', text: 'Improve core stability' },
  { icon: 'fa-clock', text: 'Increase muscular endurance' },
  { icon: 'fa-bullseye', text: 'Improve control and consistency' },
];

export default function CoreUpperBodyDetails() {
  const navigate = useNavigate();
  const [activePlan, setActivePlan] = useState(null);
  const scheduleRef = useRef(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const activeSchedule = coreUpperScheduleByWeek[activeWeek];
  const activeProgression = coreUpperProgression[activeWeek - 1];
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ending, setEnding] = useState(false);
  const submittingRef = useRef(false);
  const loadVersionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const version = loadVersionRef.current;
    fetchActiveWorkoutPlan(controller.signal, coreUpperBodyPlan.id).then((plan) => {
      if (active && version === loadVersionRef.current && plan?.id === coreUpperBodyPlan.id) setActivePlan(plan);
    }).catch(() => { /* Activation reports API failures in its dialog. */ });
    return () => { active = false; controller.abort(); };
  }, []);

  const selectWeek = (week) => {
    if (coreUpperScheduleByWeek[week]) setActiveWeek(week);
  };

  const preparePlan = () => {
    loadVersionRef.current += 1;
    setError('');
    setConfirming(true);
  };

  const confirmPlan = async (startDate) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const plan = await startCoreUpperPlan(startDate);
      if (!plan?.instanceId || plan.id !== coreUpperBodyPlan.id) throw new Error('Unable to start the plan. Please try again.');
      setActivePlan(plan);
      setConfirming(false);
    } catch (failure) {
      setError(failure.response?.data?.error || (failure.message?.startsWith('You already') ? failure.message : 'Unable to start the plan. Please try again.'));
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  };

  const endPlan = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setEnding(true);
    setError('');
    try {
      await endWorkoutPlan(activePlan);
      setActivePlan(null);
      setActiveWeek(1);
    } catch {
      setError('Unable to end the plan. Please try again.');
    } finally {
      submittingRef.current = false;
      setEnding(false);
    }
  };

  if (activePlan) return <ActiveWorkoutPlan
    plan={activePlan}
    onEndPlan={endPlan}
    ending={ending}
    error={error}
    scheduleByWeek={coreUpperScheduleByWeek}
    title="Core & Upper Body"
    heroPhoto={pushUpPhoto}
    heroAlt="Athlete demonstrating a push-up"
    slogan={<>Build Strength<br />With Every Rep</>}
    quote={<>&ldquo;A stronger core<br />supports every movement.&rdquo;</>}
    description="Build upper-body strength, core strength, and stability through controlled Push-up, Plank, and Leg Raise training."
    facts={['3 Days/Week', '25–40 min', '4 Weeks', coreUpperBodyPlan.level]}
    motivation={<>&ldquo;Control every rep,<br />build lasting strength,<br />and keep progressing.&rdquo;</>}
  />;

  return (
    <div className="beginner-detail-page beginner-full-body-detail-page core-upper-detail-page">
      <Navbar activeItem="Workout Plans" />
      {confirming && <StartPlanDialog
        busy={busy}
        error={error}
        onCancel={() => setConfirming(false)}
        onConfirm={confirmPlan}
        planName="Core & Upper Body"
        workoutDays={coreUpperWorkoutDays}
      />}

      <main className="beginner-detail-page__main">
        <button className="beginner-detail-page__back" type="button" onClick={() => navigate('/workout-plans')}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" />
          Back to Workout Plans
        </button>

        <div className="beginner-detail-layout">
          <div className="beginner-detail-layout__primary">
            <section className="beginner-plan-overview" aria-labelledby="core-upper-plan-title">
              <div className="beginner-plan-overview__content">
                <span className="beginner-plan-overview__badge"><i className="fa-solid fa-star" aria-hidden="true" />FOCUS PLAN</span>
                <h1 id="core-upper-plan-title">Core &amp; Upper Body</h1>
                <p>Strengthen your core and upper body with effective bodyweight exercises.</p>
                <div className="beginner-plan-overview__facts">
                  {planFacts.map((fact) => <PlanFact fact={fact} key={fact.label} />)}
                </div>
                <div className="beginner-plan-overview__quote">
                  <i className="fa-solid fa-quote-left" aria-hidden="true" />
                  <span>A stronger core supports every movement.</span>
                  <strong>Control. Strength. Confidence.</strong>
                </div>
              </div>
              <div className="beginner-plan-overview__image">
                <img src={pushUpPhoto} alt="Athlete demonstrating a push-up" />
                <p>Build<br />Strength<br />With Every Rep</p>
              </div>
            </section>

            <section className="beginner-exercises-panel" aria-labelledby="core-upper-exercises-title">
              <header className="beginner-section-heading">
                <div><h2 id="core-upper-exercises-title">Exercises in This Plan</h2><p>Three focused exercises for upper-body strength and core control.</p></div>
                <button type="button" onClick={() => navigate('/exercises')}>View Exercise Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              </header>
              <div className="beginner-exercises-panel__list core-upper-exercises-list">
                {coreUpperExercises.map((exercise) => (
                  <div className="beginner-exercise-summary" key={exercise.id}>
                    <img className={exercise.id === 'leg-raise' ? 'leg-raise-icon' : ''} src={exercise.icon} alt="" aria-hidden="true" />
                    <strong>{exercise.name}</strong>
                    <small>{exercise.focus}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="beginner-schedule" ref={scheduleRef} aria-labelledby="core-upper-schedule-title">
              <header className="beginner-schedule__header">
                <div>
                  <h2 id="core-upper-schedule-title">Weekly Schedule (4 Weeks)</h2>
                  <p><strong>Week {activeWeek}: {activeProgression.title}.</strong> {activeProgression.text}</p>
                </div>
                <div className="beginner-week-tabs" role="tablist" aria-label="Choose workout week">
                  {[1, 2, 3, 4].map((week) => (
                    <button
                      className={activeWeek === week ? 'is-active' : ''}
                      id={`core-upper-week-${week}-tab`}
                      type="button"
                      role="tab"
                      aria-selected={activeWeek === week}
                      aria-controls="core-upper-week-panel"
                      onClick={() => selectWeek(week)}
                      key={week}
                    >Week {week}</button>
                  ))}
                </div>
              </header>
              <div
                className="beginner-schedule__grid"
                id="core-upper-week-panel"
                key={`core-upper-week-${activeWeek}-panel`}
                role="tabpanel"
                aria-labelledby={`core-upper-week-${activeWeek}-tab`}
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
              <p>This 4-week plan focuses on strengthening your upper body and core through progressive Push-up, Plank, and Leg Raise exercises. Follow the schedule consistently and gradually increase your workout volume and endurance.</p>
              <div className="beginner-about-card__need">
                <h3>You Will Need</h3>
                <div><i className="fa-solid fa-circle-check" aria-hidden="true" /><span><strong>Your Body</strong><small>No equipment needed</small></span></div>
              </div>
              <button className="beginner-start-button" type="button" onClick={preparePlan}><i className="fa-solid fa-play" aria-hidden="true" />Start This Plan</button>
            </section>

            <section className="beginner-sidebar-card beginner-expect-card">
              <h2>What to Expect</h2>
              <div className="beginner-expect-card__list">
                {expectations.map((item) => <div key={item.text}><span><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span><p>{item.text}</p></div>)}
              </div>
            </section>

            <section className="beginner-motivation-card" aria-label="Motivation">
              <p>A stronger core<br />supports a<br />stronger you.</p>
              <span className="beginner-motivation-card__mountain" aria-hidden="true" />
              <i className="fa-solid fa-flag" aria-hidden="true" />
            </section>

            <section className="beginner-help-card">
              <i className="fa-solid fa-headphones" aria-hidden="true" />
              <div><h2>Need Help?</h2><p>Check out our guide for tips on form, nutrition, and more.</p><button type="button" onClick={() => navigate('/exercises')}>View Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button></div>
            </section>
          </aside>
        </div>

        <section className="beginner-progression" aria-labelledby="core-upper-progression-title">
          <div className="beginner-progression__main">
            <h2 id="core-upper-progression-title">Plan Progression</h2>
            <p>Follow the 4-week journey and strengthen your upper body and core.</p>
            <div className="beginner-progression__track">
              {coreUpperProgression.map((item, index) => (
                <React.Fragment key={item.week}>
                  <div className="beginner-progression__step">
                    <span className="beginner-progression__icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                    <span className="beginner-progression__copy"><strong>{item.week}</strong><b>{item.title}</b><small>{item.text}</small></span>
                  </div>
                  {index < coreUpperProgression.length - 1 && <i className="fa-solid fa-arrow-right beginner-progression__arrow" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <aside className="beginner-progression__quote"><i className="fa-solid fa-quote-left" aria-hidden="true" /><p>Strength grows<br />one controlled rep<br />at a time.</p></aside>
        </section>
      </main>
    </div>
  );
}
