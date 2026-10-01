import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import {
  getExerciseHistory,
  getExerciseHistoryOverview,
  getHistory,
} from '../../services/historyService';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';
import './HistoryPage.css';

const exerciseIcons = {
  squat: squatIcon,
  'push-up': pushUpIcon,
  plank: plankIcon,
  lunge: lungeIcon,
  'leg-raise': legRaiseIcon,
};

function formatTotalDuration(seconds) {
  const totalSeconds = Math.max(0, Number(seconds) || 0);
  if (totalSeconds > 0 && totalSeconds < 60) return '<1m';
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatSessionDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  return hours ? `${hours}:${clock}` : `${clock} min`;
}

function formatExerciseMeasure(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours) return `${hours}h${minutes ? ` ${minutes}m` : ''}`;
  if (minutes) return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
  return `${remainingSeconds} sec`;
}

function formatCompletedAt(value) {
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

function formatConfiguration(session) {
  const configuration = session.configuration || {};
  const sets = Number(configuration.totalSets || configuration.sets || session.setsCompleted);
  const setLabel = Number.isFinite(sets) && sets > 0 ? `${sets} ${sets === 1 ? 'set' : 'sets'}` : '';
  if (session.metricType === 'time') {
    const seconds = Number(configuration.holdSecondsPerSet || configuration.holdTime || configuration.targetHoldTime);
    return Number.isFinite(seconds) && seconds > 0
      ? `${setLabel || 'Timed'} × ${seconds} sec`
      : setLabel || 'Timed session';
  }
  const reps = Number(configuration.repsPerSet || configuration.targetReps || configuration.reps);
  if (!Number.isFinite(reps) || reps <= 0) return setLabel || 'Completed session';
  return `${setLabel || 'Reps'} × ${reps} reps${configuration.perLeg ? ' each leg' : ''}`;
}

function accuracyResult(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const accuracy = Number(value);
  if (accuracy >= 80) return { label: 'Good', tone: 'good', accuracy };
  if (accuracy >= 60) return { label: 'Fair', tone: 'fair', accuracy };
  return { label: 'Needs Work', tone: 'needs-work', accuracy };
}

function StatCard({ icon, title, value, label }) {
  return (
    <article className="history-stat-card">
      <span className="history-stat-card__icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <h2>{title}</h2>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}

function WorkoutRow({ session, historyState }) {
  const completedAt = formatCompletedAt(session.completedAt);
  const result = accuracyResult(session.accuracy);
  return (
    <tr>
      <td className="history-date-cell"><strong>{completedAt.date}</strong><span>{completedAt.time}</span></td>
      <td>
        <div className="history-workout-cell">
          <span className="history-exercise-icon"><img src={exerciseIcons[session.exercise]} alt="" /></span>
          <span><strong>{session.exerciseName}</strong><small>{formatConfiguration(session)}</small></span>
        </div>
      </td>
      <td className="history-duration-cell">{formatSessionDuration(session.duration)}</td>
      <td>
        {result ? (
          <div className={`history-result history-result--${result.tone}`}>
            <strong>{result.accuracy}%</strong><span>{result.label}</span>
          </div>
        ) : <span className="history-no-result">—<small>No accuracy data</small></span>}
      </td>
      <td>
        <Link
          className="history-summary-button"
          to={`/history/session/${encodeURIComponent(session.id)}`}
          state={{ history: historyState }}
        >
          View Summary
        </Link>
      </td>
    </tr>
  );
}

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;
  const pages = Array.from({ length: total }, (_, index) => index + 1);
  return (
    <nav className="history-pagination" aria-label="Workout history pages">
      <button type="button" onClick={() => onChange(current - 1)} disabled={current === 1} aria-label="Previous page"><i className="fa-solid fa-chevron-left" /></button>
      {pages.map((page) => (
        <button key={page} type="button" onClick={() => onChange(page)} className={page === current ? 'is-active' : ''} aria-current={page === current ? 'page' : undefined}>{page}</button>
      ))}
      <button type="button" onClick={() => onChange(current + 1)} disabled={current === total} aria-label="Next page"><i className="fa-solid fa-chevron-right" /></button>
    </nav>
  );
}

function ActivityOverview({ days = [] }) {
  const maxCount = Math.max(0, ...days.map((day) => day.count));
  const activeDays = days.filter((day) => day.count > 0).length;
  const level = (count) => {
    if (!count) return 0;
    if (maxCount <= 1) return 1;
    return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)));
  };
  return (
    <section className="history-side-card history-activity">
      <header><div><h2>Activity Overview</h2><p>Last 12 weeks</p></div><span>{activeDays} active {activeDays === 1 ? 'day' : 'days'}</span></header>
      <div className="history-heatmap-wrap">
        <div className="history-heatmap-days" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
        <div className="history-heatmap" role="img" aria-label={`Workout activity over the last 12 weeks, ${activeDays} active ${activeDays === 1 ? 'day' : 'days'}`}>
          {days.map((day) => (
            <span key={day.date} className={`history-heatmap__day history-heatmap__day--${level(day.count)}`} title={`${day.date}: ${day.count} completed ${day.count === 1 ? 'session' : 'sessions'}`} />
          ))}
        </div>
      </div>
      <footer><span>Less</span>{[0, 1, 2, 3, 4].map((item) => <i key={item} className={`history-heatmap__day history-heatmap__day--${item}`} />)}<span>More</span></footer>
    </section>
  );
}

