import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkoutConfigRow from '../components/WorkoutConfigRow';
import squatPhoto from '../images/exercise-squat.png';
import squatFormGuide from '../images/squat-form-guide.png';
import './SquatPage.css';

const formGuide = [
  {
    title: 'Keep Your Chest Up',
    description: 'Keep your back straight and chest lifted.',
    position: '0%',
    correct: true,
  },
  {
    title: 'Knees Behind Toes',
    description: 'Your knees should track in line with your toes.',
    position: '25%',
    correct: true,
  },
  {
    title: 'Go to Parallel',
    description: 'Lower your hips until your thighs are parallel to the floor or lower.',
    position: '50%',
    correct: true,
  },
  {
    title: 'Drive Through Heels',
    description: 'Push through your heels to stand up.',
    position: '75%',
    correct: true,
  },
  {
    title: 'Avoid Knee Cave',
    description: 'Keep your knees aligned with your toes.',
    position: '100%',
    correct: false,
  },
];

const equipment = [
  { icon: 'fa-camera', title: 'Webcam', description: 'For real-time pose detection' },
  { icon: 'fa-person', title: 'Space', description: 'Enough room to move' },
  { icon: 'fa-bottle-water', title: 'Hydration', description: 'Stay hydrated and perform best' },
];

export default function SquatPage() {
  const navigate = useNavigate();
  const formGuideRef = useRef(null);
  const [reps, setReps] = useState(12);
  const [sets, setSets] = useState(4);
  const [rest, setRest] = useState(60);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const startWorkout = () => {
    const workoutConfig = { sets, reps, rest };
    sessionStorage.setItem('posefitSquatWorkoutConfig', JSON.stringify(workoutConfig));
    navigate(`/exercises/squat/start?sets=${sets}&reps=${reps}&rest=${rest}`, {
      state: { workoutConfig },
    });
  };

  return (
    <div className="squat-page">
      <Navbar />

      <main className="squat-page__main">
        <nav className="squat-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Exercises
          </button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <span>Squat</span>
        </nav>

        <div className="squat-layout">
          <div className="squat-layout__primary">
            <section className="squat-overview" aria-labelledby="squat-title">
              <div className="squat-overview__image-wrap">
                <img src={squatPhoto} alt="Athlete demonstrating a squat" />
              </div>

              <div className="squat-overview__details">
                <h1 id="squat-title">Squat</h1>
                <p>Strengthen your legs and glutes with proper squat form.</p>

                <div className="squat-overview__facts">
                  <div>
                    <i className="fa-solid fa-bullseye" aria-hidden="true" />
                    <span><strong>Targets:</strong> Quadriceps, Glutes, Hamstrings</span>
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

            <section className="squat-workout" aria-labelledby="configure-workout-title">
              <h2 id="configure-workout-title">Configure Your Workout</h2>

              <div className="squat-config">
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
                  label="Rest Time"
                  description="Rest time after each set."
                  value={rest}
                  suffix=" sec"
                  min={15}
                  max={180}
                  step={15}
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
                <small>Ensure your full body is visible in the camera for accurate form detection.</small>
              </span>
            </aside>
          </div>

          <aside className="squat-layout__sidebar">
            <section className="squat-guide" ref={formGuideRef} aria-labelledby="squat-guide-title">
              <h2 id="squat-guide-title">Squat Form Guide</h2>
              <div className="squat-guide__list">
                {formGuide.map((guide) => (
                  <div className="squat-guide__item" key={guide.title}>
                    <span className={`squat-guide__status${guide.correct ? '' : ' squat-guide__status--incorrect'}`} aria-hidden="true">
                      <i className={`fa-solid ${guide.correct ? 'fa-check' : 'fa-xmark'}`} />
                    </span>
                    <span
                      className="squat-guide__pose"
                      style={{
                        '--guide-image': `url(${squatFormGuide})`,
                        '--guide-position': guide.position,
                      }}
                      aria-hidden="true"
                    />
                    <span className="squat-guide__copy">
                      <strong>{guide.title}</strong>
                      <small>{guide.description}</small>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="squat-equipment" aria-labelledby="equipment-title">
              <h2 id="equipment-title">You'll Need</h2>
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
