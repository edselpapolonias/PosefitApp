import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getPlanHistory } from '../../services/historyService';
import {
  hydrateWorkoutDaySession,
  startOrResumeWorkoutDay,
  workoutStepNavigation,
} from '../../services/workoutDaySessionService';
import { beginnerScheduleByWeek } from '../workout-plans/details/beginnerFullBodyData';
import { lowerBodyScheduleByWeek } from '../workout-plans/details/lowerBodyFocusData';
import { coreUpperScheduleByWeek } from '../workout-plans/details/coreUpperBodyData';
import squatIcon from '../../images/icon-squat.png';
import pushUpIcon from '../../images/icon-push-up.png';
import plankIcon from '../../images/icon-plank.png';
import lungeIcon from '../../images/icon-lunge.png';
import legRaiseIcon from '../../images/icon-leg-raise.png';
import './HistoryPage.css';
import './PlanHistoryPage.css';

const schedules = {
  'beginner-full-body': beginnerScheduleByWeek,
  'lower-body-focus': lowerBodyScheduleByWeek,
  'core-upper-body': coreUpperScheduleByWeek,
};

const exerciseIcons = {
  squat: squatIcon,
  'push-up': pushUpIcon,
  plank: plankIcon,
  lunge: lungeIcon,
  'leg-raise': legRaiseIcon,
};

function dateValue(value) {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, includeYear = true) {
  const date = dateValue(value);
  if (!date) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

function definitionWorkout(planId, workoutId) {
  return Object.values(schedules[planId] || {}).flat().find((workout) => workout.id === workoutId);
}

function fallbackWorkout(scheduleItem, session) {
  return {
    ...scheduleItem,
    label: `DAY ${(scheduleItem.week - 1) * 3 + 1}`,
    exercises: (session?.exercises || []).map((exercise) => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      type: exercise.metricType === 'time' ? 'duration' : 'reps',
      sets: exercise.setsRequired,
      reps: exercise.repsPerSet,
      holdTime: exercise.durationPerSet,
      restTime: exercise.restSeconds,
      perLeg: exercise.perLeg,
    })),
  };
}

function buildWeeks(plan) {
  const sessionsByWorkout = Object.fromEntries((plan.daySessions || []).map((session) => [session.workoutId, session]));
  const completedIds = new Set(plan.completedWorkoutIds || []);
  const firstIncomplete = (plan.schedule || []).find((workout) => !completedIds.has(workout.id));
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return Array.from({ length: plan.durationWeeks || 4 }, (_, index) => {
    const week = index + 1;
    return {
      week,
      workouts: (plan.schedule || []).filter((item) => item.week === week).map((item) => {
        const session = sessionsByWorkout[item.id];
        const definition = definitionWorkout(plan.id, item.id);
        const workout = {
          ...(definition || fallbackWorkout(item, session)),
          ...item,
          date: item.date,
          scheduledDate: item.date,
        };
        let status = 'upcoming';
        if (completedIds.has(item.id) || session?.status === 'completed') status = 'completed';
        else if (session?.status === 'active') status = 'in-progress';
        else if (
          plan.status === 'active'
          && firstIncomplete?.id === item.id
          && dateValue(item.date)
          && dateValue(item.date) <= today
        ) status = 'available';
        return { ...workout, session, status };
      }),
    };
  });
}

function displayExercises(workout) {
  if (workout.session?.exercises?.length) return workout.session.exercises;
  return (workout.exercises || []).map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    metricType: exercise.type === 'duration' ? 'time' : 'reps',
    setsRequired: exercise.sets,
    repsPerSet: exercise.reps,
    durationPerSet: exercise.holdTime,
    perLeg: exercise.perLeg,
    completedSets: 0,
    results: [],
  }));
}

