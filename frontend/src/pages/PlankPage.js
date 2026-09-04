import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkoutConfigRow from '../components/WorkoutConfigRow';
import plankPhoto from '../images/exercise-plank.png';
import './SquatPage.css';
import './PlankPage.css';

const formGuide = [
  { title: 'Keep a Straight Line', description: 'Your body should form a straight line from head to heels.', correct: true },
  { title: 'Engage Your Core', description: 'Pull your belly button in and keep your core tight.', correct: true },
  { title: 'Shoulders Over Elbows', description: 'Place your elbows directly under your shoulders.', correct: true },
  { title: 'Glutes and Legs Tight', description: 'Squeeze your glutes and keep your legs engaged.', correct: true },
  { title: 'Avoid Hips Too High or Low', description: "Don't let your hips sag or lift too much.", correct: false },
];

const equipment = [
  { icon: 'fa-camera', title: 'Webcam', description: 'For real-time pose detection' },
  { icon: 'fa-person', title: 'Space', description: 'Enough room to hold position' },
  { icon: 'fa-bottle-water', title: 'Hydration', description: 'Stay hydrated and perform best' },
];

export default function PlankPage() {
  const navigate = useNavigate();
  const formGuideRef = useRef(null);
  const [sets, setSets] = useState(3);
  const [hold, setHold] = useState(30);
  const [rest, setRest] = useState(45);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const startWorkout = () => {
    const workoutConfig = { sets, hold, rest };
    sessionStorage.setItem('posefitPlankWorkoutConfig', JSON.stringify(workoutConfig));
    navigate(`/exercises/plank/start?sets=${sets}&hold=${hold}&rest=${rest}`, {
      state: { workoutConfig },
    });
  };

  return (
    <div className="squat-page plank-page">
      <Navbar />

      <main className="squat-page__main">
        <nav className="squat-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Exercises
          </button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <span>Plank</span>
        </nav>

        <div className="squat-layout">
          <div className="squat-layout__primary">
            <section className="squat-overview" aria-labelledby="plank-title">
              <div className="squat-overview__image-wrap">
                <img src={plankPhoto} alt="Athlete demonstrating a forearm plank" />
              </div>

              <div className="squat-overview__details">
                <h1 id="plank-title">Plank</h1>
                <p>Improve core stability and overall body control.</p>

                <div className="squat-overview__facts">
                  <div>
                    <i className="fa-solid fa-bullseye" aria-hidden="true" />
                    <span><strong>Targets:</strong> Core, Shoulders, Lower Back</span>
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

            <section className="squat-workout" aria-labelledby="configure-plank-title">
              <h2 id="configure-plank-title">Configure Your Workout</h2>

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
                  icon="fa-clock"
                  label="Hold Duration"
                  description="How long will you hold each plank?"
                  value={hold}
                  suffix=" sec"
                  min={10}
                  max={180}
                  step={5}
                  onChange={setHold}
                />
                <WorkoutConfigRow
                  icon="fa-hourglass-half"
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
                <small>Engage your core and breathe steadily while maintaining a straight posture.</small>
              </span>
            </aside>
          </div>

          <aside className="squat-layout__sidebar">
            <section className="squat-guide" ref={formGuideRef} aria-labelledby="plank-guide-title">
              <h2 id="plank-guide-title">Plank Form Guide</h2>
              <div className="squat-guide__list">
                {formGuide.map((guide, index) => (
                  <div className="squat-guide__item" key={guide.title}>
                    <span className={`squat-guide__status${guide.correct ? '' : ' squat-guide__status--incorrect'}`} aria-hidden="true">
                      <i className={`fa-solid ${guide.correct ? 'fa-check' : 'fa-xmark'}`} />
                    </span>
                    <span className="squat-guide__pose plank-guide__pose" aria-hidden="true">
                      <img src={plankPhoto} alt="" style={{ objectPosition: `${45 + (index * 3)}% center` }} />
                    </span>
                    <span className="squat-guide__copy">
                      <strong>{guide.title}</strong>
                      <small>{guide.description}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="squat-equipment" aria-labelledby="plank-equipment-title">
              <h2 id="plank-equipment-title">You'll Need</h2>
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

            <button className="squat-start" id="start-now-btn" type="button" onClick={startWorkout}>
              <span>Start Now</span>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}