function TopExercises({ exercises = [] }) {
  const maximum = exercises[0]?.sessions || 0;
  return (
    <section className="history-side-card history-top-exercises">
      <header><h2>Top Exercises</h2><p>All-time completed sessions</p></header>
      {exercises.length ? <ol>{exercises.map((exercise, index) => (
        <li key={exercise.exercise}>
          <span className="history-top-exercises__rank">{index + 1}</span>
          <span className="history-exercise-icon"><img src={exerciseIcons[exercise.exercise]} alt="" /></span>
          <div><strong>{exercise.name}</strong><span>{exercise.sessions} {exercise.sessions === 1 ? 'session' : 'sessions'}</span><i><b style={{ width: `${(exercise.sessions / maximum) * 100}%` }} /></i></div>
        </li>
      ))}</ol> : <div className="history-side-empty"><i className="fa-solid fa-chart-simple" /><p>Your top exercises will appear here.</p></div>}
    </section>
  );
}

function formatPlanDate(value) {
  if (!value) return 'Date unavailable';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date);
}

function PlanHistoryCard({ plan }) {
  const completed = plan.status === 'completed';
  const ended = plan.status === 'ended';
  const status = completed ? 'COMPLETED' : ended ? 'ENDED' : 'IN PROGRESS';
  return (
    <article className="history-plan-card">
      <header>
        <div><span>Workout Plan</span><h2>{plan.name}</h2></div>
        <strong className={`history-plan-status history-plan-status--${plan.status}`}>{status}</strong>
      </header>
      <div className="history-plan-card__progress-copy">
        <span>{completed ? `${plan.durationWeeks} Weeks` : `Week ${plan.activeWeek} of ${plan.durationWeeks}`}</span>
        <strong>{plan.completedWorkouts} / {plan.totalWorkouts} Workouts Completed</strong>
      </div>
      <div className="history-plan-card__progress">
        <span><i style={{ width: `${plan.percentage}%` }} /></span><strong>{plan.percentage}%</strong>
      </div>
      <dl>
        <div><dt>Started</dt><dd>{formatPlanDate(plan.startDate)}</dd></div>
        {completed && <div><dt>Completed</dt><dd>{formatPlanDate(plan.completedAt)}</dd></div>}
        {!completed && plan.lastActivityAt && <div><dt>Last activity</dt><dd>{formatPlanDate(plan.lastActivityAt)}</dd></div>}
      </dl>
      <Link
        className="history-plan-card__button"
        to={`/history/plan/${plan.instanceId}`}
        state={{ history: { tab: 'plans' } }}
      >
        View History <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </Link>
    </article>
  );
}

function ByPlanHistory({ plans = [], loading }) {
  return (
    <section className="history-plan-list" aria-busy={loading}>
      <header><div><h1>Workout Plan History</h1><p>Progress from plans you have started</p></div></header>
      {loading ? <div className="history-loading"><span /><p>Loading workout plan historyâ€¦</p></div> : plans.length ? (
        <div className="history-plan-grid">{plans.map((plan) => <PlanHistoryCard key={plan.instanceId} plan={plan} />)}</div>
      ) : (
        <div className="history-empty">
          <span><i className="fa-solid fa-calendar-check" /></span>
          <h2>No Workout Plan history yet</h2>
          <p>Your Workout Plan activity will appear here after you begin your first scheduled workout.</p>
        </div>
      )}
    </section>
  );
}

