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
      <div className="history-stat-card__copy">
        <h2>{title}</h2>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
      <svg className="history-stat-card__spark" viewBox="0 0 68 34" aria-hidden="true">
        <defs>
          <linearGradient id={`history-spark-${icon}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5a0a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ff5a0a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M1 31 C8 30 10 21 18 22 C26 23 27 13 36 14 C45 16 48 7 57 10 C62 11 65 6 67 4 L67 34 L1 34 Z" fill={`url(#history-spark-${icon})`} stroke="none" />
        <path d="M1 31 C8 30 10 21 18 22 C26 23 27 13 36 14 C45 16 48 7 57 10 C62 11 65 6 67 4" />
      </svg>
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
      <td className="history-plan-cell">{session.planName || 'Standalone'}</td>
      <td className="history-duration-cell"><i className="fa-regular fa-clock" aria-hidden="true" />{formatSessionDuration(session.duration)}</td>
      <td>
        {result ? (
          <div className={`history-accuracy history-accuracy--${result.tone}`}>
            <span style={{ '--history-accuracy': `${result.accuracy * 3.6}deg` }} aria-hidden="true" />
            <strong>{result.accuracy}%</strong>
          </div>
        ) : <span className="history-no-result">—<small>No accuracy data</small></span>}
      </td>
      <td>{result ? <span className={`history-result-label history-result-label--${result.tone}`}>{result.label}</span> : <span className="history-result-label">Not scored</span>}</td>
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
  const byDate = new Map(days.map((day) => [day.date, day]));
  const lastDateValue = days[days.length - 1]?.date;
  const lastDate = lastDateValue ? new Date(`${lastDateValue}T12:00:00Z`) : new Date();
  const mondayOffset = (lastDate.getUTCDay() + 6) % 7;
  const firstDate = new Date(lastDate);
  firstDate.setUTCDate(firstDate.getUTCDate() - mondayOffset - (7 * 7));
  const visibleDays = Array.from({ length: 56 }, (_, index) => {
    const date = new Date(firstDate);
    date.setUTCDate(firstDate.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return byDate.get(key) || { date: key, count: 0, future: date > lastDate };
  });
  const maxCount = Math.max(0, ...visibleDays.map((day) => day.count));
  const activeDays = visibleDays.filter((day) => day.count > 0).length;
  const level = (count) => {
    if (!count) return 0;
    if (maxCount <= 1) return 1;
    return Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4)));
  };
  return (
    <section className="history-side-card history-activity">
      <header><h2>Activity Overview</h2><span>Last 8 Weeks <i className="fa-solid fa-chevron-down" aria-hidden="true" /></span></header>
      <div className="history-heatmap-wrap">
        <div className="history-heatmap-corner" aria-hidden="true" />
        <div className="history-heatmap-weeks" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span key={index}>W{index + 1}</span>)}</div>
        <div className="history-heatmap-days" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="history-heatmap" role="img" aria-label={`Workout activity over the last 8 weeks, ${activeDays} active ${activeDays === 1 ? 'day' : 'days'}`}>
          {visibleDays.map((day) => (
            <span key={day.date} className={`history-heatmap__day history-heatmap__day--${day.future ? 'future' : level(day.count)}`} title={day.future ? day.date : `${day.date}: ${day.count} completed ${day.count === 1 ? 'session' : 'sessions'}`} />
          ))}
        </div>
      </div>
      <footer><span>Less Activity</span>{[0, 1, 2, 3, 4].map((item) => <i key={item} className={`history-heatmap__day history-heatmap__day--${item}`} />)}<span>More Activity</span></footer>
    </section>
  );
}

function TopExercises({ exercises = [] }) {
  const total = exercises.reduce((sum, exercise) => sum + exercise.sessions, 0);
  return (
    <section className="history-side-card history-top-exercises">
      <header><h2>Top Exercises</h2><span>All Time <i className="fa-solid fa-chevron-down" aria-hidden="true" /></span></header>
      {exercises.length ? <ol>{exercises.map((exercise, index) => (
        <li key={exercise.exercise}>
          <span className="history-top-exercises__rank">{index + 1}</span>
          <span className="history-exercise-icon"><img src={exerciseIcons[exercise.exercise]} alt="" /></span>
          <div className="history-top-exercises__name"><strong>{exercise.name}</strong><span>{exercise.sessions} {exercise.sessions === 1 ? 'session' : 'sessions'}</span></div>
          <i className="history-top-exercises__bar"><b style={{ width: `${total ? (exercise.sessions / total) * 100 : 0}%` }} /></i>
          <span className="history-top-exercises__percent">{total ? Math.round((exercise.sessions / total) * 100) : 0}%</span>
        </li>
      ))}</ol> : <div className="history-side-empty"><i className="fa-solid fa-chart-simple" /><p>Your top exercises will appear here.</p></div>}
    </section>
  );
}

