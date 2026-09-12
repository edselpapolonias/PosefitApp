import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getHistorySession } from '../../services/historyService';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';
import './HistorySessionSummaryPage.css';

const exerciseIcons = {
  squat: squatIcon,
  'push-up': pushUpIcon,
  plank: plankIcon,
  lunge: lungeIcon,
  'leg-raise': legRaiseIcon,
};

function validNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(...values) {
  for (const value of values) {
    const parsed = validNumber(value);
    if (parsed !== null && parsed > 0) return parsed;
  }
  return null;
}

function formatClock(value) {
  const total = Math.max(0, Math.round(validNumber(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours ? `${hours}:${clock}` : clock;
}

function formatMeasure(value) {
  const seconds = validNumber(value);
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes} min`;
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

function resultLabel(value) {
  const accuracy = validNumber(value);
  if (accuracy === null) return null;
  if (accuracy >= 80) return { label: 'Good', tone: 'good', accuracy };
  if (accuracy >= 60) return { label: 'Fair', tone: 'fair', accuracy };
  return { label: 'Needs Work', tone: 'needs-work', accuracy };
}

function sessionPresentation(session) {
  const configuration = session.configuration || {};
  const setResults = Array.isArray(session.setResults) ? session.setResults : [];
  const requiredSets = positiveNumber(
    configuration.totalSets,
    configuration.targetSets,
    configuration.sets,
    setResults.length,
    session.setsCompleted,
  );
  const repsPerSet = positiveNumber(configuration.repsPerSet, configuration.targetReps, configuration.reps);
  const holdPerSet = positiveNumber(configuration.holdSecondsPerSet, configuration.holdTime, configuration.targetHoldTime);
  const perLeg = Boolean(configuration.perLeg);
  const isTimeBased = session.metricType === 'time';
  const configurationLabel = isTimeBased
    ? [requiredSets ? `${requiredSets} ${requiredSets === 1 ? 'set' : 'sets'}` : '', holdPerSet ? `${holdPerSet} sec hold` : ''].filter(Boolean).join(' × ')
    : [requiredSets ? `${requiredSets} ${requiredSets === 1 ? 'set' : 'sets'}` : '', repsPerSet ? `${repsPerSet} reps${perLeg ? ' each leg' : ''}` : ''].filter(Boolean).join(' × ');
  let goal;
  if (isTimeBased && holdPerSet && requiredSets) goal = `${formatMeasure(holdPerSet * requiredSets)} total`;
  else if (isTimeBased && holdPerSet) goal = `${formatMeasure(holdPerSet)} per set`;
  else if (repsPerSet && requiredSets && !perLeg) goal = `${repsPerSet * requiredSets} reps`;
  else if (repsPerSet && perLeg) goal = `${repsPerSet} reps each leg${requiredSets ? ` × ${requiredSets} sets` : ''}`;

  return {
    configuration,
    setResults,
    requiredSets,
    repsPerSet,
    holdPerSet,
    perLeg,
    isTimeBased,
    configurationLabel: configurationLabel || 'Completed workout',
    goal,
  };
}

function SummaryMetric({ icon, value, label, detail, result }) {
  return (
    <div className="history-session-metric">
      <span aria-hidden="true"><i className={`fa-solid ${icon}`} /></span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {result ? <small className={`history-session-result history-session-result--${result.tone}`}>{result.label}</small> : <small>{detail}</small>}
      </div>
    </div>
  );
}

function FeedbackSummary({ session }) {
  const issues = Array.isArray(session.formIssues) ? session.formIssues : [];
  const feedback = session.feedback && typeof session.feedback === 'object' ? session.feedback : null;
  const paragraph = typeof feedback?.feedbackParagraph === 'string' ? feedback.feedbackParagraph.trim() : '';
  const issueFeedback = Array.isArray(feedback?.issueFeedback) ? feedback.issueFeedback : [];
  const issueAdvice = (issue) => {
    const saved = issueFeedback.find((item) => item?.issueId === issue.issueId);
    return saved?.advice || issue.advice || '';
  };

  return (
    <section className="history-feedback-card history-session-card">
      <header><span aria-hidden="true"><i className="fa-solid fa-message" /></span><div><h2>Feedback Summary</h2><p>Saved feedback from this session</p></div></header>
      <div className="history-feedback-card__body">
        {paragraph ? <p className="history-feedback-card__summary">{paragraph}</p> : issues.length ? (
          <p className="history-feedback-card__summary history-feedback-card__summary--neutral">Saved coaching feedback is unavailable for this session.</p>
        ) : (
          <div className="history-feedback-positive"><i className="fa-regular fa-circle-check" aria-hidden="true" /><div><strong>Great form!</strong><p>No significant form issues were detected during this session.</p></div></div>
        )}
        {issues.length > 0 && (
          <div className="history-feedback-issues">
            <h3>Detected form issues</h3>
            <ul>{issues.map((issue, index) => (
              <li key={issue.issueId || `${issue.label}-${index}`}>
                <span aria-hidden="true"><i className="fa-solid fa-circle-exclamation" /></span>
                <div>
                  <strong>{issue.label || issue.type || 'Recorded form issue'}</strong>
                  {issueAdvice(issue) && <p>{issueAdvice(issue)}</p>}
                  {validNumber(issue.count) !== null && <small>{issue.count} {Number(issue.count) === 1 ? 'occurrence' : 'occurrences'}</small>}
                </div>
              </li>
            ))}</ul>
          </div>
        )}
      </div>
    </section>
  );
}

function SetBreakdown({ session, presentation }) {
  const setValue = (set) => {
    if (presentation.isTimeBased) {
      const achieved = validNumber(set.holdTime ?? set.completed ?? set.duration);
      const goal = presentation.holdPerSet;
      return `${formatMeasure(achieved)}${goal ? ` / ${formatMeasure(goal)}` : ''}`;
    }
    if (presentation.perLeg) {
      const left = validNumber(set.perLegReps?.left);
      const right = validNumber(set.perLegReps?.right);
      const achieved = left !== null || right !== null
        ? `${left ?? '—'} left / ${right ?? '—'} right`
        : `${validNumber(set.completedReps ?? set.goodReps) ?? '—'} reps`;
      return `${achieved}${presentation.repsPerSet ? ` (Goal: ${presentation.repsPerSet} each)` : ''}`;
    }
    const achieved = validNumber(set.completedReps ?? set.goodReps);
    return `${achieved ?? '—'}${presentation.repsPerSet ? ` / ${presentation.repsPerSet}` : ''}`;
  };

  return (
    <section className="history-breakdown-card history-session-card">
      <header><h2>Set Breakdown</h2><p>Saved results by set</p></header>
      {presentation.setResults.length ? (
        <div className="history-breakdown-scroll">
          <table>
            <thead><tr><th>Set</th><th>{presentation.isTimeBased ? 'Time (Goal)' : 'Reps (Goal)'}</th><th>Accuracy</th><th>Result</th></tr></thead>
            <tbody>{presentation.setResults.map((set, index) => {
              const result = resultLabel(set.accuracy);
              return (
                <tr key={set.setNum || index}>
                  <td>{set.setNum || index + 1}</td>
                  <td>{setValue(set)}</td>
                  <td className={result ? `is-${result.tone}` : ''}>{result ? `${result.accuracy}%` : '—'}</td>
                  <td>{result ? <span className={`history-breakdown-result history-breakdown-result--${result.tone}`}>{result.label}</span> : <span className="history-breakdown-result history-breakdown-result--neutral">No data</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : <div className="history-breakdown-empty"><i className="fa-solid fa-layer-group" aria-hidden="true" /><p>No set data was recorded for this session.</p></div>}
    </section>
  );
}

export default function HistorySessionSummaryPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getHistorySession(sessionId, controller.signal)
      .then((result) => {
        if (!result) throw new Error('Session unavailable');
        setSession(result);
      })
      .catch((failure) => {
        if (failure.code !== 'ERR_CANCELED') {
          setError(failure.response?.status === 404
            ? 'This completed workout session could not be found.'
            : 'We couldn’t load this workout summary. Please try again.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sessionId]);

  const backState = location.state?.history ? { history: location.state.history } : undefined;
  const presentation = useMemo(() => session ? sessionPresentation(session) : null, [session]);

  if (loading || error || !session) {
    return (
      <div className="history-session-page">
        <Navbar activeItem="History" />
        <main className="history-session-state">
          {loading ? <><span className="history-session-spinner" /><h1>Loading session summary…</h1><p>Retrieving the saved workout result.</p></> : <><span className="history-session-state__icon"><i className="fa-solid fa-file-circle-xmark" /></span><h1>Session summary unavailable</h1><p>{error}</p><Link to="/history" state={backState}>Back to History</Link></>}
        </main>
      </div>
    );
  }

  const icon = exerciseIcons[session.exercise];
  const completedAt = formatCompletedAt(session.completedAt);
  const overallResult = resultLabel(session.accuracy);
  const metrics = [
    presentation.isTimeBased
      ? { icon: 'fa-stopwatch', value: formatMeasure(session.totalHoldTime), label: 'Total Hold Time', detail: presentation.goal ? `Goal: ${presentation.goal}` : 'Saved hold time' }
      : { icon: 'fa-rotate', value: validNumber(session.totalReps) ?? '—', label: 'Total Reps', detail: presentation.goal ? `Goal: ${presentation.goal}` : 'Saved repetition total' },
    { icon: 'fa-clock', value: formatClock(session.duration), label: 'Total Time', detail: 'Session duration' },
    { icon: 'fa-layer-group', value: `${session.setsCompleted} / ${presentation.requiredSets || session.setsCompleted}`, label: 'Sets Completed', detail: `Goal: ${presentation.requiredSets || session.setsCompleted} sets` },
    { icon: 'fa-bullseye', value: overallResult ? `${overallResult.accuracy}%` : '—', label: 'Form Accuracy', detail: 'No accuracy data', result: overallResult },
  ];

  return (
    <div className="history-session-page">
      <Navbar activeItem="History" />
      <main className="history-session-main">
        <Link className="history-session-back" to="/history" state={backState}><i className="fa-solid fa-arrow-left" aria-hidden="true" />Back to History</Link>

        <header className="history-session-header">
          <div><h1>Session Summary</h1><p>Here’s a summary of your completed workout session.</p></div>
          <section className="history-session-info" aria-label="Session information">
            <div><i className="fa-regular fa-calendar" aria-hidden="true" /><strong>{completedAt.date}{completedAt.time ? ` · ${completedAt.time}` : ''}</strong></div>
            <div><span><img src={icon} alt="" /></span><strong>{session.exerciseName}</strong></div>
          </section>
        </header>

        <section className="history-session-overview">
          <div className="history-session-exercise">
            <span><img src={icon} alt="" /></span>
            <div><h2>{session.exerciseName}</h2><p>{presentation.configurationLabel}</p><small><i className="fa-solid fa-check" aria-hidden="true" />Completed</small></div>
          </div>
          <div className="history-session-metrics">{metrics.map((metric) => <SummaryMetric key={metric.label} {...metric} />)}</div>
        </section>

        <div className="history-session-middle">
          <FeedbackSummary session={session} />
          <SetBreakdown session={session} presentation={presentation} />
        </div>

        <div className="history-session-actions"><Link to="/history" state={backState}>Back to History</Link></div>
      </main>
    </div>
  );
}