function ExerciseOverviewCard({ exercise }) {
  const isPlank = exercise.exercise === 'plank';
  const lastPerformed = exercise.lastPerformed ? formatCompletedAt(exercise.lastPerformed).date : 'Not performed yet';
  return (
    <Link
      className="history-exercise-card"
      to={`/history/exercise/${exercise.exercise}`}
      state={{ history: { tab: 'exercise', exercisePage: 1 } }}
      aria-label={`View ${exercise.name} history`}
    >
      <header>
        <span><img src={exerciseIcons[exercise.exercise]} alt="" /></span>
        <i className="fa-solid fa-arrow-right" aria-hidden="true" />
      </header>
      <h2>{exercise.name}</h2>
      <dl>
        <div><dt>Completed Sessions</dt><dd>{exercise.sessions}</dd></div>
        <div><dt>Avg. Form Accuracy</dt><dd>{exercise.averageAccuracy == null ? '—' : `${exercise.averageAccuracy}%`}</dd></div>
        <div><dt>{isPlank ? 'Total Hold Time' : 'Total Reps'}</dt><dd>{isPlank ? formatExerciseMeasure(exercise.totalHoldTime) : `${exercise.totalReps} reps`}</dd></div>
      </dl>
      <div className="history-exercise-card__last"><span>Last Performed</span><strong>{lastPerformed}</strong></div>
      <footer>View History <i className="fa-solid fa-chevron-right" aria-hidden="true" /></footer>
    </Link>
  );
}

function ExerciseHistoryOverview({ exercises, loading, error, onRetry }) {
  return (
    <section className="history-exercise-list" aria-busy={loading}>
      <header><h1>History by Exercise</h1><p>Review your workout history and performance for each exercise.</p></header>
      {error ? <div className="history-exercise-error" role="alert"><i className="fa-solid fa-triangle-exclamation" /><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div>
        : loading ? <div className="history-exercise-skeleton" aria-label="Loading exercise history">{[0, 1, 2, 3, 4].map((item) => <span key={item} />)}</div>
          : <div className="history-exercise-grid">{exercises.map((exercise) => <ExerciseOverviewCard key={exercise.exercise} exercise={exercise} />)}</div>}
    </section>
  );
}

function ExerciseDetailStat({ icon, value, label }) {
  return <article className="history-exercise-stat"><span><i className={`fa-solid ${icon}`} /></span><div><strong>{value}</strong><p>{label}</p></div></article>;
}

function ExerciseSessionRow({ session, exercise, page }) {
  const completedAt = formatCompletedAt(session.completedAt);
  const result = accuracyResult(session.accuracy);
  const isPlank = exercise.exercise === 'plank';
  return (
    <tr>
      <td className="history-date-cell"><strong>{completedAt.date}</strong><span>{completedAt.time}</span></td>
      <td><strong className="history-exercise-session-value">{session.setsCompleted}</strong><span className="history-exercise-session-label">{session.setsCompleted === 1 ? 'Set' : 'Sets'}</span></td>
      <td><strong className="history-exercise-session-value">{isPlank ? formatExerciseMeasure(session.totalHoldTime) : session.totalReps == null ? '—' : session.totalReps}</strong><span className="history-exercise-session-label">{isPlank ? 'Hold Time' : session.totalReps == null ? 'No rep data' : 'Reps'}</span></td>
      <td className="history-duration-cell">{formatSessionDuration(session.duration)}</td>
      <td>{result ? <div className={`history-result history-result--${result.tone}`}><strong>{result.accuracy}%</strong><span>{result.label}</span></div> : <span className="history-no-result">—<small>No accuracy data</small></span>}</td>
      <td><Link className="history-summary-button" to={`/history/session/${encodeURIComponent(session.id)}`} state={{ backTo: `/history/exercise/${exercise.exercise}`, backLabel: `Back to ${exercise.name} History`, history: { tab: 'exercise', exercisePage: page } }}>View Summary</Link></td>
    </tr>
  );
}

