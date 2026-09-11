import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import pushUpPhoto from '../../../images/exercise-card-push-up.png';
import { activePlanSchedule, activePlanProgress, addDays, localDateKey } from './beginnerActivePlan';
import './BeginnerFullBodyActive.css';

const shortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fullDate = (date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const Icon = ({ name }) => <i className={`fa-solid ${name}`} aria-hidden="true" />;

export default function BeginnerFullBodyActive({ plan, onEndPlan, ending = false, error = '' }) {
  const navigate = useNavigate();
  const weeks = activePlanSchedule(plan);
  const today = new Date();
  const scheduled = localDateKey(today) < plan.startDate;
  const currentWeek = Math.max(1, Math.min(4, weeks.filter((week) => localDateKey(week.start) <= localDateKey(today)).length));
  const [selectedWeek, setSelectedWeek] = useState(Math.max(1, Math.min(4, Number(plan.activeWeek) || currentWeek)));
  const selected = weeks[selectedWeek - 1];
  const progress = activePlanProgress(plan, weeks);

  return <div className="beginner-active">
    <Navbar activeItem="Workout Plans" />
    <main className="beginner-active__main">
      <section className="beginner-active__hero" aria-labelledby="active-plan-title">
        <div className="beginner-active__photo"><img src={pushUpPhoto} alt="Athlete demonstrating a push-up" />
          <p className="beginner-active__slogan">Small Steps<br />Big Results</p>
          <p className="beginner-active__quote">“Stay consistent<br />and see the change.”</p>
        </div>
        <div className="beginner-active__intro">
          <button className="beginner-active__back" onClick={() => navigate('/workout-plans')}><Icon name="fa-arrow-left" />Back to Workout Plans</button>
          <div className="beginner-active__title"><h1 id="active-plan-title">Beginner Full Body</h1><span>●&nbsp; Active Plan</span></div>
          <p className="beginner-active__week">{scheduled ? `Starts ${weeks[0].start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` : `Week ${currentWeek} of 4`} <span>•</span> {progress.percent}% Complete</p>
          <div className="beginner-active__hero-progress"><progress value={progress.completed} max={progress.total} aria-label="Overall plan progress" /><span>{progress.completed} / {progress.total} workouts</span></div>
          <p className="beginner-active__description">A balanced plan for beginners to build strength, improve endurance, and create a healthy routine using all five PoseFit exercises.</p>
        </div>
      </section>

      <div className="beginner-active__layout">
        <div className="beginner-active__schedule">
          <div className="beginner-active__tabs" role="tablist" aria-label="Choose workout week">
            {weeks.map((week) => <button type="button" role="tab" key={week.week} id={`active-week-${week.week}`} aria-controls="active-week-panel" aria-selected={selectedWeek === week.week} onClick={() => setSelectedWeek(week.week)}><strong>Week {week.week}</strong><span>{shortDate(week.start)} – {shortDate(week.end)}</span></button>)}
          </div>
          <section className="beginner-active__card beginner-active__workouts" id="active-week-panel" role="tabpanel" aria-labelledby={`active-week-${selectedWeek}`} data-week={selectedWeek}>
            <h2>This Week</h2><p>Complete your scheduled workouts for this week.</p>
            {selected.workouts.map((workout) => {
              const completed = progress.completedIds.has(workout.id);
              const ready = workout.id === progress.nextId;
              return <article className={`beginner-active__workout${ready ? ' is-ready' : ''}`} key={workout.id} aria-label={`${workout.label}, ${workout.day}`}>
                <div className="beginner-active__day"><span>{workout.label.replace('DAY', 'Day')}</span><h3>{workout.day}</h3><time dateTime={localDateKey(workout.date)}>{fullDate(workout.date)}</time></div>
                <div className="beginner-active__exercises">{workout.exercises.map((exercise) => <div key={exercise.exerciseId}><img src={exercise.icon} alt="" /><strong>{exercise.name}</strong><span>{exercise.prescription}</span></div>)}</div>
                <div className="beginner-active__workout-action">
                  <button type="button" className={ready ? 'is-ready' : ''} disabled={!ready}><Icon name={completed ? 'fa-check' : ready ? 'fa-play' : 'fa-lock'} />{completed ? 'Completed' : ready ? 'Start Workout' : 'Upcoming'}</button>
                  <p><Icon name="fa-clock" />Est. time: {workout.estimate}</p>
                </div>
              </article>;
            })}
          </section>
        </div>

        <section className="beginner-active__card beginner-active__calendar">
          <header><h2>Weekly Calendar</h2><div><button onClick={() => setSelectedWeek(currentWeek)}>Today</button><button aria-label="Previous week" disabled={selectedWeek === 1} onClick={() => setSelectedWeek(selectedWeek - 1)}><Icon name="fa-chevron-left" /></button><button aria-label="Next week" disabled={selectedWeek === 4} onClick={() => setSelectedWeek(selectedWeek + 1)}><Icon name="fa-chevron-right" /></button></div></header>
          <div className="beginner-active__calendar-days">{dayNames.map((day, index) => {
            const date = addDays(selected.start, index);
            const isToday = localDateKey(date) === localDateKey(today);
            const training = [0, 2, 4].includes(index);
            return <div key={day} className={`${training ? 'is-workout' : ''} ${isToday ? 'is-today' : ''}`}><small>{day}</small><time dateTime={localDateKey(date)} aria-current={isToday ? 'date' : undefined} aria-label={`${fullDate(date)}, ${training ? 'Workout day' : 'Rest day'}${isToday ? ', Today' : ''}`}>{date.getDate()}</time><span aria-hidden="true" /></div>;
          })}</div>
          <div className="beginner-active__legend"><span><b />Workout day</span><span><b />Rest day</span><span><b />Today</span></div>
        </section>

        <section className="beginner-active__card beginner-active__progress"><header><h2>Plan Progress</h2><strong>{progress.percent}%</strong></header><progress value={progress.completed} max={progress.total} aria-label="Completed workouts" /><p>{progress.completed} of {progress.total} workouts completed</p><div>{[[progress.weeksCompleted, 'Weeks Completed'], [progress.completed, 'Workouts Completed'], [progress.remaining, 'Remaining Workouts']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

        <section className="beginner-active__motivation" aria-label="Motivation"><span><Icon name="fa-trophy" /></span><p>“Discipline today<br />leads to the progress<br />you’ll be proud of later.”</p><div className="beginner-active__mountains" aria-hidden="true"><Icon name="fa-flag" /></div></section>
        <section className="beginner-active__help"><span><Icon name="fa-headphones" /></span><div><h2>Need Help?</h2><p>Check out our guide for tips on form, nutrition, and more.</p><button onClick={() => navigate('/exercises')}>View Guide <Icon name="fa-arrow-right" /></button></div></section>
        <section className="beginner-active__card beginner-active__actions"><h2>Plan Actions</h2><div><button type="button" disabled={ending} onClick={onEndPlan}><Icon name="fa-xmark" />{ending ? 'Ending Plan...' : 'End Plan'}</button></div>{error && <p role="alert">{error}</p>}</section>
      </div>
    </main>
  </div>;
}
