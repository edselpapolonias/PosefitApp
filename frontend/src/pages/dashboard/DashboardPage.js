import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getDashboard } from '../../services/dashboardService';
import { workoutPlans } from '../workout-plans/workoutPlansData';
import { beginnerScheduleByWeek } from '../workout-plans/details/beginnerFullBodyData';
import lungePhoto from '../../images/exercise-card-lunge.png';
import plankPhoto from '../../images/exercise-card-plank.png';
import './DashboardPage.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const previewPlan = workoutPlans[0];
const previewWorkout = beginnerScheduleByWeek[1][1];
const previewExercises = previewWorkout.exercises.filter(({ id }) => id === 'lunge' || id === 'plank');
const previewPhotos = { lunge: lungePhoto, plank: plankPhoto };
const formatNumber = (value) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
const dateLabel = (date) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

function SummaryCard({ title, value, unit, icon, tone, note }) {
  return <section className={`dashboard-stat dashboard-stat--${tone}`} aria-label={title}>
    <span className="dashboard-stat__icon"><i className={`fa-solid ${icon}`} aria-hidden="true" /></span>
    <div><h2>{title}</h2><p className="dashboard-stat__value">{value}<span>{unit}</span></p><small>{note}</small></div>
  </section>;
}

function WorkoutTime({ data }) {
  const minutes = data?.days.map((day) => day.seconds / 60) || [];
  const ceiling = Math.max(60, Math.ceil(Math.max(0, ...minutes) / 15) * 15);
  return <section className="dashboard-panel dashboard-time" aria-labelledby="workout-time-title">
    <header><h2 id="workout-time-title">Workout Time (Minutes)</h2><span className="dashboard-period">This Week</span></header>
    {data ? <>
      <div className="dashboard-chart" role="img" aria-label={`Workout minutes this week: ${data.days.map((day, index) => `${DAY_NAMES[index]} ${formatNumber(day.seconds / 60)}`).join(', ')}`}>
        <div className="dashboard-chart__axis" aria-hidden="true">{[4, 3, 2, 1, 0].map((tick) => <span key={tick}>{formatNumber(ceiling * tick / 4)}</span>)}</div>
        <div className="dashboard-chart__plot" aria-hidden="true">
          <div className="dashboard-chart__lines">{[0, 1, 2, 3, 4].map((line) => <span key={line} />)}</div>
          <div className="dashboard-chart__columns">{data.days.map((day, index) => <div className="dashboard-chart__column" key={day.date}>
            <div className="dashboard-chart__bar-space"><div className="dashboard-chart__bar" style={{ height: `${minutes[index] / ceiling * 100}%` }}><b>{formatNumber(minutes[index])}</b></div></div>
            <span>{dateLabel(day.date)}<small>{DAY_NAMES[index]}</small></span>
          </div>)}</div>
        </div>
      </div>
      <p className="dashboard-insight"><i className="fa-regular fa-lightbulb" aria-hidden="true" /><span>{data.workoutsCompleted ? <>You averaged <strong>{formatNumber(data.totalSeconds / 60 / 7)} min</strong> per day across this week.</> : 'Your next workout starts a new chapter. Let’s get moving!'}</span></p>
    </> : <div className="dashboard-loading-area">Workout time will appear here.</div>}
  </section>;
}

function LoginStreak({ data, error }) {
  return <section className="dashboard-panel dashboard-streak" aria-labelledby="login-streak-title">
    <header><h2 id="login-streak-title">Login Streak</h2><span className="dashboard-period">This Week</span></header>
    <div className="dashboard-streak__calendar">{DAY_NAMES.map((day, index) => <div key={day}>
      <span>{day}</span>
      <span className={`dashboard-streak__day${data?.days[index].loggedIn ? ' is-logged-in' : ''}`} aria-label={`${day}${data ? `, ${dateLabel(data.days[index].date)}, ${data.days[index].loggedIn ? 'logged in' : 'no login recorded'}` : ', unavailable'}`}>
        {data?.days[index].loggedIn ? <i className="fa-solid fa-check" aria-hidden="true" /> : data?.days[index].date.slice(-2)}
      </span>
    </div>)}</div>
    <p className="dashboard-streak__hint">Every day you show up counts.</p>
    <div className="dashboard-streak__result"><i className="fa-regular fa-circle-check" aria-hidden="true" /><div><strong>{data ? `${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'} in a row!` : error ? 'Streak unavailable' : 'Loading streak…'}</strong><p>{data ? `Best recorded streak: ${data.bestStreak} ${data.bestStreak === 1 ? 'day' : 'days'}` : 'Your login history will appear here.'}</p></div></div>
  </section>;
}