function ExerciseHistoryDetail({ data, page, onPageChange, loading, error, onRetry }) {
  if (error) return <section className="history-exercise-detail"><div className="history-exercise-error" role="alert"><i className="fa-solid fa-triangle-exclamation" /><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div></section>;
  if (loading || !data) return <section className="history-exercise-detail"><div className="history-loading"><span /><p>Loading exercise history…</p></div></section>;
  const isPlank = data.exercise === 'plank';
  const stats = [
    { icon: 'fa-circle-check', value: data.stats.totalSessions, label: 'Total Sessions' },
    { icon: 'fa-bullseye', value: data.stats.averageAccuracy == null ? '—' : `${data.stats.averageAccuracy}%`, label: 'Avg. Form Accuracy' },
    { icon: isPlank ? 'fa-stopwatch' : 'fa-rotate', value: isPlank ? formatExerciseMeasure(data.stats.totalHoldTime) : data.stats.totalReps, label: isPlank ? 'Total Hold Time' : 'Total Reps' },
    { icon: 'fa-trophy', value: data.stats.bestAccuracy == null ? '—' : `${data.stats.bestAccuracy}%`, label: 'Best Form Accuracy' },
    { icon: 'fa-clock', value: formatTotalDuration(data.stats.totalDuration), label: 'Total Workout Time' },
  ];
  return (
    <section className="history-exercise-detail">
      <Link className="history-exercise-back" to="/history" state={{ history: { tab: 'exercise' } }}><i className="fa-solid fa-arrow-left" />Back to By Exercise</Link>
      <header className="history-exercise-detail__header">
        <span><img src={exerciseIcons[data.exercise]} alt="" /></span>
        <div><h1>{data.name} History</h1><p>Review your completed {data.name} sessions and performance over time.</p></div>
      </header>
      <div className="history-exercise-stats">{stats.map((stat) => <ExerciseDetailStat key={stat.label} {...stat} />)}</div>
      <section className="history-table-card history-exercise-sessions">
        <header><div><h1>Session History</h1><p>{data.sessions.totalItems} completed {data.sessions.totalItems === 1 ? 'session' : 'sessions'} · Newest first</p></div></header>
        <div className="history-table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Sets</th><th>{isPlank ? 'Hold Time' : 'Reps'}</th><th>Duration</th><th>Form Accuracy</th><th>Action</th></tr></thead>
            <tbody>{data.sessions.items.map((session) => <ExerciseSessionRow key={session.id} session={session} exercise={data} page={page} />)}</tbody>
          </table>
          {!data.sessions.items.length && <div className="history-empty"><span><i className="fa-solid fa-dumbbell" /></span><h2>No {data.name} history yet</h2><p>Complete a {data.name} workout and your sessions will appear here.</p></div>}
        </div>
        <Pagination current={data.sessions.page} total={data.sessions.totalPages} onChange={onPageChange} />
      </section>
    </section>
  );
}

