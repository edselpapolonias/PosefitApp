import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { fetchSessionCoachFeedback } from '../services/aiCoachService';
import { saveSessionAndGetComparison } from '../services/sessionHistoryService';
import {
  createSessionResult,
  readLatestSessionResult,
  readSessionFeedback,
  saveLatestSessionResult,
  updateStoredSessionFeedback,
} from '../services/summaryService';
import { formatTime } from '../utils/formatters';
import squatImage from '@bryllim/workout-guide/assets/bodyweight-squat/frame-2.png';
import pushUpImage from '@bryllim/workout-guide/assets/push-up/frame-2.png';
import plankImage from '@bryllim/workout-guide/assets/plank/frame-2.png';
import lungeImage from '@bryllim/workout-guide/assets/forward-lunge/frame-2.png';
import sitUpImage from '@bryllim/workout-guide/assets/decline-sit-up/frame-2.png';
import legRaiseImage from '@bryllim/workout-guide/assets/lying-leg-raise/frame-2.png';
import './SessionSummaryPage.css';

const exerciseImages = {
  squat: squatImage,
  'push-up': pushUpImage,
  pushup: pushUpImage,
  plank: plankImage,
  lunge: lungeImage,
  'leg-raise': legRaiseImage,
  legraise: legRaiseImage,
  // Retained only so existing saved Sit-up sessions keep their historical illustration.
  'sit-up': sitUpImage,
  situp: sitUpImage,
};

function resolveSessionResult(incomingResult) {
  const storedResult = readLatestSessionResult();
  if (!incomingResult) return storedResult;

  const normalizedIncoming = createSessionResult(incomingResult);
  const cachedFeedback = readSessionFeedback(normalizedIncoming.id);
  if (
    !normalizedIncoming.feedback
    && (cachedFeedback || (storedResult?.id === normalizedIncoming.id && storedResult.feedback))
  ) {
    return {
      ...normalizedIncoming,
      feedback: cachedFeedback || storedResult.feedback,
    };
  }
  return normalizedIncoming;
}

function getStoredUserName() {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || {};
    return user.first_name || user.username || 'Athlete';
  } catch {
    return 'Athlete';
  }
}

function formatCompletedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: 'Today', time: '' };
  return {
    date: new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date),
  };
}

function resultLabel(accuracy) {
  if (accuracy >= 80) return { label: 'Good', tone: 'good' };
  if (accuracy >= 60) return { label: 'Fair', tone: 'fair' };
  return { label: 'Needs Work', tone: 'needs-work' };
}

function SummaryMetric({ icon, value, label, detail, secondaryDetail, tone = '' }) {
  return (
    <div className={`summary-metric${tone ? ` summary-metric--${tone}` : ''}`}>
      <span className="summary-metric__icon" aria-hidden="true">
        <i className={`fa-solid ${icon}`} />
      </span>
      <div className="summary-metric__content">
        <strong>{value}</strong>
        <span>{label}</span>
        {detail && <small>{detail}</small>}
        {secondaryDetail && <small className="summary-metric__secondary">{secondaryDetail}</small>}
      </div>
    </div>
  );
}

function comparisonValue(value, suffix = '') {
  return value === null || value === undefined ? '—' : `${value}${suffix}`;
}

function comparisonRatio(completed, target, formatter = (value) => value) {
  if (completed === null || completed === undefined) return '—';
  const completedValue = formatter(completed);
  return target === null || target === undefined
    ? String(completedValue)
    : `${completedValue} / ${formatter(target)}`;
}