function PlanPreview() {
  return <aside className="dashboard-sidebar" aria-label="Workout plan preview">
    <section className="dashboard-panel dashboard-next">
      <header><h2>Up Next</h2><Link to={previewPlan.detailsRoute}>View Plan <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></header>
      <span className="dashboard-preview-label">Plan preview</span>
      <h3>{previewPlan.title}</h3><p className="dashboard-next__day">{previewWorkout.label.replace('DAY', 'Day')} of 12 · {previewWorkout.day}</p>
      <div className="dashboard-next__exercises">{previewExercises.map((exercise) => <div key={exercise.id}>
        <img decoding="async" src={previewPhotos[exercise.id]} alt="" /><div><strong>{exercise.name}</strong><p>{exercise.prescription}</p></div>
      </div>)}</div>
      <div className="dashboard-next__estimate"><i className="fa-regular fa-clock" aria-hidden="true" /><div><span>Estimated Time</span><strong>{previewWorkout.estimate}</strong></div></div>
      <button className="dashboard-start" disabled title="Workout execution from the dashboard is not available yet"><i className="fa-solid fa-play" aria-hidden="true" />Start Workout</button>
      <small className="dashboard-preview-note">Preview only · Start from the plan details page.</small>
    </section>
    <section className="dashboard-panel dashboard-active">
      <header><h2>Your Active Plan</h2><Link to={previewPlan.detailsRoute}>View Details <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></header>
      <div className="dashboard-active__body"><span className="dashboard-active__icon"><i className="fa-regular fa-calendar-days" aria-hidden="true" /></span><div><h3>{previewPlan.title}</h3><p>{previewPlan.schedule} · {previewPlan.length}</p><small>Example progress · 33% completed</small><div className="dashboard-progress-track" aria-label="Example plan progress: 33 percent"><span /></div></div></div>
    </section>
    <section className="dashboard-help"><i className="fa-solid fa-shield-halved" aria-hidden="true" /><div><h2>Need Help?</h2><p>Learn how to get the most out of PoseFit.</p><Link to="/exercises">View Guide <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link></div></section>
  </aside>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    const refresh = () => {
      if (inFlight) return;
      inFlight = true;
      setError('');
      getDashboard(controller.signal).then((result) => {
        if (!controller.signal.aborted) setData(result);
      }).catch(() => {
        if (!controller.signal.aborted) { setData(null); setError('We couldn’t load your dashboard. Please try again.'); }
      }).finally(() => { inFlight = false; });
    };
    refresh();
    const refreshTimer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.clearInterval(refreshTimer); window.removeEventListener('focus', refresh); };
  }, [attempt]);

  const pending = error ? 'Unavailable' : 'Loading…';
  return <div className="dashboard-page">
    <Navbar activeItem="Dashboard" />
    <main className="dashboard-main">
      <div className="dashboard-primary">
        <section className="dashboard-welcome">
          <div><h1>Welcome back{data?.firstName ? `, ${data.firstName}` : ''}! <span role="img" aria-label="waving hand">👋</span></h1><p>Keep going! Consistency today leads to results tomorrow.</p></div>
          <p className="dashboard-welcome__motto" aria-hidden="true">Better Form.<br />A Stronger You.</p>
        </section>
        {error && <div className="dashboard-error" role="alert">{error}<button onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
        <div className="dashboard-stats" aria-busy={!data && !error}>
          <SummaryCard title="Total Workout Time" icon="fa-clock" tone="orange" value={data ? formatNumber(data.totalSeconds / 60) : '—'} unit={data ? 'min' : ''} note={data ? 'This week · Mon–Sun' : pending} />
          <SummaryCard title="Workouts Completed" icon="fa-circle-check" tone="green" value={data ? data.workoutsCompleted : '—'} unit={data ? 'sessions' : ''} note={data ? 'Completed this week' : pending} />
          <SummaryCard title="Current Streak" icon="fa-calendar-days" tone="blue" value={data ? data.currentStreak : '—'} unit={data ? 'days' : ''} note={data ? 'Consecutive login days' : pending} />
          <SummaryCard title="Average Accuracy" icon="fa-bullseye" tone="purple" value={data?.averageAccuracy != null ? formatNumber(data.averageAccuracy) : '—'} unit={data?.averageAccuracy != null ? '%' : ''} note={data ? (data.averageAccuracy == null ? 'No accuracy data this week' : 'This week · Excludes plank') : pending} />
        </div>
        <div className="dashboard-analytics"><WorkoutTime data={data} /><LoginStreak data={data} error={error} /></div>
        <section className="dashboard-panel dashboard-recent"><header><h2>Recent Workouts</h2></header><div className="dashboard-recent__empty"><i className="fa-solid fa-dumbbell" aria-hidden="true" /><p>No recent workouts to display yet.</p></div></section>
      </div>
      <PlanPreview />
    </main>
  </div>;
}