export default function HistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const restoredHistory = location.state?.history;
  const [data, setData] = useState(null);
  const [search, setSearch] = useState(() => typeof restoredHistory?.search === 'string' ? restoredHistory.search : '');
  const [page, setPage] = useState(() => Math.max(1, Number(restoredHistory?.page) || 1));
  const [activeTab, setActiveTab] = useState(() => exerciseId || restoredHistory?.tab === 'exercise' ? 'exercise' : restoredHistory?.tab === 'plans' ? 'plans' : 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [exerciseOverview, setExerciseOverview] = useState([]);
  const [exerciseDetail, setExerciseDetail] = useState(null);
  const [exercisePage, setExercisePage] = useState(() => Math.max(1, Number(restoredHistory?.exercisePage) || 1));
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState('');
  const [exerciseAttempt, setExerciseAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getHistory({ page, search: search.trim(), signal: controller.signal })
      .then((result) => {
        setData(result);
        if (result.sessions.page !== page) setPage(result.sessions.page);
      })
      .catch((failure) => {
        if (failure.code !== 'ERR_CANCELED') setError('We couldn’t load your workout history. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, search, attempt]);

  useEffect(() => {
    if (exerciseId) setActiveTab('exercise');
  }, [exerciseId]);

  useEffect(() => {
    if (activeTab !== 'exercise') return undefined;
    const controller = new AbortController();
    setExerciseLoading(true);
    setExerciseError('');
    if (exerciseId) {
      getExerciseHistory(exerciseId, { page: exercisePage, signal: controller.signal })
        .then((result) => {
          setExerciseDetail(result);
          if (result.sessions.page !== exercisePage) setExercisePage(result.sessions.page);
        })
        .catch((failure) => {
          if (failure.code !== 'ERR_CANCELED') setExerciseError(failure.response?.status === 404 ? 'This exercise history is not available.' : 'We couldn’t load this exercise history. Please try again.');
        })
        .finally(() => { if (!controller.signal.aborted) setExerciseLoading(false); });
    } else {
      getExerciseHistoryOverview(controller.signal)
        .then(setExerciseOverview)
        .catch((failure) => { if (failure.code !== 'ERR_CANCELED') setExerciseError('We couldn’t load your exercise history. Please try again.'); })
        .finally(() => { if (!controller.signal.aborted) setExerciseLoading(false); });
    }
    return () => controller.abort();
  }, [activeTab, exerciseId, exercisePage, exerciseAttempt]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (exerciseId) navigate('/history', { state: { history: { page, search, tab } } });
  };

  const stats = data?.stats;
  const sessions = data?.sessions;
  const planHistory = data?.planHistory || [];
  const statCards = useMemo(() => [
    { icon: 'fa-dumbbell', title: 'Total Workouts', value: stats ? stats.totalWorkouts : '—', label: 'Sessions' },
    { icon: 'fa-clock', title: 'Total Duration', value: stats ? formatTotalDuration(stats.totalDuration) : '—', label: 'Total Time' },
    { icon: 'fa-trophy', title: 'Workout Plans Completed', value: stats ? stats.workoutPlansCompleted : '—', label: 'Plans' },
    { icon: 'fa-bullseye', title: 'Avg. Form Accuracy', value: stats?.averageAccuracy != null ? `${stats.averageAccuracy}%` : '—', label: stats?.averageAccuracy != null ? 'Average' : 'No accuracy data' },
    { icon: 'fa-fire', title: 'Best Streak', value: stats ? stats.bestStreak : '—', label: 'Days' },
  ], [stats]);
  const hasAnyHistory = Boolean(stats?.totalWorkouts);
  const hasSearch = Boolean(search.trim());

  return (
    <div className="history-page">
      <Navbar activeItem="History" />
      <main className="history-main">
        <section className="history-stats" aria-label="All-time workout statistics" aria-busy={!data && loading}>
          {statCards.map((card) => <StatCard key={card.title} {...card} />)}
        </section>

        {error && <div className="history-error" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}

        <div className="history-toolbar">
          <div className="history-tabs" aria-label="History view">
            <button className={activeTab === 'all' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'all'} onClick={() => selectTab('all')}>All Workouts</button>
            <button className={activeTab === 'plans' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'plans'} onClick={() => selectTab('plans')}>By Plan</button>
            <button className={activeTab === 'exercise' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'exercise'} onClick={() => selectTab('exercise')}>By Exercise</button>
          </div>
          {activeTab === 'all' && <div className="history-tools">
            <label><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search workouts</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search workouts..." /></label>
            <button className="history-filter" type="button" disabled><i className="fa-solid fa-sliders" aria-hidden="true" />Filter</button>
          </div>}
        </div>

        {activeTab === 'plans' ? <ByPlanHistory plans={planHistory} loading={loading} /> : activeTab === 'exercise' ? (
          exerciseId
            ? <ExerciseHistoryDetail data={exerciseDetail} page={exercisePage} onPageChange={setExercisePage} loading={exerciseLoading} error={exerciseError} onRetry={() => setExerciseAttempt((value) => value + 1)} />
            : <ExerciseHistoryOverview exercises={exerciseOverview} loading={exerciseLoading} error={exerciseError} onRetry={() => setExerciseAttempt((value) => value + 1)} />
        ) : <div className="history-content">
          <section className="history-table-card">
            <header><div><h1>All Workouts</h1><p>{sessions ? `${sessions.totalItems} completed ${sessions.totalItems === 1 ? 'session' : 'sessions'}` : 'Completed sessions'}</p></div></header>
            <div className="history-table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Workout</th><th>Duration</th><th>Results</th><th>Action</th></tr></thead>
                <tbody>
                  {sessions?.items.map((session) => (
                    <WorkoutRow key={session.id} session={session} historyState={{ page, search, tab: 'all' }} />
                  ))}
                </tbody>
              </table>
              {!loading && !error && sessions?.items.length === 0 && (
                <div className="history-empty">
                  <span><i className={`fa-solid ${hasSearch ? 'fa-magnifying-glass' : 'fa-dumbbell'}`} /></span>
                  <h2>{hasAnyHistory && hasSearch ? 'No workouts found' : 'No workout history yet'}</h2>
                  <p>{hasAnyHistory && hasSearch ? 'Try another exercise name.' : 'Complete your first exercise session and it will appear here.'}</p>
                </div>
              )}
              {loading && <div className="history-loading"><span /><p>Loading workout history…</p></div>}
            </div>
            <Pagination current={sessions?.page || 1} total={sessions?.totalPages || 1} onChange={setPage} />
          </section>

          <aside className="history-sidebar" aria-label="Workout analytics">
            <ActivityOverview days={data?.activityOverview} />
            <TopExercises exercises={data?.topExercises} />
          </aside>
        </div>}

      </main>
    </div>
  );
}
