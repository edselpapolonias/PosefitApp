import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WorkoutConfigRow from '../components/WorkoutConfigRow';
import sitUpPhoto from '../images/exercise-sit-up.png';
import './SquatPage.css';
import './SitUpPage.css';

const guides = [
  ['Start in the Right Position', 'Lie on your back with knees bent and feet flat on the floor.', true],
  ['Engage Your Core', 'Use your abs to lift your upper body, not your neck.', true],
  ['Full Range of Motion', 'Sit up until your chest is close to your thighs.', true],
  ['Lower with Control', 'Lower your back down slowly and with control.', true],
  ['Avoid Pulling Your Neck', "Don't pull your neck with your hands or elbows.", false],
];

const equipment = [
  ['fa-camera', 'Webcam', 'For real-time pose detection'],
  ['fa-person', 'Space', 'Enough room to move'],
  ['fa-bottle-water', 'Hydration', 'Stay hydrated and perform best'],
];

export default function SitUpPage() {
  const navigate = useNavigate();
  const guideRef = useRef(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(15);
  const [rest, setRest] = useState(60);
  const [reminders, setReminders] = useState(true);

  const start = () => {
    const workoutConfig = { sets, reps, rest };
    sessionStorage.setItem('posefitSitUpWorkoutConfig', JSON.stringify(workoutConfig));
    navigate(`/exercises/sit-up/start?sets=${sets}&reps=${reps}&rest=${rest}`, { state: { workoutConfig } });
  };

  return (
    <div className="squat-page sit-up-page">
      <Navbar />
      <main className="squat-page__main">
        <nav className="squat-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}><i className="fa-solid fa-arrow-left" />Exercises</button>
          <i className="fa-solid fa-chevron-right" /><span>Sit Up</span>
        </nav>
        <div className="squat-layout">
          <div className="squat-layout__primary">
            <section className="squat-overview" aria-labelledby="sit-up-title">
              <div className="squat-overview__image-wrap"><img src={sitUpPhoto} alt="Athlete demonstrating a Sit Up" /></div>
              <div className="squat-overview__details">
                <h1 id="sit-up-title">Sit Up</h1>
                <p>Strengthen your core and improve overall stability.</p>
                <div className="squat-overview__facts">
                  <div><i className="fa-solid fa-bullseye" /><span><strong>Targets:</strong> Abs, Hip Flexors</span></div>
                  <div><i className="fa-solid fa-chart-simple" /><span><strong>Difficulty:</strong> Beginner to Advanced</span></div>
                </div>
                <button className="squat-overview__guide-button" type="button" onClick={() => guideRef.current?.scrollIntoView({ behavior: 'smooth' })}><i className="fa-regular fa-circle-play" />How to Perform</button>
              </div>
            </section>
            <section className="squat-workout" aria-labelledby="configure-sit-up">
              <h2 id="configure-sit-up">Configure Your Workout</h2>
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
            <aside className="squat-tip"><i className="fa-regular fa-lightbulb" /><span><strong>Tip</strong><small>Focus on using your core, not momentum, for better results and safety.</small></span></aside>
          </div>
          <aside className="squat-layout__sidebar">
            <section className="squat-guide" ref={guideRef} aria-labelledby="sit-up-guide">
              <h2 id="sit-up-guide">Sit Up Form Guide</h2>
              <div className="squat-guide__list">
                {guides.map(([title, description, correct]) => (
                  <div className="squat-guide__item" key={title}>
                    <span className={`squat-guide__status${correct ? '' : ' squat-guide__status--incorrect'}`}><i className={`fa-solid ${correct ? 'fa-check' : 'fa-xmark'}`} /></span>
                    <span className="squat-guide__pose sit-up-guide__pose"><img src={sitUpPhoto} alt="" /></span>
                    <span className="squat-guide__copy"><strong>{title}</strong><small>{description}</small></span>
                  </div>
                ))}
              </div>
            </section>
            <section className="squat-equipment" aria-labelledby="sit-up-equipment">
              <h2 id="sit-up-equipment">You'll Need</h2>
              <div className="squat-equipment__grid">{equipment.map(([icon, title, description]) => <div key={title}><i className={`fa-solid ${icon}`} /><strong>{title}</strong><small>{description}</small></div>)}</div>
            </section>
            <button className="squat-start" type="button" onClick={start}><span>Start Now</span><i className="fa-solid fa-arrow-right" /></button>
          </aside>
        </div>
      </main>
    </div>
  );
}
