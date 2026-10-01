import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Navbar from '../../components/Navbar';
import { getProgress } from '../../services/progressService';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';
import './ProgressPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const RANGE_OPTIONS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All Time' },
];

const exerciseIcons = {
  squat: squatIcon,
  'push-up': pushUpIcon,
  plank: plankIcon,
  lunge: lungeIcon,
  'leg-raise': legRaiseIcon,
};

const chartFont = { family: 'Poppins', size: 10 };
const axisColor = '#7f8795';
const gridColor = '#edf0f3';

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function compactNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(numeric(value));
}

function formatDuration(seconds, compact = false) {
  const total = Math.max(0, Math.round(numeric(seconds)));
  if (compact && total > 0 && total < 60) return '<1m';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes) return compact || !remainingSeconds ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  return compact ? '0m' : `${remainingSeconds}s`;
}

function formatDate(value) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(date);
}

function comparisonCopy(comparison, type) {
  if (!comparison) return null;
  const absolute = Math.abs(numeric(comparison.delta));
  if (type === 'duration') return formatDuration(absolute, true);
  if (type === 'accuracy') return `${compactNumber(absolute)} pts`;
  if (type === 'days') return `${compactNumber(absolute)} ${absolute === 1 ? 'day' : 'days'}`;
  return compactNumber(absolute);
}

function Comparison({ item, type, periodDays }) {
  if (!item) return <small className="progress-stat__support">All completed history</small>;
  const same = item.direction === 'same';
  return (
    <small className={`progress-stat__comparison progress-stat__comparison--${item.direction}`}>
      <span><i className={`fa-solid ${same ? 'fa-minus' : item.direction === 'up' ? 'fa-arrow-up' : 'fa-arrow-down'}`} /> {comparisonCopy(item, type)}</span>
      <em>vs previous {periodDays} days</em>
    </small>
  );
}

function StatCard({ icon, title, value, unit, comparison, comparisonType, periodDays, support }) {
  return (
    <article className="progress-stat">
      <span className="progress-stat__icon" aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <h2>{title}</h2>
        <strong>{value}<b>{unit}</b></strong>
        {support || <Comparison item={comparison} type={comparisonType} periodDays={periodDays} />}
      </div>
    </article>
  );
}

function EmptyChart({ icon, children }) {
  return <div className="progress-chart-empty"><i className={`fa-regular ${icon}`} aria-hidden="true" /><p>{children}</p></div>;
}

function AccuracyChart({ chart }) {
  const points = useMemo(() => chart?.accuracy || [], [chart]);
  const hasData = points.some((point) => point.value !== null);
  const data = useMemo(() => ({
    labels: points.map((point) => point.label),
    datasets: [{
      data: points.map((point) => point.value),
      borderColor: '#ff5a0a',
      backgroundColor: 'rgba(255, 90, 10, 0.10)',
      borderWidth: 2.2,
      pointRadius: points.length > 45 ? 0 : 2.8,
      pointHoverRadius: 5,
      pointBackgroundColor: '#ff5a0a',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      fill: true,
      tension: 0.28,
      spanGaps: true,
    }],
  }), [points]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => ` ${compactNumber(context.raw)}%` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: axisColor, font: chartFont, maxTicksLimit: 7, maxRotation: 0 } },
      y: { min: 0, max: 100, border: { display: false }, grid: { color: gridColor }, ticks: { color: axisColor, font: chartFont, stepSize: 25, callback: (value) => `${value}%` } },
    },
  }), []);
  return hasData ? <div className="progress-chart"><Line data={data} options={options} /></div> : <EmptyChart icon="fa-chart-line">No form accuracy data for this period.</EmptyChart>;
}

