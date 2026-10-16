import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getDashboard } from '../../services/dashboardService';
import { workoutPlans } from '../workout-plans/workoutPlansData';
import { beginnerScheduleByWeek } from '../workout-plans/details/beginnerFullBodyData';
import { lowerBodyScheduleByWeek } from '../workout-plans/details/lowerBodyFocusData';
import { coreUpperScheduleByWeek } from '../workout-plans/details/coreUpperBodyData';
import { readWorkoutDaySession, workoutDaySessionId } from '../../services/workoutDaySessionService';
import { formatTime } from '../../utils/formatters';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';
import './DashboardPage.css';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const planSchedules = {
  'beginner-full-body': beginnerScheduleByWeek,
  'lower-body-focus': lowerBodyScheduleByWeek,
  'core-upper-body': coreUpperScheduleByWeek,
};
const planRoutes = Object.fromEntries(workoutPlans.map((plan) => [plan.slug, plan.detailsRoute]));
const recentWorkoutIcons = {
  squat: squatIcon,
  'push-up': pushUpIcon,
  plank: plankIcon,
  lunge: lungeIcon,
  'leg-raise': legRaiseIcon,
};
const formatNumber = (value) => new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
const dateLabel = (date) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

function planWorkout(plan, scheduledWorkout) {
  return planSchedules[plan.id]?.[scheduledWorkout.week]?.find(({ id }) => id === scheduledWorkout.id) || null;
}

function workoutStatus(plan, workout) {
  if ((plan.completedWorkoutIds || []).includes(workout.id)) return 'completed';
  const serverSession = (plan.daySessions || []).find((session) => session.workoutId === workout.id);
  const localSession = readWorkoutDaySession(workoutDaySessionId(plan, workout));
  return serverSession?.status === 'active' || localSession?.status === 'active' ? 'in_progress' : 'available';
}

export function dashboardWorkoutSelection(activePlans = [], today) {
  const plans = activePlans.filter((plan) => plan?.status === 'active' && planSchedules[plan.id]);
  if (!plans.length) return { mode: 'empty', items: [], plans: [] };

  const scheduled = plans.flatMap((plan, planOrder) => (plan.schedule || []).flatMap((scheduledWorkout) => {
    const workout = planWorkout(plan, scheduledWorkout);
    if (!workout) return [];
    return [{
      plan,
      planOrder,
      route: planRoutes[plan.id] || '/workout-plans',
      workout: { ...workout, scheduledDate: scheduledWorkout.date },
      status: workoutStatus(plan, workout),
    }];
  }));

  const todayItems = scheduled.filter(({ workout }) => workout.scheduledDate === today);
  if (todayItems.length) return { mode: 'today', items: todayItems, plans };

  const upcoming = scheduled
    .filter(({ workout, status }) => workout.scheduledDate > today && status !== 'completed')
    .sort((left, right) => left.workout.scheduledDate.localeCompare(right.workout.scheduledDate) || left.planOrder - right.planOrder);
  return upcoming.length
    ? { mode: 'upcoming', items: [upcoming[0]], plans }
    : { mode: 'rest', items: [], plans };
}

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

function savedNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function completedAtLabel(value) {
  const completedAt = new Date(value);
  if (Number.isNaN(completedAt.getTime())) return { date: 'Date unavailable', time: '' };
  return {
    date: new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(completedAt),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit',
    }).format(completedAt),
  };
}

function formResult(value) {
  const accuracy = savedNumber(value);
  if (accuracy === null) return null;
  if (accuracy >= 80) return { accuracy, label: 'Good', tone: 'good' };
  if (accuracy >= 60) return { accuracy, label: 'Fair', tone: 'fair' };
  return { accuracy, label: 'Needs Work', tone: 'needs-work' };
}

function workoutResult(session) {
  const configuration = session.configuration || {};
  const perLeg = Boolean(configuration.perLeg);
  if (session.metricType === 'time') {
    const totalHoldTime = savedNumber(session.totalHoldTime);
    if (totalHoldTime !== null) return `${formatTime(Math.max(0, Math.round(totalHoldTime)))} hold`;
    const holdPerSet = savedNumber(configuration.holdSecondsPerSet ?? configuration.holdTime ?? configuration.targetHoldTime);
    return holdPerSet === null ? 'No hold data' : `${formatTime(Math.max(0, Math.round(holdPerSet)))} per set`;
  }

  if (perLeg) {
    const left = savedNumber(session.analysis?.perLegCounts?.left);
    const right = savedNumber(session.analysis?.perLegCounts?.right);
    if (left !== null && right !== null && left === right) return `${left} reps each leg`;
    if (left !== null || right !== null) return `${left ?? '—'} left · ${right ?? '—'} right`;
    const repsPerSet = savedNumber(configuration.repsPerSet ?? configuration.targetReps ?? configuration.reps);
    if (repsPerSet !== null) return `${repsPerSet} reps each leg`;
  }

  const totalReps = savedNumber(session.totalReps);
  if (totalReps !== null) return `${totalReps} reps`;
  const repsPerSet = savedNumber(configuration.repsPerSet ?? configuration.targetReps ?? configuration.reps);
  return repsPerSet === null ? 'No rep data' : `${repsPerSet} reps per set`;
}