function RecentAchievements({ achievements, fallbackStreak = 0 }) {
  const longest = achievements?.longestWorkout;
  const bestAccuracy = achievements?.bestAccuracy;
  const streak = achievements?.bestStreak?.days ?? fallbackStreak;
  const cards = [
    {
      icon: 'fa-trophy', tone: 'gold', label: 'Longest Workout',
      value: longest ? formatSessionDuration(longest.duration) : '—',
      date: longest ? formatCompletedAt(longest.completedAt).date : 'No sessions yet',
    },
    {
      icon: 'fa-bullseye', tone: 'green', label: 'Best Accuracy',
      value: bestAccuracy ? `${bestAccuracy.accuracy}%` : '—',
      date: bestAccuracy ? formatCompletedAt(bestAccuracy.completedAt).date : 'No score yet',
    },
    {
      icon: 'fa-fire', tone: 'orange', label: 'Best Streak',
      value: `${streak || 0} ${streak === 1 ? 'day' : 'days'}`,
      date: 'All-time record',
    },
  ];
  return (
    <section className="history-side-card history-achievements">
      <header><h2>Recent Achievements</h2></header>
      <div className="history-achievements__grid">
        {cards.map((card) => (
          <article key={card.label} className={`history-achievement history-achievement--${card.tone}`}>
            <i className={`fa-solid ${card.icon}`} aria-hidden="true" />
            <strong>{card.label}</strong>
            <b>{card.value}</b>
            <span>{card.date}</span>
          </article>
        ))}
      </div>
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

function ExerciseSessionRow({ session, exercise, page }) {
  const completedAt = formatCompletedAt(session.completedAt);
  const result = accuracyResult(session.accuracy);
  return (
    <tr>
      <td className="history-date-cell"><strong>{completedAt.date}</strong><span>{completedAt.time}</span></td>
      <td className="history-exercise-session-config">{formatConfiguration(session)}</td>
      <td className="history-duration-cell">{formatSessionDuration(session.duration)}</td>
      <td>{result ? <div className={`history-accuracy history-accuracy--${result.tone}`}><span style={{ '--history-accuracy': `${result.accuracy * 3.6}deg` }} aria-hidden="true" /><strong>{result.accuracy}%</strong></div> : <span className="history-no-result">—</span>}</td>
      <td>{result ? <span className={`history-result-label history-result-label--${result.tone}`}>{result.label}</span> : <span className="history-result-label">Not scored</span>}</td>
      <td><Link className="history-summary-button" to={`/history/session/${encodeURIComponent(session.id)}`} state={{ backTo: `/history/exercise/${exercise.exercise}`, backLabel: `Back to ${exercise.name} History`, history: { tab: 'exercise', exercisePage: page, selectedExercise: exercise.exercise } }}>View</Link></td>
    </tr>
  );
}

function formatTrendDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function ExerciseAccuracyTrend({ points = [] }) {
  const plot = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? 324 : 48 + (index * 552) / (points.length - 1),
    y: 20 + ((100 - point.accuracy) / 100) * 152,
  }));
  const linePoints = plot.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = plot.length ? `${plot[0].x},172 ${linePoints} ${plot[plot.length - 1].x},172` : '';
  return (
    <section className="history-exercise-panel history-exercise-trend">
      <header><h2>Form Accuracy Trend</h2><span>Last 8 Sessions <i className="fa-solid fa-chevron-down" aria-hidden="true" /></span></header>
      {plot.length ? <svg viewBox="0 0 620 210" role="img" aria-label="Form accuracy trend">
        <defs><linearGradient id="history-accuracy-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6a20" stopOpacity="0.22" /><stop offset="100%" stopColor="#ff6a20" stopOpacity="0" /></linearGradient></defs>
        {[100, 75, 50, 25, 0].map((value, index) => <g key={value}><line x1="48" x2="600" y1={20 + index * 38} y2={20 + index * 38} /><text x="8" y={24 + index * 38}>{value}%</text></g>)}
        <polygon points={areaPoints} fill="url(#history-accuracy-area)" />
        <polyline className="history-exercise-trend__line" points={linePoints} />
        {plot.map((point) => <g key={`${point.completedAt}-${point.accuracy}`}><circle cx={point.x} cy={point.y} r="4" /><text className="history-exercise-trend__date" x={point.x} y="200" textAnchor="middle">{formatTrendDate(point.completedAt)}</text></g>)}
      </svg> : <div className="history-exercise-panel__empty"><i className="fa-solid fa-chart-line" /><span>Complete a scored session to start your trend.</span></div>}
    </section>
  );
}

