import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkoutConfigRow from '../components/WorkoutConfigRow';
import legRaisePhoto from '../images/exercise-leg-raise.png';
import './SquatPage.css';
import './LegRaisePage.css';

const guides = [
  ['Start in the Lowered Position', 'Lie flat with both legs extended and close to the floor.', true],
  ['Keep Your Legs Extended', 'Keep your knees straight throughout the movement.', true],
  ['Reach the Target Range', 'Raise your legs through 30° to 60° of hip flexion.', true],
  ['Lower with Control', 'Return your legs near the floor to complete each repetition.', true],
  ['Avoid Excessive Elevation', 'Stop within the target range instead of raising past 60°.', false],
];

const equipment = [
  ['fa-camera', 'Webcam', 'For real-time pose detection'],
  ['fa-person', 'Floor Space', 'Room to lie fully in frame'],
  ['fa-bottle-water', 'Hydration', 'Stay hydrated and perform best'],
];

export default function LegRaisePage() {
  const navigate = useNavigate();
  const guideRef = useRef(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [rest, setRest] = useState(30);
  const [reminders, setReminders] = useState(true);

  const start = () => {
    const workoutConfig = { sets, reps, rest };
    sessionStorage.setItem('posefitLegRaiseWorkoutConfig', JSON.stringify(workoutConfig));
    navigate(`/exercises/leg-raise/start?sets=${sets}&reps=${reps}&rest=${rest}`, { state: { workoutConfig } });
  };

  return (
    <div className="squat-page leg-raise-page">
      <Navbar />
      <main className="squat-page__main">
        <nav className="squat-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}><i className="fa-solid fa-arrow-left" />Exercises</button>
          <i className="fa-solid fa-chevron-right" /><span>Leg Raise</span>
        </nav>
        <div className="squat-layout">
          <div className="squat-layout__primary">
            <section className="squat-overview" aria-labelledby="leg-raise-title">
              <div className="squat-overview__image-wrap"><img src={legRaisePhoto} alt="Athlete demonstrating a lying Leg Raise" /></div>
              <div className="squat-overview__details">
                <h1 id="leg-raise-title">Leg Raise</h1>
                <p>Strengthen your hip flexors and abdominal region while improving leg control.</p>
                <div className="squat-overview__facts">
                  <div><i className="fa-solid fa-bullseye" /><span><strong>Targets:</strong> Hip Flexors, Abdominals</span></div>
                  <div><i className="fa-solid fa-chart-simple" /><span><strong>Difficulty:</strong> Beginner to Advanced</span></div>
                </div>
                <button className="squat-overview__guide-button" type="button" onClick={() => guideRef.current?.scrollIntoView({ behavior: 'smooth' })}><i className="fa-regular fa-circle-play" />How to Perform</button>
              </div>
            </section>
            <section className="squat-workout" aria-labelledby="configure-leg-raise">
              <h2 id="configure-leg-raise">Configure Your Workout</h2>
              <div className="squat-config">
                <WorkoutConfigRow icon="fa-layer-group" label="Sets" description="Number of sets you want to perform." value={sets} min={1} max={10} step={1} onChange={setSets} />
                <WorkoutConfigRow icon="fa-rotate" label="Reps" description="Number of repetitions per set." value={reps} min={1} max={50} step={1} onChange={setReps} />
                <WorkoutConfigRow icon="fa-clock" label="Rest Time" description="Rest time between each set." value={rest} suffix=" sec" min={10} max={180} step={5} onChange={setRest} />
              </div>
            </section>
            <section className="squat-reminders">
              <i className="fa-regular fa-bell" /><span><strong>Workout Reminders</strong><small>Get notified to stay consistent.</small></span>
              <button className={`squat-toggle${reminders ? ' squat-toggle--enabled' : ''}`} type="button" role="switch" aria-checked={reminders} onClick={() => setReminders((value) => !value)}><span /></button>
            </section>
            <aside className="squat-tip"><i className="fa-regular fa-lightbulb" /><span><strong>Tip</strong><small>Use controlled hip movement and keep both knees straight.</small></span></aside>
          </div>
          <aside className="squat-layout__sidebar">
            <section className="squat-guide" ref={guideRef} aria-labelledby="leg-raise-guide">
              <h2 id="leg-raise-guide">Leg Raise Form Guide</h2>
              <div className="squat-guide__list">
                {guides.map(([title, description, correct]) => (
                  <div className="squat-guide__item" key={title}>
                    <span className={`squat-guide__status${correct ? '' : ' squat-guide__status--incorrect'}`}><i className={`fa-solid ${correct ? 'fa-check' : 'fa-xmark'}`} /></span>
                    <span className="squat-guide__pose leg-raise-guide__pose"><img src={legRaisePhoto} alt="" /></span>
                    <span className="squat-guide__copy"><strong>{title}</strong><small>{description}</small></span>
                  </div>
                ))}
              </div>
            </section>
            <section className="squat-equipment" aria-labelledby="leg-raise-equipment">
              <h2 id="leg-raise-equipment">You'll Need</h2>
              <div className="squat-equipment__grid">{equipment.map(([icon, title, description]) => <div key={title}><i className={`fa-solid ${icon}`} /><strong>{title}</strong><small>{description}</small></div>)}</div>
            </section>
            <button className="squat-start" type="button" onClick={start}><span>Start Now</span><i className="fa-solid fa-arrow-right" /></button>
          </aside>
        </div>
      </main>
    </div>
  );
}