function RecentWorkoutRow({ session }) {
  const completedAt = completedAtLabel(session.completedAt);
  const result = formResult(session.accuracy);
  const sets = savedNumber(session.setsCompleted);
  const duration = savedNumber(session.duration);
  const summaryLabel = `View ${session.exerciseName} session summary from ${completedAt.date}${completedAt.time ? ` at ${completedAt.time}` : ''}`;
  return <article className="dashboard-recent__row">
    <div className="dashboard-recent__exercise">
      <span><img src={recentWorkoutIcons[session.exercise]} alt="" /></span>
      <div><strong>{session.exerciseName}</strong><p>{completedAt.date}{completedAt.time && <> <b aria-hidden="true">·</b> {completedAt.time}</>}</p></div>
    </div>
    <div className="dashboard-recent__details">
      <div><strong>{sets === null ? '—' : `${sets} ${sets === 1 ? 'set' : 'sets'}`}</strong><span>{workoutResult(session)}</span></div>
      <div className="dashboard-recent__duration"><strong>{duration === null ? '—' : formatTime(Math.max(0, Math.round(duration)))}</strong><span><i className="fa-regular fa-clock" aria-hidden="true" />Duration</span></div>
      <div className={`dashboard-recent__score${result ? ` dashboard-recent__score--${result.tone}` : ''}`}><strong>{result ? `${result.accuracy}%` : '—'}</strong><span>{result ? result.label : 'No data'}</span></div>
    </div>
    <Link className="dashboard-recent__arrow" to={`/history/session/${encodeURIComponent(session.id)}`} aria-label={summaryLabel}>
      <i className="fa-solid fa-chevron-right" aria-hidden="true" />
    </Link>
  </article>;
}

function RecentWorkouts({ sessions, loading, error }) {
  const recent = (Array.isArray(sessions) ? sessions : [])
    .filter((session) => recentWorkoutIcons[session.exercise])
    .slice(0, 3);
  return <section className="dashboard-panel dashboard-recent" aria-labelledby="recent-workouts-title" aria-busy={loading}>
    <header><h2 id="recent-workouts-title">Recent Workouts</h2><Link to="/history">View All</Link></header>
    {loading ? <div className="dashboard-recent__skeleton" aria-label="Loading recent workouts">{[0, 1, 2].map((row) => <span key={row} />)}</div>
      : error ? <div className="dashboard-recent__empty dashboard-recent__empty--error"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /><strong>Recent workouts unavailable</strong><p>Please try again when your connection is available.</p></div>
        : recent.length ? <div className="dashboard-recent__list">{recent.map((session) => <RecentWorkoutRow session={session} key={session.id} />)}</div>
          : <div className="dashboard-recent__empty"><i className="fa-solid fa-dumbbell" aria-hidden="true" /><strong>No recent workouts yet</strong><p>Complete your first workout and it will appear here.</p></div>}
  </section>;
}