function ExerciseFrequency({ rows = [] }) {
  const maximum = Math.max(0, ...rows.flatMap((row) => row.days));
  const level = (count) => count === 0 ? 0 : maximum <= 1 ? 1 : Math.max(1, Math.min(4, Math.ceil((count / maximum) * 4)));
  return (
    <section className="history-exercise-panel history-exercise-frequency">
      <header><h2>Workout Frequency</h2></header>
      <div className="history-frequency-grid">
        <span />{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <strong key={day}>{day}</strong>)}
        {rows.map((row) => <React.Fragment key={row.key}><b>{row.label}</b>{row.days.map((count, index) => <i key={`${row.key}-${index}`} className={`history-frequency-dot history-frequency-dot--${level(count)}`} title={`${row.label} ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][index]}: ${count} sessions`} />)}</React.Fragment>)}
      </div>
      <footer><span>Less Activity</span>{[0, 1, 2, 3, 4].map((item) => <i key={item} className={`history-frequency-dot history-frequency-dot--${item}`} />)}<span>More Activity</span></footer>
    </section>
  );
}

function ExercisePersonalBests({ data }) {
  const isPlank = data.exercise === 'plank';
  const bests = data.analytics?.personalBests || {};
  const rows = [
    { icon: 'fa-trophy', label: 'Highest Form Accuracy', value: bests.accuracy ? `${bests.accuracy.value}%` : '—', date: bests.accuracy?.completedAt },
    { icon: 'fa-person-running', label: isPlank ? 'Longest Hold' : 'Most Reps in a Session', value: bests.volume ? (isPlank ? formatExerciseMeasure(bests.volume.value) : `${bests.volume.value} reps`) : '—', date: bests.volume?.completedAt },
    { icon: 'fa-clock', label: 'Longest Duration', value: bests.duration ? formatSessionDuration(bests.duration.value) : '—', date: bests.duration?.completedAt },
  ];
  return (
    <section className="history-exercise-panel history-personal-bests">
      <header><h2>Personal Bests</h2></header>
      <div>{rows.map((row) => <article key={row.label}><span><i className={`fa-solid ${row.icon}`} aria-hidden="true" /></span><p>{row.label}</p><strong>{row.value}<small>{row.date ? formatCompletedAt(row.date).date : 'No record yet'}</small></strong></article>)}</div>
    </section>
  );
}

