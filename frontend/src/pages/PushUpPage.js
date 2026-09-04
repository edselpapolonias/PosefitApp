import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkoutConfigRow from '../components/WorkoutConfigRow';
import pushUpPhoto from '../images/exercise-push-up.png';
import './SquatPage.css';
import './PushUpPage.css';

const formGuide = [
  { title: 'Keep Your Body Straight', description: 'Maintain a straight line from head to heels.', correct: true },
  { title: 'Lower with Control', description: 'Lower your chest until your elbows are below 90 degrees.', correct: true },
  { title: 'Hands Shoulder Width', description: 'Place your hands slightly wider than shoulder width.', correct: true },
  { title: 'Full Range of Motion', description: 'Push up until your arms are fully extended.', correct: true },
  { title: 'Avoid Sagging Hips', description: "Don't let your hips drop or your back arch.", correct: false },
];

const equipment = [
  { icon: 'fa-camera', title: 'Webcam', description: 'For real-time pose detection' },
  { icon: 'fa-person', title: 'Space', description: 'Enough room to move' },
  { icon: 'fa-bottle-water', title: 'Hydration', description: 'Stay hydrated and perform best' },
];

export default function PushUpPage() {
  const navigate = useNavigate();
  const formGuideRef = useRef(null);
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(60);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const startWorkout = () => {
    const workoutConfig = { sets, reps, rest };
    sessionStorage.setItem('posefitPushUpWorkoutConfig', JSON.stringify(workoutConfig));
    navigate(`/exercises/push-up/start?sets=${sets}&reps=${reps}&rest=${rest}`, {
      state: { workoutConfig },
    });
  };

  return (
    <div className="squat-page push-up-page">
      <Navbar />

      <main className="squat-page__main">
        <nav className="squat-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Exercises
          </button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <span>Push-up</span>
        </nav>

        <div className="squat-layout">
          <div className="squat-layout__primary">
            <section className="squat-overview" aria-labelledby="push-up-title">
              <div className="squat-overview__image-wrap">
                <img src={pushUpPhoto} alt="Athlete demonstrating a Push Up" />
              </div>

              <div className="squat-overview__details">
                <h1 id="push-up-title">Push-up</h1>
                <p>Strengthen your chest, shoulders, arms, and core.</p>

                <div className="squat-overview__facts">
                  <div>
                    <i className="fa-solid fa-bullseye" aria-hidden="true" />
                    <span><strong>Targets:</strong> Chest, Shoulders, Triceps, Core</span>
                  </div>
                  <div>
                    <i className="fa-solid fa-chart-simple" aria-hidden="true" />
                    <span><strong>Difficulty:</strong> Beginner to Advanced</span>
                  </div>
                </div>

                <button
                  className="squat-overview__guide-button"
                  type="button"
                  onClick={() => formGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <i className="fa-regular fa-circle-play" aria-hidden="true" />
                  How to Perform
                </button>
              </div>
            </section>

            <section className="squat-workout" aria-labelledby="configure-push-up-title">
              <h2 id="configure-push-up-title">Configure Your Workout</h2>
              <div className="squat-config">
                <WorkoutConfigRow
                  icon="fa-layer-group"
                  label="Sets"
                  description="Number of sets you want to perform."
                  value={sets}
                  min={1}
                  max={10}
                  step={1}
                  onChange={setSets}
                />
                <WorkoutConfigRow
                  icon="fa-rotate"
                  label="Reps"
                  description="Number of repetitions per set."
                  value={reps}
                  min={1}
                  max={50}
                  step={1}
                  onChange={setReps}
                />
                <WorkoutConfigRow
                  icon="fa-clock"
                  label="Rest Time"
                  description="Rest time between each set."
                  value={rest}
                  suffix=" sec"
                  min={10}
                  max={180}
                  step={5}
                  onChange={setRest}
                />
              </div>
            </section>

            <section className="squat-reminders">
              <i className="fa-regular fa-bell" aria-hidden="true" />
              <span>
                <strong>Workout Reminders</strong>
                <small>Get notified to stay consistent.</small>
              </span>
              <button
                className={`squat-toggle${remindersEnabled ? ' squat-toggle--enabled' : ''}`}
                type="button"
                role="switch"
                aria-checked={remindersEnabled}
                aria-label="Workout reminders"
                onClick={() => setRemindersEnabled((enabled) => !enabled)}
              >
                <span />
              </button>
            </section>

            <aside className="squat-tip">
              <i className="fa-regular fa-lightbulb" aria-hidden="true" />
              <span>
                <strong>Tip</strong>
                <small>Keep your body in a straight line and lower your chest near the ground for best results.</small>
              </span>
            </aside>
          </div>

          <aside className="squat-layout__sidebar">
            <section className="squat-guide" ref={formGuideRef} aria-labelledby="push-up-guide-title">
              <h2 id="push-up-guide-title">Push-up Form Guide</h2>
              <div className="squat-guide__list">
                {formGuide.map((guide, index) => (
                  <div className="squat-guide__item" key={guide.title}>
                    <span className={`squat-guide__status${guide.correct ? '' : ' squat-guide__status--incorrect'}`} aria-hidden="true">
                      <i className={`fa-solid ${guide.correct ? 'fa-check' : 'fa-xmark'}`} />
                    </span>
                    <span className="squat-guide__pose push-up-guide__pose" aria-hidden="true">
                      <img src={pushUpPhoto} alt="" style={{ objectPosition: `${45 + (index * 2)}% center` }} />
                    </span>
                    <span className="squat-guide__copy">
                      <strong>{guide.title}</strong>
                      <small>{guide.description}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="squat-equipment" aria-labelledby="push-up-equipment-title">
              <h2 id="push-up-equipment-title">You'll Need</h2>
              <div className="squat-equipment__grid">
                {equipment.map((item) => (
                  <div key={item.title}>
                    <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <small>{item.description}</small>
                  </div>
                ))}
              </div>
            </section>

            <button className="squat-start" type="button" onClick={startWorkout}>
              <span>Start Now</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