function PlanPreview({ data, error }) {
  const selection = data ? dashboardWorkoutSelection(data.activePlans, data.today) : null;
  const signature = selection?.items.map(({ plan, workout, status }) => `${plan.instanceId}-${workout.id}-${status}`).join('|') || selection?.mode;
  const [slide, setSlide] = useState(0);
  useEffect(() => setSlide(0), [signature]);
  const item = selection?.items[slide] || null;
  const slideCount = selection?.items.length || 0;

  let card;
  if (!selection) {
    card = <section className="dashboard-panel dashboard-next dashboard-plan-state">
      <header><h2>Workout Plan</h2></header>
      <div className="dashboard-plan-empty"><span><i className={`fa-solid ${error ? 'fa-triangle-exclamation' : 'fa-spinner'}`} aria-hidden="true" /></span><h3>{error ? 'Workout plans unavailable' : 'Loading your workout plan...'}</h3><p>{error ? 'Please retry when your dashboard connection is available.' : 'Checking your active schedule.'}</p></div>
    </section>;
  } else if (selection.mode === 'empty') {
    card = <section className="dashboard-panel dashboard-next dashboard-plan-state">
      <header><h2>Workout Plan</h2></header>
      <div className="dashboard-plan-empty"><span><i className="fa-regular fa-calendar" aria-hidden="true" /></span><h3>No Active Plan</h3><p>You currently don't have an active workout plan. Choose a structured plan to begin your training.</p><Link className="dashboard-start" to="/workout-plans"><i className="fa-solid fa-compass" aria-hidden="true" />Browse Workout Plans</Link></div>
    </section>;
  } else if (selection.mode === 'rest') {
    const plan = selection.plans[0];
    card = <section className="dashboard-panel dashboard-next dashboard-plan-state">
      <header><h2>Workout Plan</h2></header>
      <div className="dashboard-plan-empty"><span><i className="fa-solid fa-mug-hot" aria-hidden="true" /></span><span className="dashboard-preview-label">Rest Day</span><h3>{plan.name}</h3><p>No workout is scheduled for today, and this plan has no remaining future workout dates.</p><Link className="dashboard-start" to={planRoutes[plan.id]}><i className="fa-solid fa-calendar-days" aria-hidden="true" />View Active Plan</Link></div>
    </section>;
  } else {
    const isToday = selection.mode === 'today';
    const completed = item.status === 'completed';
    const inProgress = item.status === 'in_progress';
    const buttonLabel = !isToday || completed ? 'View Active Plan' : inProgress ? 'Continue Workout' : 'Start Workout';
    const buttonIcon = !isToday || completed ? 'fa-calendar-days' : inProgress ? 'fa-arrow-right' : 'fa-play';
    card = <section className="dashboard-panel dashboard-next">
      <header><h2>{isToday ? "Today's Workout" : 'Up Next'}</h2>{slideCount > 1 && <span className="dashboard-plan-count" aria-live="polite">{slide + 1} / {slideCount}</span>}</header>
      <span className={`dashboard-preview-label dashboard-preview-label--${completed ? 'completed' : inProgress ? 'progress' : isToday ? 'today' : 'upcoming'}`}>{completed ? 'Completed' : inProgress ? 'In Progress' : isToday ? "Today's Workout" : 'Rest Day · Up Next'}</span>
      <h3>{item.plan.name}</h3>
      <p className="dashboard-next__day">Week {item.workout.week} · {item.workout.day} · {dateLabel(item.workout.scheduledDate)}</p>
      <div className="dashboard-next__icons" aria-label={`Exercises: ${item.workout.exercises.map(({ name }) => name).join(', ')}`}>
        {item.workout.exercises.map((exercise) => <span key={exercise.exerciseId}><img decoding="async" src={exercise.icon} alt="" /></span>)}
      </div>
      <div className="dashboard-next__exercises">{item.workout.exercises.map((exercise) => <div key={exercise.exerciseId}>
        <div><strong>{exercise.name}</strong><p>{exercise.prescription}</p></div>
      </div>)}</div>
      <div className="dashboard-next__estimate"><i className="fa-regular fa-clock" aria-hidden="true" /><div><span>Estimated Time</span><strong>{item.workout.estimate}</strong></div></div>
      <Link className="dashboard-start" to={item.route}><i className={`fa-solid ${buttonIcon}`} aria-hidden="true" />{buttonLabel}</Link>
      {slideCount > 1 && <nav className="dashboard-plan-carousel" aria-label="Today's workout plans">
        <button type="button" aria-label="Previous workout plan" onClick={() => setSlide((slide - 1 + slideCount) % slideCount)}><i className="fa-solid fa-chevron-left" aria-hidden="true" /></button>
        <div aria-hidden="true">{selection.items.map(({ plan }, index) => <span className={index === slide ? 'is-active' : ''} key={plan.instanceId || plan.id} />)}</div>
        <button type="button" aria-label="Next workout plan" onClick={() => setSlide((slide + 1) % slideCount)}><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>
      </nav>}
    </section>;
  }

  return <aside className="dashboard-sidebar" aria-label="Workout plan">
    {card}
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
      <section className="dashboard-welcome" aria-labelledby="dashboard-page-title">
        <div className="dashboard-welcome__content">
          <p className="dashboard-welcome__eyebrow">DASHBOARD</p>
          <h1 id="dashboard-page-title">Welcome Back{data?.firstName ? `, ${data.firstName}` : ''}</h1>
          <p className="dashboard-welcome__intro">Here’s a clear look at your week and what’s next.</p>
        </div>
      </section>
      <div className="dashboard-layout">
        <div className="dashboard-primary">
          {error && <div className="dashboard-error" role="alert">{error}<button onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
          <div className="dashboard-stats" aria-busy={!data && !error}>
            <SummaryCard title="Total Workout Time" icon="fa-clock" tone="orange" value={data ? formatNumber(data.totalSeconds / 60) : '—'} unit={data ? 'min' : ''} note={data ? 'This week · Mon–Sun' : pending} />
            <SummaryCard title="Workouts Completed" icon="fa-circle-check" tone="green" value={data ? data.workoutsCompleted : '—'} unit={data ? 'sessions' : ''} note={data ? 'Completed this week' : pending} />
            <SummaryCard title="Current Streak" icon="fa-calendar-days" tone="blue" value={data ? data.currentStreak : '—'} unit={data ? 'days' : ''} note={data ? 'Consecutive login days' : pending} />
            <SummaryCard title="Average Accuracy" icon="fa-bullseye" tone="purple" value={data?.averageAccuracy != null ? formatNumber(data.averageAccuracy) : '—'} unit={data?.averageAccuracy != null ? '%' : ''} note={data ? (data.averageAccuracy == null ? 'No accuracy data this week' : 'This week · Excludes plank') : pending} />
          </div>
          <div className="dashboard-analytics"><WorkoutTime data={data} /><LoginStreak data={data} error={error} /></div>
          <RecentWorkouts sessions={data?.recentWorkouts} loading={!data && !error} error={error} />
        </div>
        <PlanPreview data={data} error={error} />
      </div>
    </main>
  </div>;
}