function ProgressComparisonCard({ comparison, loading, error, exerciseName }) {
  const difference = Number(comparison?.differencePercentagePoints || 0);
  const magnitude = Math.abs(difference);
  const status = comparison?.status || '';
  const differenceLabel = status === 'no_change'
    ? 'No change'
    : `${magnitude} percentage ${magnitude === 1 ? 'point' : 'points'}`;
  const current = comparison?.current;
  const previous = comparison?.previous;
  const isTimeBased = current?.metricType === 'time';
  const comparisonRows = current && previous
    ? isTimeBased
      ? [
          { label: 'Form Accuracy', current: comparisonValue(current.accuracy, '%'), previous: comparisonValue(previous.accuracy, '%') },
          { label: 'Target Hold', current: comparisonValue(current.target?.holdSecondsPerSet, ' sec'), previous: comparisonValue(previous.target?.holdSecondsPerSet, ' sec') },
          { label: 'Target Sets', current: comparisonValue(current.target?.sets), previous: comparisonValue(previous.target?.sets) },
          { label: 'Actual Hold', current: comparisonRatio(current.completed?.holdTime, current.target?.totalHoldTime, formatTime), previous: comparisonRatio(previous.completed?.holdTime, previous.target?.totalHoldTime, formatTime) },
          { label: 'Completed Sets', current: comparisonRatio(current.completed?.sets, current.target?.sets), previous: comparisonRatio(previous.completed?.sets, previous.target?.sets) },
        ]
      : [
          { label: 'Form Accuracy', current: comparisonValue(current.accuracy, '%'), previous: comparisonValue(previous.accuracy, '%') },
          { label: 'Target Reps', current: comparisonValue(current.target?.repsPerSet), previous: comparisonValue(previous.target?.repsPerSet) },
          { label: 'Target Sets', current: comparisonValue(current.target?.sets), previous: comparisonValue(previous.target?.sets) },
          { label: 'Completed Reps', current: comparisonRatio(current.completed?.reps, current.target?.totalReps), previous: comparisonRatio(previous.completed?.reps, previous.target?.totalReps) },
          { label: 'Completed Sets', current: comparisonRatio(current.completed?.sets, current.target?.sets), previous: comparisonRatio(previous.completed?.sets, previous.target?.sets) },
        ]
    : [];

  return (
    <section className="session-summary-card session-progress">
      <h2><i className="fa-solid fa-chart-line" aria-hidden="true" />Progress Comparison</h2>

      {loading ? (
        <div className="session-progress__state session-progress__loading">
          <span aria-hidden="true" />
          <p>Comparing with your previous {exerciseName} session...</p>
        </div>
      ) : error || !comparison ? (
        <div className="session-progress__state session-progress__error">
          <i className="fa-solid fa-circle-info" aria-hidden="true" />
          <p>{error || 'Progress comparison is currently unavailable.'}</p>
        </div>
      ) : !comparison.hasPrevious ? (
        <div className="session-progress__first">
          <span aria-hidden="true"><i className="fa-solid fa-flag-checkered" /></span>
          <div>
            <strong>{comparison.title}</strong>
            <p>{comparison.message}</p>
          </div>
        </div>
      ) : (
        <div className="session-progress__content">
          <p className="session-progress__subtitle">{comparison.title}</p>
          <div className="session-progress__matrix" role="table" aria-label={`${exerciseName} session comparison`}>
            <div className="session-progress__matrix-row session-progress__matrix-header" role="row">
              <span role="columnheader">Metric</span>
              <span role="columnheader">Current</span>
              <span role="columnheader">Previous</span>
            </div>
            {comparisonRows.map((row) => (
              <div className="session-progress__matrix-row" role="row" key={row.label}>
                <span role="rowheader">{row.label}</span>
                <strong role="cell">{row.current}</strong>
                <strong role="cell">{row.previous}</strong>
              </div>
            ))}
          </div>
          <span className={`session-progress__configuration session-progress__configuration--${comparison.configurationStatus || 'configuration_unavailable'}`}>
            {comparison.configurationLabel || 'Workout Configuration Unavailable'}
          </span>
          <div
            className={`session-progress__difference session-progress__difference--${status}`}
            aria-label={status === 'no_change' ? 'No change' : `${status} by ${differenceLabel}`}
          >
            <span aria-hidden="true">
              <i className={`fa-solid ${status === 'no_change' ? 'fa-minus' : difference > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
            </span>
            <strong>{differenceLabel}</strong>
          </div>
          <p className="session-progress__message">{comparison.message}</p>
        </div>
      )}
    </section>
  );
}

export default function SessionSummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const incomingResult = location.state?.sessionResult;
  const incomingComparison = location.state?.comparison;
  const [sessionResult, setSessionResult] = useState(() => resolveSessionResult(incomingResult));
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [comparison, setComparison] = useState(() => incomingComparison || null);
  const [comparisonLoading, setComparisonLoading] = useState(Boolean(sessionResult && !incomingComparison));
  const [comparisonError, setComparisonError] = useState('');

  useEffect(() => {
    if (!incomingResult) return;
    const resolvedResult = resolveSessionResult(incomingResult);
    saveLatestSessionResult(resolvedResult);
    setSessionResult((current) => current?.id === resolvedResult.id ? current : resolvedResult);
  }, [incomingResult]);

  useEffect(() => {
    if (!sessionResult?.id || incomingComparison) return;

    let active = true;
    setComparisonLoading(true);
    setComparisonError('');

    saveSessionAndGetComparison(sessionResult)
      .then((progressComparison) => {
        if (active) setComparison(progressComparison);
      })
      .catch(() => {
        if (active) {
          setComparisonError('Your session was saved locally, but progress comparison is currently unavailable.');
        }
      })
      .finally(() => {
        if (active) setComparisonLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionResult, incomingComparison]);

  useEffect(() => {
    if (!sessionResult || sessionResult.feedback) return;

    let active = true;
    setFeedbackLoading(true);
    setFeedbackError('');

    fetchSessionCoachFeedback(sessionResult)
      .then((feedback) => {
        if (!active || !feedback) return;
        const updatedResult = { ...sessionResult, feedback };
        setSessionResult(updatedResult);
        updateStoredSessionFeedback(sessionResult.id, feedback);
      })
      .catch(() => {
        if (!active) return;
        setFeedbackError('Your session was completed successfully. AI generated form feedback is currently unavailable.');
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionResult]);

  if (!sessionResult) {
    return (
      <div className="session-summary-page">
        <Navbar activeItem="Exercises" />
        <main className="session-summary-empty">
          <span><i className="fa-solid fa-chart-simple" aria-hidden="true" /></span>
          <h1>No session summary available</h1>
          <p>Complete an exercise session to view its results here.</p>
          <button type="button" onClick={() => navigate('/exercises')}>Choose an Exercise</button>
        </main>
      </div>
    );
  }

  const isTimeBased = sessionResult.metricType === 'time';
  const exerciseId = sessionResult.exercise.id;
  const exerciseName = sessionResult.exercise.name;
  const exerciseImage = exerciseImages[exerciseId] || squatImage;
  const userName = getStoredUserName();
  const completed = sessionResult.status === 'completed';
  const completedAt = formatCompletedDate(sessionResult.completedAt);
  const totalSetsGoal = sessionResult.config?.totalSets || sessionResult.setResults.length || sessionResult.setsCompleted;
  const repsGoal = totalSetsGoal && sessionResult.config?.repsPerSet
    ? totalSetsGoal * sessionResult.config.repsPerSet
    : null;
  const holdGoal = sessionResult.config?.holdSecondsPerSet || sessionResult.config?.holdTime || null;
  const topIssue = sessionResult.formIssues[0];
  const overallResult = resultLabel(sessionResult.accuracy);

  const metrics = isTimeBased
    ? [
        {
          icon: 'fa-stopwatch',
          value: formatTime(sessionResult.totalHoldTime),
          label: 'Total Hold Time',
          detail: holdGoal ? `Goal: ${formatTime(holdGoal * totalSetsGoal)}` : 'Recorded hold time',
        },
        {
          icon: 'fa-clock',
          value: formatTime(sessionResult.duration),
          label: 'Session Duration',
          detail: 'Total workout time',
        },
        {
          icon: 'fa-layer-group',
          value: `${sessionResult.setsCompleted} / ${totalSetsGoal || sessionResult.setsCompleted}`,
          label: 'Sets Completed',
          detail: totalSetsGoal ? `Goal: ${totalSetsGoal} sets` : null,
        },
        {
          icon: 'fa-bullseye',
          value: `${sessionResult.accuracy}%`,
          label: 'Form Accuracy',
          detail: overallResult.label,
          tone: overallResult.tone,
        },
      ]
    : [
        {
          icon: 'fa-rotate',
          value: sessionResult.totalReps,
          label: 'Total Reps',
          detail: repsGoal ? `Goal: ${repsGoal} reps` : null,
          secondaryDetail: `${sessionResult.correctReps} correct / ${sessionResult.incorrectReps} incorrect`,
        },
        {
          icon: 'fa-clock',
          value: formatTime(sessionResult.duration),
          label: 'Total Time',
          detail: 'Session duration',
        },
        {
          icon: 'fa-layer-group',
          value: `${sessionResult.setsCompleted} / ${totalSetsGoal || sessionResult.setsCompleted}`,
          label: 'Sets Completed',
          detail: totalSetsGoal ? `Goal: ${totalSetsGoal} sets` : null,
        },
        {
          icon: 'fa-bullseye',
          value: `${sessionResult.accuracy}%`,
          label: 'Form Accuracy',
          detail: overallResult.label,
          tone: overallResult.tone,
        },
      ];

  return (
    <div className="session-summary-page">
      <Navbar activeItem="Exercises" />
      <main className="session-summary">
        <nav className="session-summary__breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate('/exercises')}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Exercises
          </button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <button type="button" onClick={() => navigate(`/exercises/${exerciseId}`)}>{exerciseName}</button>
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          <span>Summary</span>
        </nav>

        <section className="session-summary__top">
          <div className="session-summary__exercise-column">
            <div className="session-summary__exercise-image">
              <img src={exerciseImage} alt={`${exerciseName} exercise`} />
            </div>
          </div>

          <section className="session-summary-card session-overview">
            <h2>Performance Overview</h2>
            <div className="session-overview__metrics">
              {metrics.map((metric) => <SummaryMetric key={metric.label} {...metric} />)}
            </div>
          </section>
        </section>

        <section className="session-summary__middle">
          <div className="session-summary__celebration">
            <span className={`session-summary__status session-summary__status--${sessionResult.status}`}>
              <i className={`fa-regular ${completed ? 'fa-circle-check' : 'fa-circle-stop'}`} aria-hidden="true" />
              {completed ? 'Session Complete!' : 'Session Ended'}
            </span>
            <h1>{completed ? 'Great Job' : 'Nice Effort'}, {userName}!</h1>
            <p>
              {completed
                ? `You've completed your ${exerciseName} session.`
                : `Your ${exerciseName} session results are ready.`}
              <br />
              Keep it up and stay consistent!
            </p>
            <div className="session-summary__date">
              <span><i className="fa-regular fa-calendar" aria-hidden="true" />{completedAt.date}</span>
              {completedAt.time && <span><i className="fa-regular fa-clock" aria-hidden="true" />{completedAt.time}</span>}
            </div>
          </div>

          <section className="session-breakdown">
            <h2>Set Breakdown</h2>
            {sessionResult.setResults.length > 0 ? (
              <div className="session-breakdown__scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Set</th>
                      <th>{isTimeBased ? 'Hold Time (Goal)' : 'Reps (Goal)'}</th>
                      {!isTimeBased && <th>Invalid</th>}
                      <th>Accuracy</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionResult.setResults.map((set, index) => {
                      const attempts = (set.goodReps || 0) + (set.badReps || 0);
                      const setAccuracy = Number.isFinite(Number(set.accuracy))
                        ? Math.round(Number(set.accuracy))
                        : attempts > 0
                          ? Math.round(((set.goodReps || 0) / attempts) * 100)
                          : sessionResult.accuracy;
                      const setResult = resultLabel(setAccuracy);
                      const achieved = isTimeBased
                        ? formatTime(set.holdTime ?? set.duration)
                        : (set.completedReps ?? set.goodReps ?? 0);
                      const goal = isTimeBased ? holdGoal : sessionResult.config?.repsPerSet;
                      return (
                        <tr key={set.setNum || index}>
                          <td>{set.setNum || index + 1}</td>
                          <td>{achieved}{goal ? ` / ${isTimeBased ? formatTime(goal) : goal}` : ''}</td>
                          {!isTimeBased && <td>{set.badReps || 0}</td>}
                          <td className={`session-breakdown__accuracy session-breakdown__accuracy--${setResult.tone}`}>{setAccuracy}%</td>
                          <td><span className={`session-breakdown__result session-breakdown__result--${setResult.tone}`}>{setResult.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="session-breakdown__empty">No set data was recorded for this session.</p>
            )}
          </section>
        </section>

        <div className="session-summary__lower-grid">
          <section className="session-summary-card session-feedback">
            <h2><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />Form Feedback</h2>
            <div className="session-feedback__panel">
              <span className="session-feedback__robot" aria-hidden="true"><i className="fa-solid fa-robot" /></span>
              <div className="session-feedback__body">
                {feedbackLoading ? (
                  <div className="session-feedback__loading">
                    <span />
                    <p>Generating your form feedback...</p>
                  </div>
                ) : sessionResult.feedback ? (
                  <p className="session-feedback__paragraph">{sessionResult.feedback.feedbackParagraph}</p>
                ) : (
                  <div className="session-feedback__unavailable">
                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                    <p>{feedbackError || 'Your session was completed successfully. AI generated form feedback is currently unavailable.'}</p>
                  </div>
                )}

                <div className="session-feedback__issue">
                  <strong>Most Detected Issue</strong>
                  <p>
                    {topIssue
                      ? <>{topIssue.type} <span>· {topIssue.count} {topIssue.count === 1 ? 'occurrence' : 'occurrences'}</span></>
                      : 'No significant form issues detected'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <ProgressComparisonCard
            comparison={comparison}
            loading={comparisonLoading}
            error={comparisonError}
            exerciseName={exerciseName}
          />
        </div>

        <button className="session-summary__dashboard-button" type="button" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>

        <p className="session-summary__artwork-credit">
          Exercise artwork by{' '}
          <a href="https://bryllim.com" target="_blank" rel="noreferrer">Bryl Lim</a>
          {' '}and{' '}
          <a href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">Everkinetic</a>,
          {' '}licensed under{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
        </p>
      </main>
    </div>
  );
}