function WorkoutTimeChart({ chart, hasSessions }) {
  const points = useMemo(() => chart?.workoutTime || [], [chart]);
  const data = useMemo(() => ({
    labels: points.map((point) => point.label),
    datasets: [{
      data: points.map((point) => Math.round((numeric(point.seconds) / 60) * 10) / 10),
      backgroundColor: '#ff5a0a',
      hoverBackgroundColor: '#e84f02',
      borderRadius: 5,
      borderSkipped: false,
      maxBarThickness: 34,
    }],
  }), [points]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => ` ${compactNumber(context.raw)} min` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: axisColor, font: chartFont, maxTicksLimit: 7, maxRotation: 0 } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: gridColor }, ticks: { color: axisColor, font: chartFont, precision: 0 } },
    },
  }), []);
  return hasSessions ? <div className="progress-chart"><Bar data={data} options={options} /></div> : <EmptyChart icon="fa-chart-bar">No workout time data for this period.</EmptyChart>;
}

function Panel({ title, aside, className = '', children }) {
  return <section className={`progress-panel ${className}`}><header><h2>{title}</h2>{aside}</header>{children}</section>;
}

function Consistency({ consistency, rangeLabel }) {
  const allDays = consistency?.days || [];
  const visibleDays = allDays.length > 42 ? allDays.slice(-42) : allDays;
  const hiddenCount = allDays.length - visibleDays.length;
  const firstWeekday = visibleDays.length
    ? ((new Date(`${visibleDays[0].date}T12:00:00`).getDay() + 6) % 7) + 1
    : 1;
  return (
    <Panel title="Workout Consistency" aside={<span className="progress-period">{rangeLabel}</span>} className="progress-consistency">
      <div className="progress-consistency__body">
        <div className="progress-consistency__calendar">
          <div className="progress-consistency__weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
          {hiddenCount > 0 && <p className="progress-consistency__recent">Showing the most recent 42 of {allDays.length} days</p>}
          <div className="progress-consistency__days" role="img" aria-label={`${consistency.activeDays} active workout days out of ${consistency.dayCount}`}>
            {visibleDays.map((day, index) => <span key={day.date} className={`is-${day.status}`} title={`${day.date}: ${day.status}`} style={index === 0 ? { gridColumnStart: firstWeekday } : undefined} />)}
          </div>
          <div className="progress-consistency__legend"><span><i className="is-completed" />Completed</span><span><i className="is-partial" />Partial</span><span><i className="is-missed" />Missed</span></div>
        </div>
        <div className="progress-consistency__score">
          <div style={{ '--progress': `${consistency.percentage * 3.6}deg` }}><span><strong>{consistency.percentage}%</strong><small>Consistency</small></span></div>
          <p><strong>{consistency.activeDays} / {consistency.dayCount} days</strong><span>with a completed workout</span></p>
        </div>
      </div>
    </Panel>
  );
}

const highlightMeta = {
  bestAccuracy: { title: 'Best Form Accuracy', icon: 'fa-chart-line', tone: 'green' },
  longestWorkout: { title: 'Longest Workout', icon: 'fa-stopwatch', tone: 'purple' },
  mostReps: { title: 'Most Reps in a Workout', icon: 'fa-star', tone: 'orange' },
};

function highlightValue(key, item) {
  if (key === 'bestAccuracy') return `${compactNumber(item.value)}%`;
  if (key === 'longestWorkout') return formatDuration(item.value, true);
  return `${compactNumber(item.value)} reps`;
}

function Highlights({ highlights }) {
  const items = Object.entries(highlightMeta);
  const hasAny = items.some(([key]) => highlights?.[key]);
  return (
    <Panel title="Performance Highlights" className="progress-highlights">
      {hasAny ? <div className="progress-highlights__list">{items.map(([key, meta]) => {
        const item = highlights?.[key];
        return item ? (
          <Link key={key} to={`/history/session/${encodeURIComponent(item.sessionId)}`} state={{ backTo: '/progress', backLabel: 'Back to Progress' }} aria-label={`View ${meta.title} session summary`}>
            <span className={`is-${meta.tone}`}><i className={`fa-solid ${meta.icon}`} /></span>
            <div><strong>{meta.title}</strong><small>on {formatDate(item.completedDate || item.completedAt)}</small></div>
            <b className={`is-${meta.tone}`}>{highlightValue(key, item)}</b>
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </Link>
        ) : <div className="progress-highlight-missing" key={key}><span className={`is-${meta.tone}`}><i className={`fa-solid ${meta.icon}`} /></span><div><strong>{meta.title}</strong><small>No qualifying session</small></div><b>—</b></div>;
      })}</div> : <div className="progress-panel-empty"><i className="fa-solid fa-trophy" /><p>No workout data available for this period.</p></div>}
    </Panel>
  );
}