function averageAccuracy(results) {
  const values = (results || []).map((result) => Number(result.accuracy)).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function ExerciseProgress({ exercise, dayCompleted, plan }) {
  const completed = Number(exercise.completedSets) || 0;
  const required = Number(exercise.setsRequired) || 0;
  const exerciseCompleted = required > 0 && completed >= required;
  const accuracy = averageAccuracy(exercise.results);
  const summaryId = exercise.results?.[exercise.results.length - 1]?.sessionResultId;
  return (
    <div className={`plan-history-exercise${exerciseCompleted ? ' is-complete' : ''}`}>
      <span className="plan-history-exercise__icon"><img src={exerciseIcons[exercise.exerciseId]} alt="" /></span>
      <div className="plan-history-exercise__copy">
        <strong>{exercise.name}</strong>
        <span>{completed} / {required} sets completed</span>
      </div>
      {dayCompleted && accuracy !== null && <strong className="plan-history-exercise__accuracy">{accuracy}%</strong>}
      {exerciseCompleted && <span className="plan-history-exercise__complete"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Completed</span>}
      {dayCompleted && summaryId && (
        <Link
          className="plan-history-exercise__summary"
          to={`/history/session/${encodeURIComponent(summaryId)}`}
          state={{
            history: { tab: 'plans' },
            backTo: `/history/plan/${plan.instanceId}`,
            backLabel: 'Back to Plan History',
          }}
        >View Summary</Link>
      )}
    </div>
  );
}

function WorkoutDayCard({ workout, plan, onStart }) {
  const exercises = displayExercises(workout);
  const completedSets = exercises.reduce((sum, exercise) => sum + (Number(exercise.completedSets) || 0), 0);
  const requiredSets = exercises.reduce((sum, exercise) => sum + (Number(exercise.setsRequired) || 0), 0);
  const dayCompleted = workout.status === 'completed';
  const statusLabel = {
    completed: 'COMPLETED',
    'in-progress': 'IN PROGRESS',
    available: 'AVAILABLE',
    upcoming: 'UPCOMING',
  }[workout.status];

  return (
    <article className={`plan-history-day plan-history-day--${workout.status}`}>
      <header>
        <div><span>Week {workout.week}</span><h3>{workout.day}, {formatDate(workout.date, false)}</h3></div>
        <strong>{statusLabel}{dayCompleted && <i className="fa-solid fa-check" aria-hidden="true" />}</strong>
      </header>
      <div className="plan-history-day__exercises">
        {exercises.map((exercise) => (
          <ExerciseProgress key={exercise.exerciseId} exercise={exercise} dayCompleted={dayCompleted} plan={plan} />
        ))}
      </div>
      {(workout.status === 'in-progress' || dayCompleted) && (
        <div className="plan-history-day__total">
          <span>Workout Progress</span><strong>{completedSets} / {requiredSets} prescribed sets completed</strong>
        </div>
      )}
      {plan.status === 'active' && (workout.status === 'in-progress' || workout.status === 'available') && (
        <button className="plan-history-day__action" type="button" onClick={() => onStart(workout)}>
          <i className={`fa-solid ${workout.status === 'in-progress' ? 'fa-rotate-right' : 'fa-play'}`} aria-hidden="true" />
          {workout.status === 'in-progress' ? 'Continue Workout' : 'Start Workout'}
        </button>
      )}
    </article>
  );
}

export default function PlanHistoryPage() {
  const { planInstanceId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getPlanHistory(planInstanceId, controller.signal)
      .then((result) => setPlan(result))
      .catch((failure) => {
        if (failure.code !== 'ERR_CANCELED') setError('We could not load this Workout Plan history.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [planInstanceId]);

  const weeks = useMemo(() => plan ? buildWeeks(plan) : [], [plan]);

  const beginWorkout = (workout) => {
    const returnRoute = `/history/plan/${plan.instanceId}`;
    const session = workout.session
      ? hydrateWorkoutDaySession(plan, workout, workout.session, returnRoute)
      : startOrResumeWorkoutDay(plan, workout, returnRoute);
    const destination = workoutStepNavigation(session);
    if (!destination) return;
    navigate(
      { pathname: destination.pathname, search: destination.search },
      { state: destination.state },
    );
  };

  if (loading || error || !plan) {
    return (
      <div className="history-page plan-history-page">
        <Navbar activeItem="History" />
        <main className="plan-history-state">
          {loading ? <><span className="history-session-spinner" /><h1>Loading plan historyâ€¦</h1></> : <><i className="fa-solid fa-file-circle-xmark" /><h1>Plan history unavailable</h1><p>{error}</p></>}
          {!loading && <Link to="/history" state={{ history: { tab: 'plans' } }}>Back to By Plan</Link>}
        </main>
      </div>
    );
  }

  const completed = plan.status === 'completed';
  return (
    <div className="history-page plan-history-page">
      <Navbar activeItem="History" />
      <main className="plan-history-main">
        <Link className="plan-history-back" to="/history" state={{ history: { tab: 'plans' } }}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to By Plan
        </Link>

        <header className="plan-history-header">
          <div className="plan-history-header__title">
            <span>Workout Plan History</span>
            <div><h1>{plan.name}</h1><strong className={`history-plan-status history-plan-status--${plan.status}`}>{completed ? 'COMPLETED' : plan.status === 'ended' ? 'ENDED' : 'IN PROGRESS'}</strong></div>
            <p>Started {formatDate(plan.startDate)}{completed ? ` · Completed ${formatDate(plan.completedAt)}` : ''}</p>
          </div>
          <section className="plan-history-header__progress" aria-label="Plan progress">
            <div><span>{completed ? `${plan.durationWeeks} Weeks` : `Week ${plan.activeWeek} of ${plan.durationWeeks}`}</span><strong>{plan.percentage}% Complete</strong></div>
            <progress value={plan.completedWorkouts} max={plan.totalWorkouts} />
            <p>{plan.completedWorkouts} / {plan.totalWorkouts} Workouts Completed</p>
          </section>
        </header>

        <div className="plan-history-weeks">
          {weeks.map((week) => (
            <section className="plan-history-week" key={week.week}>
              <header><span>WEEK {week.week}</span><i /></header>
              <div>{week.workouts.map((workout) => <WorkoutDayCard key={workout.id} workout={workout} plan={plan} onStart={beginWorkout} />)}</div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
