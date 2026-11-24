import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SessionSummaryPage from './SessionSummaryPage';

let mockSession;
let mockWorkoutOutcome;
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { sessionResult: mockSession, comparison: {} } }),
}), { virtual: true });
jest.mock('../../components/Navbar', () => () => null);
jest.mock('../../services/workoutDaySessionService', () => ({
  recordWorkoutSetResult: () => mockWorkoutOutcome,
  workoutProgress: (session) => session?.exercises || [],
  finishWorkoutDay: jest.fn(),
}));

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  mockNavigate.mockClear();
  mockWorkoutOutcome = null;
  mockSession = { id: 'test', exercise: { id: 'squat', name: 'Squat' }, feedback: { feedbackParagraph: 'Session recorded.' },
    formIssues: { 'Not deep enough': 4, 'Uneven leg movement': 2, 'Hold for one second.': 1 } };
});

test('expands Performance Overview after removing the exercise image area', () => {
  mockSession = { ...mockSession, accuracy: 84, correctReps: 8, incorrectReps: 2, status: 'completed' };
  const { container } = render(<SessionSummaryPage />);
  const overview = screen.getByRole('heading', { name: 'Performance Overview' }).closest('section');
  expect(overview.parentElement).toHaveClass('session-summary__top');
  expect(container.querySelector('.session-summary__exercise-column')).not.toBeInTheDocument();
});

test('shows every issue once even when AI omits it or adds an unknown ID', () => {
  mockSession.feedback.issueFeedback = [{ issueId: 'invented', advice: 'Invented problem' }];
  render(<SessionSummaryPage />);
  const card = screen.getByRole('heading', { name: 'Form Feedback' }).closest('section');
  expect(within(card).getByText('Incomplete Squat Depth')).toBeInTheDocument();
  expect(within(card).getByText('Uneven Leg Movement')).toBeInTheDocument();
  expect(within(card).getByText('Bottom Hold Too Short')).toBeInTheDocument();
  expect(within(card).getByText('4 occurrences')).toBeInTheDocument();
  expect(within(card).queryByText('Invented problem')).not.toBeInTheDocument();
});

test('no issues produces a positive state', () => {
  mockSession.formIssues = [];
  render(<SessionSummaryPage />);
  expect(screen.getByText('Great form! No significant form issues were detected during this session.')).toBeInTheDocument();
});

test('a completed plan set shows circuit progress and navigates to the next exercise', () => {
  mockSession = {
    ...mockSession,
    status: 'completed',
    metricType: 'reps',
    correctReps: 10,
    incorrectReps: 0,
    totalReps: 10,
    setsCompleted: 1,
    setResults: [{ setNum: 1, goodReps: 10 }],
    config: { repsPerSet: 10, totalSets: 1 },
    workoutContext: {
      source: 'workout-plan', workoutSessionId: 'day-1', planName: 'Beginner Full Body',
      detailsRoute: '/workout-plans/beginner-full-body', week: 1, workoutLabel: 'DAY 1',
      currentExercise: 'squat', currentExerciseIndex: 0, currentSet: 1, totalSets: 3, currentRound: 1,
    },
  };
  mockWorkoutOutcome = {
    complete: false,
    session: { currentExerciseIndex: 1, exercises: [
      { exerciseId: 'squat', name: 'Squat', completedSets: 1, setsRequired: 3 },
      { exerciseId: 'push-up', name: 'Push-up', completedSets: 0, setsRequired: 3 },
    ] },
    next: {
      pathname: '/exercises/push-up/start', search: '?workoutSession=day-1',
      state: { workoutConfig: { sets: 1, reps: 8 } },
      workoutContext: { currentExercise: 'push-up', currentExerciseIndex: 1, target: { metricType: 'reps', reps: 8 } },
    },
  };
  render(<SessionSummaryPage />);
  const next = screen.getByRole('button', { name: /Next Exercise: Push-up/ });
  expect(screen.getByText('Squat · Set 1 of 3 · Round 1')).toBeInTheDocument();
  fireEvent.click(next);
  expect(mockNavigate).toHaveBeenCalledWith(
    { pathname: '/exercises/push-up/start', search: '?workoutSession=day-1' },
    { state: mockWorkoutOutcome.next.state },
  );
});

test('shows an each-leg Lunge target and both recorded leg counts', () => {
  mockSession = {
    ...mockSession,
    exercise: { id: 'lunge', name: 'Lunge' },
    status: 'completed',
    metricType: 'reps',
    correctReps: 16,
    incorrectReps: 0,
    totalReps: 16,
    setsCompleted: 1,
    setResults: [{ setNum: 1, goodReps: 16, perLegReps: { left: 8, right: 8 } }],
    config: { repsPerSet: 8, totalSets: 1, perLeg: true },
    analysis: { perLegCounts: { left: 8, right: 8 } },
    workoutContext: {
      source: 'workout-plan', workoutSessionId: 'lower-day-1', planName: 'Lower Body Focus',
      detailsRoute: '/workout-plans/lower-body-focus', week: 1, workoutLabel: 'DAY 1',
      currentExercise: 'lunge', currentExerciseIndex: 1, currentSet: 1, totalSets: 3,
      currentRound: 1, target: { metricType: 'reps', reps: 8, perLeg: true },
    },
  };

  render(<SessionSummaryPage />);

  expect(screen.getByText('Goal: 8 reps each leg')).toBeInTheDocument();
  expect(screen.getByText('8 left / 8 right (Goal: 8 each)')).toBeInTheDocument();
});