function Sparkline({ points, label }) {
  if (!points?.length) return <span className="progress-sparkline-empty">No accuracy data</span>;
  const values = points.map((point) => numeric(point.value));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const coordinates = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 22 - ((value - minimum) / range) * 18;
    return `${x},${y}`;
  });
  return (
    <svg className="progress-sparkline" viewBox="0 0 100 26" role="img" aria-label={`${label} form accuracy trend: ${values.join(', ')} percent`} preserveAspectRatio="none">
      <line x1="0" x2="100" y1="24" y2="24" />
      {values.length > 1 && <polyline points={coordinates.join(' ')} />}
      {coordinates.map((point, index) => { const [cx, cy] = point.split(','); return <circle key={`${cx}-${index}`} cx={cx} cy={cy} r="1.7" />; })}
    </svg>
  );
}

function ExerciseProgress({ exercises }) {
  return (
    <Panel title="Exercise Progress" className="progress-exercises">
      <div className="progress-exercises__table" role="table" aria-label="Exercise progress">
        <div className="progress-exercises__head" role="row"><span>Exercise</span><span>Avg. Form Accuracy</span><span>Total Reps / Time</span><span>Progress Over Time (Accuracy)</span></div>
        {exercises.map((exercise) => (
          <div className="progress-exercises__row" role="row" key={exercise.exercise}>
            <div className="progress-exercises__name" role="cell"><span><img src={exerciseIcons[exercise.exercise]} alt="" /></span><div><strong>{exercise.name}</strong><small>{exercise.sessions} {exercise.sessions === 1 ? 'session' : 'sessions'}</small></div></div>
            <div className="progress-exercises__accuracy" role="cell"><strong>{exercise.averageAccuracy == null ? '—' : `${compactNumber(exercise.averageAccuracy)}%`}</strong><small>{exercise.averageAccuracy == null ? 'No accuracy data' : 'average'}</small></div>
            <div className="progress-exercises__total" role="cell"><strong>{exercise.exercise === 'plank' ? formatDuration(exercise.totalHoldTime, true) : `${compactNumber(exercise.totalReps)} reps`}</strong><small>{exercise.setsCompleted} {exercise.setsCompleted === 1 ? 'set' : 'sets'} completed</small></div>
            <div role="cell"><Sparkline points={exercise.trend} label={exercise.name} /></div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AccuracyDistribution({ distribution }) {
  const categories = useMemo(() => distribution?.categories || [], [distribution]);
  const data = useMemo(() => ({
    labels: categories.map((item) => item.label),
    datasets: [{ data: categories.map((item) => item.count), backgroundColor: categories.map((item) => item.color), borderColor: '#fff', borderWidth: 2, hoverOffset: 3 }],
  }), [categories]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.label}: ${context.raw} sessions` } } },
  }), []);
  return (
    <Panel title="Form Accuracy Distribution" className="progress-distribution">
      {distribution.total ? <>
        <div className="progress-donut"><Doughnut data={data} options={options} /><span><strong>{distribution.total}</strong><small>Sessions</small></span></div>
        <ul>{categories.map((item) => <li key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.count} ({Math.round((item.count / distribution.total) * 100)}%)</strong></li>)}</ul>
      </> : <div className="progress-panel-empty"><i className="fa-solid fa-chart-pie" /><p>No form accuracy data for this period.</p></div>}
    </Panel>
  );
}

function StreakCard({ streak }) {
  return (
    <Panel title="Streak Record" className="progress-streak">
      <div><span><i className="fa-solid fa-fire" /></span><p><strong>{streak} {streak === 1 ? 'Day' : 'Days'}</strong><small>Longest workout streak</small><em>{streak ? 'Consecutive active workout days' : 'Complete workouts on consecutive days to start a streak.'}</em></p></div>
    </Panel>
  );
}

function ProgressSkeleton() {
  return <div className="progress-skeleton" aria-label="Loading progress analytics">{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>;
}

export default function ProgressPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    getProgress(range, controller.signal)
      .then(setData)
      .catch((failure) => {
        if (failure.code !== 'ERR_CANCELED') setError('We couldn’t load your progress right now. Please try again.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, attempt]);

  const rangeLabel = RANGE_OPTIONS.find((option) => option.key === range)?.label || '30 Days';
  const stats = data?.stats;
  const comparisons = data?.comparison;
  const allTimeSupport = range === 'all' ? <small className="progress-stat__support">All completed history</small> : null;
  const statCards = data ? [
    { icon: 'fa-bullseye', title: 'Avg. Form Accuracy', value: stats.averageAccuracy == null ? '—' : compactNumber(stats.averageAccuracy), unit: stats.averageAccuracy == null ? '' : '%', comparison: comparisons?.averageAccuracy, comparisonType: 'accuracy', support: stats.averageAccuracy == null ? <small className="progress-stat__support">No accuracy data</small> : allTimeSupport },
    { icon: 'fa-calendar-days', title: 'Workout Consistency', value: `${stats.activeDays} / ${stats.dayCount}`, unit: 'Days', comparison: comparisons?.activeDays, comparisonType: 'days', support: allTimeSupport },
    { icon: 'fa-dumbbell', title: 'Exercises Completed', value: stats.sessions, unit: 'Sessions', comparison: comparisons?.sessions, support: allTimeSupport },
    { icon: 'fa-clock', title: 'Total Workout Time', value: formatDuration(stats.totalDuration, true), unit: '', comparison: comparisons?.totalDuration, comparisonType: 'duration', support: allTimeSupport },
    { icon: 'fa-fire-flame-curved', title: 'Total Reps', value: compactNumber(stats.totalReps), unit: '', comparison: comparisons?.totalReps, support: allTimeSupport },
  ] : [];

  return (
    <div className="progress-page">
      <Navbar activeItem="Progress" />
      <main className="progress-main">
        <header className="progress-header">
          <div><h1>Progress</h1><p>Track your improvement and stay motivated on your fitness journey.</p></div>
          <div className="progress-range" role="group" aria-label="Progress time range">{RANGE_OPTIONS.map((option) => <button key={option.key} type="button" className={range === option.key ? 'is-active' : ''} aria-pressed={range === option.key} onClick={() => setRange(option.key)}>{option.label}</button>)}</div>
        </header>

        {error && <div className="progress-error" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
        {loading && <ProgressSkeleton />}
        {data && <>
          <section className="progress-stats" aria-label={`${rangeLabel} progress statistics`}>{statCards.map((card) => <StatCard key={card.title} {...card} periodDays={comparisons?.periodDays} />)}</section>

          <div className="progress-chart-grid">
            <Panel title="Form Accuracy Over Time" aside={stats.averageAccuracy == null ? null : <span className="progress-panel-total">Avg: {compactNumber(stats.averageAccuracy)}%</span>}><AccuracyChart chart={data.charts} /></Panel>
            <Panel title="Workout Time (Minutes)" aside={<span className="progress-panel-total">Total: {formatDuration(stats.totalDuration, true)}</span>}><WorkoutTimeChart chart={data.charts} hasSessions={stats.sessions > 0} /></Panel>
          </div>

          <div className="progress-middle-grid"><Consistency consistency={data.consistency} rangeLabel={rangeLabel} /><Highlights highlights={data.highlights} /></div>

          <div className="progress-bottom-grid">
            <ExerciseProgress exercises={data.exercises} />
            <aside className="progress-sidebar"><AccuracyDistribution distribution={data.accuracyDistribution} /><StreakCard streak={data.consistency.longestStreak} /></aside>
          </div>

          <section className={`progress-banner progress-banner--${data.banner.tone}`}>
            <span><i className="fa-solid fa-trophy" /></span><div><h2>{data.banner.title}</h2><p>{data.banner.message}</p></div><i className="fa-solid fa-star" aria-hidden="true" />
          </section>
        </>}
      </main>
    </div>
  );
}
