import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar';
import pushUpPhoto from '../../../images/exercise-card-push-up.png';
import { beginnerScheduleByWeek } from './beginnerFullBodyData';
import { activePlanSchedule, activePlanProgress, addDays, localDateKey } from './beginnerActivePlan';
import {
  readWorkoutDaySession,
  startOrResumeWorkoutDay,
  workoutDaySessionId,
  workoutStepNavigation,
} from '../../../services/workoutDaySessionService';
import './BeginnerFullBodyActive.css';

const shortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fullDate = (date) => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const Icon = ({ name }) => <i className={`fa-solid ${name}`} aria-hidden="true" />;

export function ActiveWorkoutPlan({
  plan,
  onEndPlan,
  scheduleByWeek,
  title,
  heroPhoto,
  heroAlt,
  slogan,
  quote,
  description,
  facts = [],
  motivation,
  ending = false,
  error = '',
}) {
  const navigate = useNavigate();
  const weeks = activePlanSchedule(plan, scheduleByWeek);
  const today = new Date();
  const firstWorkoutDate = weeks[0].workouts[0].date;
  const scheduled = localDateKey(today) < localDateKey(firstWorkoutDate);
  const currentWeek = Math.max(1, Math.min(weeks.length, weeks.filter((week) => localDateKey(week.start) <= localDateKey(today)).length));
  const [selectedWeek, setSelectedWeek] = useState(Math.max(1, Math.min(weeks.length, Number(plan.activeWeek) || currentWeek)));
  const selected = weeks[selectedWeek - 1];
  const progress = activePlanProgress(plan, weeks);
  const selectedWorkoutDates = new Set(selected.workouts.map((workout) => localDateKey(workout.date)));

  const startWorkout = (workout) => {
    const session = startOrResumeWorkoutDay(plan, workout);
    const destination = workoutStepNavigation(session);
    if (!destination) return;
    navigate(
      { pathname: destination.pathname, search: destination.search },
      { state: destination.state },
    );
  };

  return <div className="beginner-active">
    <Navbar activeItem="Workout Plans" />
    <main className="beginner-active__main">
      <section className="beginner-active__hero" aria-labelledby="active-plan-title">
        <div className="beginner-active__photo"><img src={heroPhoto} alt={heroAlt} />
          <p className="beginner-active__slogan">{slogan}</p>
          <p className="beginner-active__quote">{quote}</p>
        </div>
        <div className="beginner-active__intro">
          <button className="beginner-active__back" onClick={() => navigate('/workout-plans')}><Icon name="fa-arrow-left" />Back to Workout Plans</button>
          <div className="beginner-active__title"><h1 id="active-plan-title">{title}</h1><span>&#9679;&nbsp; {progress.percent === 100 ? 'Completed Plan' : 'Active Plan'}</span></div>
          <p className="beginner-active__week">{scheduled ? `Starts ${firstWorkoutDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` : `Week ${currentWeek} of ${weeks.length}`} <span>&bull;</span> {progress.percent}% Complete</p>
          <div className="beginner-active__hero-progress"><progress value={progress.completed} max={progress.total} aria-label="Overall plan progress" /><span>{progress.completed} / {progress.total} workouts</span></div>
          <p className="beginner-active__description">{description}</p>
          <div className="beginner-active__facts" aria-label="Plan details">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div>
        </div>
      </section>

      <div className="beginner-active__layout">
        <div className="beginner-active__schedule">
          <div className="beginner-active__tabs" role="tablist" aria-label="Choose workout week">
            {weeks.map((week) => <button type="button" role="tab" key={week.week} id={`active-week-${week.week}`} aria-controls="active-week-panel" aria-selected={selectedWeek === week.week} onClick={() => setSelectedWeek(week.week)}><strong>Week {week.week}</strong><span>{shortDate(week.start)} &ndash; {shortDate(week.end)}</span></button>)}
          </div>
          <section className="beginner-active__card beginner-active__workouts" id="active-week-panel" role="tabpanel" aria-labelledby={`active-week-${selectedWeek}`} data-week={selectedWeek}>
            <h2>This Week</h2><p>Complete your scheduled workouts for this week.</p>
            {selected.workouts.map((workout) => {
              const completed = progress.completedIds.has(workout.id);
              const ready = workout.id === progress.nextId;
              const inProgress = readWorkoutDaySession(workoutDaySessionId(plan, workout))?.status === 'active';
              return <article className={`beginner-active__workout${ready ? ' is-ready' : ''}`} key={workout.id} aria-label={`${workout.label}, ${workout.day}`}>
                <div className="beginner-active__day"><span>{workout.label.replace('DAY', 'Day')}</span><h3>{workout.day}</h3><time dateTime={localDateKey(workout.date)}>{fullDate(workout.date)}</time></div>
                <div className="beginner-active__exercises">{workout.exercises.map((exercise) => <div key={exercise.exerciseId}><img src={exercise.icon} alt="" /><strong>{exercise.name}</strong><span>{exercise.prescription}</span></div>)}</div>
                <div className="beginner-active__workout-action">
                  <button type="button" className={ready ? 'is-ready' : ''} disabled={!ready} onClick={() => ready && startWorkout(workout)}><Icon name={completed ? 'fa-check' : ready ? 'fa-play' : 'fa-lock'} />{completed ? 'Completed' : ready ? inProgress ? 'Resume Workout' : 'Start Workout' : 'Upcoming'}</button>
                  <p><Icon name="fa-clock" />Est. time: {workout.estimate}</p>
                </div>
              </article>;
            })}
          </section>
        </div>

        <section className="beginner-active__card beginner-active__calendar">
          <header><h2>Weekly Calendar</h2><div><button onClick={() => setSelectedWeek(currentWeek)}>Today</button><button aria-label="Previous week" disabled={selectedWeek === 1} onClick={() => setSelectedWeek(selectedWeek - 1)}><Icon name="fa-chevron-left" /></button><button aria-label="Next week" disabled={selectedWeek === weeks.length} onClick={() => setSelectedWeek(selectedWeek + 1)}><Icon name="fa-chevron-right" /></button></div></header>
          <div className="beginner-active__calendar-days">{dayNames.map((day, index) => {
            const date = addDays(selected.start, index);
            const isToday = localDateKey(date) === localDateKey(today);
            const training = selectedWorkoutDates.has(localDateKey(date));
            return <div key={day} className={`${training ? 'is-workout' : ''} ${isToday ? 'is-today' : ''}`}><small>{day}</small><time dateTime={localDateKey(date)} aria-current={isToday ? 'date' : undefined} aria-label={`${fullDate(date)}, ${training ? 'Workout day' : 'Rest day'}${isToday ? ', Today' : ''}`}>{date.getDate()}</time><span aria-hidden="true" /></div>;
          })}</div>
          <div className="beginner-active__legend"><span><b />Workout day</span><span><b />Rest day</span><span><b />Today</span></div>
        </section>

        <section className="beginner-active__card beginner-active__progress"><header><h2>Plan Progress</h2><strong>{progress.percent}%</strong></header><progress value={progress.completed} max={progress.total} aria-label="Completed workouts" /><p>{progress.completed} of {progress.total} workouts completed</p><div>{[[progress.weeksCompleted, 'Weeks Completed'], [progress.completed, 'Workouts Completed'], [progress.remaining, 'Remaining Workouts']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>

        <section className="beginner-active__motivation" aria-label="Motivation"><span><Icon name="fa-trophy" /></span><p>{motivation}</p><div className="beginner-active__mountains" aria-hidden="true"><Icon name="fa-flag" /></div></section>
        <section className="beginner-active__help"><span><Icon name="fa-headphones" /></span><div><h2>Need Help?</h2><p>Check out our guide for tips on form, nutrition, and more.</p><button onClick={() => navigate('/exercises')}>View Guide <Icon name="fa-arrow-right" /></button></div></section>
        <section className="beginner-active__card beginner-active__actions"><h2>Plan Actions</h2><div><button type="button" disabled={ending} onClick={onEndPlan}><Icon name="fa-xmark" />{ending ? 'Ending Plan...' : 'End Plan'}</button></div>{error && <p role="alert">{error}</p>}</section>
      </div>
    </main>
  </div>;
}

export default function BeginnerFullBodyActive(props) {
  return <ActiveWorkoutPlan
    {...props}
    scheduleByWeek={beginnerScheduleByWeek}
    title="Beginner Full Body"
    heroPhoto={pushUpPhoto}
    heroAlt="Athlete demonstrating a push-up"
    slogan={<>Small Steps<br />Big Results</>}
    quote={<>&ldquo;Stay consistent<br />and see the change.&rdquo;</>}
    description="A balanced plan for beginners to build strength, improve endurance, and create a healthy routine using all five PoseFit exercises."
    facts={['3 Days/Week', '30–45 min', '4 Weeks', 'Beginner']}
    motivation={<>&ldquo;Discipline today<br />leads to the progress<br />you'll be proud of later.&rdquo;</>}
  />;
}