function ExerciseHistoryWorkspace({ exercises, data, selectedExercise, onSelect, page, onPageChange, loading, error, onRetry }) {
  if (error) return <section className="history-exercise-workspace"><div className="history-exercise-error" role="alert"><i className="fa-solid fa-triangle-exclamation" /><p>{error}</p><button type="button" onClick={onRetry}>Retry</button></div></section>;
  if (loading || !data) return <section className="history-exercise-workspace"><div className="history-loading"><span /><p>Loading exercise history…</p></div></section>;
  const isPlank = data.exercise === 'plank';
  const stats = [
    { icon: 'fa-calendar-check', label: 'Completed Sessions', value: data.stats.totalSessions },
    { icon: 'fa-bullseye', label: 'Average Form Accuracy', value: data.stats.averageAccuracy == null ? '—' : `${data.stats.averageAccuracy}%` },
    { icon: isPlank ? 'fa-stopwatch' : 'fa-dumbbell', label: isPlank ? 'Total Hold Time' : 'Total Reps', value: isPlank ? formatExerciseMeasure(data.stats.totalHoldTime) : `${data.stats.totalReps} reps` },
    { icon: 'fa-clock', label: 'Total Duration', value: formatTotalDuration(data.stats.totalDuration) },
  ];
  const change = data.analytics?.accuracyChange;
  const improvementTitle = change == null ? 'Build Your Trend' : change >= 0 ? 'Keep Improving!' : 'Keep Building!';
  const improvementCopy = change == null
    ? `Complete more ${data.name} sessions to see how your form changes over time.`
    : change >= 0
      ? `Your ${data.name.toLowerCase()} form has improved by ${change} points compared with your first session.`
      : `Your latest form accuracy is ${Math.abs(change)} points below your first session. Keep practicing with control.`;
  return (
    <section className="history-exercise-workspace" aria-busy={loading}>
      <aside className="history-exercise-nav">
        <h1>Exercises</h1>
        <div>{exercises.map((exercise) => <button key={exercise.exercise} type="button" className={selectedExercise === exercise.exercise ? 'is-active' : ''} aria-pressed={selectedExercise === exercise.exercise} onClick={() => onSelect(exercise.exercise)}><span><img src={exerciseIcons[exercise.exercise]} alt="" /></span><p><strong>{exercise.name}</strong><small>{exercise.sessions} {exercise.sessions === 1 ? 'session' : 'sessions'}</small></p><i className="fa-solid fa-chevron-right" aria-hidden="true" /></button>)}</div>
      </aside>

      <div className="history-exercise-dashboard">
        <header className="history-exercise-profile">
          <span><img src={exerciseIcons[data.exercise]} alt="" /></span>
          <div><h1>{data.name}</h1><strong>{data.stats.totalSessions} completed {data.stats.totalSessions === 1 ? 'session' : 'sessions'}</strong><p>Track your {data.name.toLowerCase()} performance, form accuracy, and {isPlank ? 'hold time' : 'total reps'} over time.</p></div>
        </header>

        <div className="history-exercise-metrics">{stats.map((stat) => <article key={stat.label}><span><i className={`fa-solid ${stat.icon}`} aria-hidden="true" /></span><div><p>{stat.label}</p><strong>{stat.value}</strong></div></article>)}</div>

        <div className="history-exercise-analytics">
          <ExerciseAccuracyTrend points={data.analytics?.accuracyTrend} />
          <ExerciseFrequency rows={data.analytics?.workoutFrequency} />
          <section className="history-exercise-panel history-exercise-recent">
            <header><h2>Recent {data.name} Sessions</h2><span>{data.sessions.totalItems} total</span></header>
            <div className="history-table-wrap"><table><thead><tr><th>Date &amp; Time</th><th>Sets × Target</th><th>Duration</th><th>Form Accuracy</th><th>Result</th><th>Action</th></tr></thead><tbody>{data.sessions.items.map((session) => <ExerciseSessionRow key={session.id} session={session} exercise={data} page={page} />)}</tbody></table>{!data.sessions.items.length && <div className="history-exercise-panel__empty"><i className="fa-solid fa-dumbbell" /><span>Complete a {data.name} workout and it will appear here.</span></div>}</div>
            <Pagination current={data.sessions.page} total={data.sessions.totalPages} onChange={onPageChange} />
          </section>
          <div className="history-exercise-insights">
            <ExercisePersonalBests data={data} />
            <section className="history-exercise-improvement"><span><i className="fa-solid fa-lightbulb" aria-hidden="true" /></span><div><h2>{improvementTitle}</h2><p>{improvementCopy}</p></div><i className="fa-solid fa-arrow-trend-up" aria-hidden="true" /></section>
          </div>
        </div>
      </div>
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
  const [sort, setSort] = useState(() => restoredHistory?.sort === 'oldest' ? 'oldest' : 'newest');
  const [activeTab, setActiveTab] = useState(() => exerciseId || restoredHistory?.tab === 'exercise' ? 'exercise' : restoredHistory?.tab === 'plans' ? 'plans' : 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [exerciseOverview, setExerciseOverview] = useState([]);
  const [exerciseDetail, setExerciseDetail] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(() => exerciseId || restoredHistory?.selectedExercise || 'squat');
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exercisePage, setExercisePage] = useState(() => Math.max(1, Number(restoredHistory?.exercisePage) || 1));
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState('');
  const [exerciseAttempt, setExerciseAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getHistory({ page, search: search.trim(), sort, signal: controller.signal })
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
  }, [page, search, sort, attempt]);

  useEffect(() => {
    if (exerciseId) {
      setActiveTab('exercise');
      setSelectedExercise(exerciseId);
    }
  }, [exerciseId]);

  useEffect(() => {
    if (activeTab !== 'exercise') return undefined;
    const controller = new AbortController();
    setExerciseLoading(true);
    setExerciseError('');
    Promise.all([
      getExerciseHistoryOverview(controller.signal),
      getExerciseHistory(selectedExercise, { page: exercisePage, signal: controller.signal }),
    ])
      .then(([overview, detail]) => {
        setExerciseOverview(overview);
        setExerciseDetail(detail);
        if (detail.sessions.page !== exercisePage) setExercisePage(detail.sessions.page);
      })
      .catch((failure) => {
        if (failure.code !== 'ERR_CANCELED') setExerciseError(failure.response?.status === 404 ? 'This exercise history is not available.' : 'We couldn’t load your exercise history. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setExerciseLoading(false); });
    return () => controller.abort();
  }, [activeTab, selectedExercise, exercisePage, exerciseAttempt]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (exerciseId) navigate('/history', { state: { history: { page, search, sort, tab } } });
  };

  const selectExercise = (nextExercise) => {
    if (nextExercise === selectedExercise) return;
    setSelectedExercise(nextExercise);
    setExercisePage(1);
    navigate(`/history/exercise/${nextExercise}`, { state: { history: { page, search, sort, tab: 'exercise', exercisePage: 1, selectedExercise: nextExercise } } });
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
  const visibleExercises = exerciseOverview.filter((exercise) => exercise.name.toLowerCase().includes(exerciseSearch.trim().toLowerCase()));

  return (
    <div className="history-page">
      <Navbar activeItem="History" />
      <main className="history-main">
        <section className="history-hero" aria-labelledby="history-page-title">
          <div className="history-hero__content">
            <p className="history-hero__eyebrow">HISTORY</p>
            <h1 id="history-page-title">Workout History</h1>
            <p className="history-hero__intro">Review your past workout sessions and track your improvement over time.</p>
          </div>
        </section>

        <section className="history-stats" aria-label="All-time workout statistics" aria-busy={!data && loading}>
          {statCards.map((card) => <StatCard key={card.title} {...card} />)}
        </section>

        {error && <div className="history-error" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}

        <div className="history-toolbar">
          <div className="history-tabs" aria-label="History view">
            <button className={activeTab === 'all' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'all'} onClick={() => selectTab('all')}><i className="fa-solid fa-list-check" aria-hidden="true" />All Workouts</button>
            <button className={activeTab === 'plans' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'plans'} onClick={() => selectTab('plans')}><i className="fa-regular fa-calendar-check" aria-hidden="true" />By Plan</button>
            <button className={activeTab === 'exercise' ? 'is-active' : ''} type="button" aria-pressed={activeTab === 'exercise'} onClick={() => selectTab('exercise')}><i className="fa-solid fa-person-running" aria-hidden="true" />By Exercise</button>
          </div>
          {activeTab === 'all' && <div className="history-tools">
            <label><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search workouts</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search workouts or exercises..." /></label>
            <button className="history-filter" type="button" disabled><i className="fa-solid fa-filter" aria-hidden="true" />Filter</button>
          </div>}
          {activeTab === 'exercise' && <div className="history-tools">
            <label><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /><span className="sr-only">Search exercises</span><input value={exerciseSearch} onChange={(event) => setExerciseSearch(event.target.value)} placeholder="Search exercises..." /></label>
            <button className="history-filter" type="button" disabled><i className="fa-solid fa-filter" aria-hidden="true" />Filter</button>
          </div>}
        </div>

        {activeTab === 'plans' ? <ByPlanHistory plans={planHistory} loading={loading} /> : activeTab === 'exercise' ? (
          <ExerciseHistoryWorkspace exercises={visibleExercises} data={exerciseDetail} selectedExercise={selectedExercise} onSelect={selectExercise} page={exercisePage} onPageChange={setExercisePage} loading={exerciseLoading} error={exerciseError} onRetry={() => setExerciseAttempt((value) => value + 1)} />
        ) : <div className="history-content">
          <section className="history-table-card">
            <header>
              <div><h1>All Workouts</h1><p>View your complete workout history.</p></div>
              <div className="history-table-controls">
                <span>{sessions ? `${sessions.totalItems} ${sessions.totalItems === 1 ? 'session' : 'sessions'}` : 'Sessions'}</span>
                <label><i className="fa-solid fa-arrow-down-wide-short" aria-hidden="true" /><span className="sr-only">Sort workout history</span><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select></label>
              </div>
            </header>
            <div className="history-table-wrap">
              <table>
                <thead><tr><th>Date &amp; Time</th><th>Exercise</th><th>Plan</th><th>Duration</th><th>Accuracy</th><th>Result</th><th>Action</th></tr></thead>
                <tbody>
                  {sessions?.items.map((session) => (
                    <WorkoutRow key={session.id} session={session} historyState={{ page, search, sort, tab: 'all' }} />
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
            <RecentAchievements achievements={data?.achievements} fallbackStreak={stats?.bestStreak} />
          </aside>
        </div>}

      </main>
    </div>
  );
}
