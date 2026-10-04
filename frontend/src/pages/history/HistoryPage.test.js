import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryPage from './HistoryPage';
import { getExerciseHistory, getExerciseHistoryOverview, getHistory } from '../../services/historyService';

let mockExerciseId;
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  useNavigate: () => mockNavigate,
  useParams: () => ({ exerciseId: mockExerciseId }),
  Link: ({ to, state, children, ...props }) => <a href={to} data-back-to={state?.backTo} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../components/Navbar', () => ({ activeItem }) => <div data-testid="navbar">{activeItem}</div>);
jest.mock('../../services/historyService', () => ({
  getHistory: jest.fn(),
  getExerciseHistoryOverview: jest.fn(),
  getExerciseHistory: jest.fn(),
}));

const historyData = {
  stats: {
    totalWorkouts: 8,
    totalDuration: 5020,
    workoutPlansCompleted: 2,
    averageAccuracy: 91.5,
    bestStreak: 7,
  },
  sessions: {
    items: [{
      id: 'squat-1',
      exercise: 'squat',
      exerciseName: 'Squat',
      metricType: 'reps',
      completedAt: '2026-09-10T10:32:00Z',
      duration: 680,
      setsCompleted: 3,
      accuracy: 94,
      planName: 'Beginner Full Body',
      configuration: { totalSets: 3, repsPerSet: 10 },
    }],
    page: 1,
    pageSize: 6,
    totalItems: 8,
    totalPages: 2,
  },
  activityOverview: [{ date: '2026-09-10', count: 1 }],
  topExercises: [{ exercise: 'squat', name: 'Squat', sessions: 8 }],
  achievements: {
    longestWorkout: { duration: 680, completedAt: '2026-09-10T10:32:00Z' },
    bestAccuracy: { accuracy: 94, completedAt: '2026-09-10T10:32:00Z' },
    bestStreak: { days: 7 },
  },
  planHistory: [{
    id: 'beginner-full-body',
    instanceId: 41,
    name: 'Beginner Full Body',
    status: 'active',
    activeWeek: 2,
    durationWeeks: 4,
    completedWorkouts: 5,
    totalWorkouts: 12,
    percentage: 42,
    startDate: '2026-09-07',
    completedAt: null,
    lastActivityAt: '2026-09-14T09:00:00Z',
  }],
};

const exerciseOverview = [
  { exercise: 'squat', name: 'Squat', metricType: 'reps', sessions: 2, averageAccuracy: 92, totalReps: 60, totalHoldTime: null, lastPerformed: '2026-09-28T10:00:00Z' },
  { exercise: 'push-up', name: 'Push-up', metricType: 'reps', sessions: 1, averageAccuracy: 90, totalReps: 24, totalHoldTime: null, lastPerformed: '2026-09-27T10:00:00Z' },
  { exercise: 'plank', name: 'Plank', metricType: 'time', sessions: 1, averageAccuracy: 95, totalReps: null, totalHoldTime: 80, lastPerformed: '2026-09-26T10:00:00Z' },
  { exercise: 'lunge', name: 'Lunge', metricType: 'reps', sessions: 0, averageAccuracy: null, totalReps: 0, totalHoldTime: null, lastPerformed: null },
  { exercise: 'leg-raise', name: 'Leg Raise', metricType: 'reps', sessions: 0, averageAccuracy: null, totalReps: 0, totalHoldTime: null, lastPerformed: null },
];

const squatDetail = {
  exercise: 'squat',
  name: 'Squat',
  metricType: 'reps',
  stats: { totalSessions: 2, averageAccuracy: 92, bestAccuracy: 94, totalDuration: 800, totalReps: 60, totalHoldTime: null },
  analytics: {
    accuracyTrend: [
      { completedAt: '2026-09-20T10:00:00Z', accuracy: 90 },
      { completedAt: '2026-09-28T10:32:00Z', accuracy: 94 },
    ],
    workoutFrequency: [
      { key: '2026-06', label: 'Jun', days: [0, 0, 0, 0, 0, 0, 0] },
      { key: '2026-07', label: 'Jul', days: [0, 1, 0, 0, 0, 0, 0] },
      { key: '2026-08', label: 'Aug', days: [0, 0, 1, 0, 0, 0, 0] },
      { key: '2026-09', label: 'Sep', days: [1, 0, 0, 0, 0, 0, 0] },
    ],
    personalBests: {
      accuracy: { value: 94, completedAt: '2026-09-28T10:32:00Z' },
      volume: { value: 30, completedAt: '2026-09-28T10:32:00Z' },
      duration: { value: 680, completedAt: '2026-09-28T10:32:00Z' },
    },
    accuracyChange: 4,
  },
  sessions: {
    items: [{ id: 'squat-detail-1', exercise: 'squat', exerciseName: 'Squat', metricType: 'reps', completedAt: '2026-09-28T10:32:00Z', duration: 680, setsCompleted: 3, accuracy: 94, totalReps: 30, totalHoldTime: null }],
    page: 1,
    pageSize: 6,
    totalItems: 2,
    totalPages: 1,
  },
};

beforeEach(() => {
  mockExerciseId = undefined;
  mockNavigate.mockReset();
  getHistory.mockReset();
  getExerciseHistoryOverview.mockReset();
  getExerciseHistory.mockReset();
  getHistory.mockImplementation(({ page = 1 }) => Promise.resolve({
    ...historyData,
    sessions: { ...historyData.sessions, page },
  }));
  getExerciseHistoryOverview.mockResolvedValue(exerciseOverview);
  getExerciseHistory.mockResolvedValue(squatDetail);
});

function renderHistory() {
  return render(<HistoryPage />);
}

test('renders real all-time metrics, the workout table, and the available history controls', async () => {
  renderHistory();

  expect(await screen.findByText('8', { selector: '.history-stat-card strong' })).toBeInTheDocument();
  expect(screen.getByTestId('navbar')).toHaveTextContent('History');
  expect(screen.getByText('1h 23m')).toBeInTheDocument();
  expect(screen.getByText('91.5%')).toBeInTheDocument();
  expect(screen.getByText('3 sets × 10 reps')).toBeInTheDocument();
  expect(screen.getAllByText('11:20 min')).toHaveLength(2);

  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
    'Date & Time', 'Exercise', 'Plan', 'Duration', 'Accuracy', 'Result', 'Action',
  ]);
  expect(screen.getByRole('button', { name: 'By Plan' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'By Exercise' })).toBeEnabled();
  expect(screen.getByRole('link', { name: 'View Summary' })).toHaveAttribute('href', '/history/session/squat-1');
  expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
  expect(screen.getByText('Longest Workout')).toBeInTheDocument();
  expect(screen.queryByText('Consistency is progress!')).not.toBeInTheDocument();
});

test('shows real plan instances without turning By Plan into the workouts table', async () => {
  renderHistory();
  await screen.findByText('8', { selector: '.history-stat-card strong' });

  fireEvent.click(screen.getByRole('button', { name: 'By Plan' }));

  expect(screen.getByRole('heading', { name: 'Workout Plan History' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
  expect(screen.getByText('5 / 12 Workouts Completed')).toBeInTheDocument();
  expect(screen.getByText('42%')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /View History/ })).toHaveAttribute('href', '/history/plan/41');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('searches by exercise name and uses the actual page count', async () => {
  renderHistory();
  expect((await screen.findAllByText('Squat')).length).toBeGreaterThan(0);

  fireEvent.change(screen.getByPlaceholderText('Search workouts or exercises...'), { target: { value: 'PLANK' } });
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'PLANK' })));

  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, search: 'PLANK' })));
});

test('opens By Exercise and renders the prototype master-detail exercise dashboard', async () => {
  renderHistory();
  await screen.findByText('8', { selector: '.history-stat-card strong' });

  fireEvent.click(screen.getByRole('button', { name: 'By Exercise' }));

  expect(await screen.findByRole('heading', { name: 'Exercises' })).toBeInTheDocument();
  expect(getExerciseHistoryOverview).toHaveBeenCalledWith(expect.any(AbortSignal));
  expect(getExerciseHistory).toHaveBeenCalledWith('squat', { page: 1, signal: expect.any(AbortSignal) });
  expect(screen.getByRole('button', { name: /Squat.*2 sessions/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /Push-up.*1 session/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Form Accuracy Trend' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Workout Frequency' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Personal Bests' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /View Form Guide/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Start Squat/i })).not.toBeInTheDocument();
  expect(screen.queryByText('Sit-up')).not.toBeInTheDocument();
});

test('renders one exercise lifetime summary and links exact sessions to the existing summary', async () => {
  mockExerciseId = 'squat';
  renderHistory();

  expect(await screen.findByRole('heading', { name: 'Squat' })).toBeInTheDocument();
  expect(getExerciseHistory).toHaveBeenCalledWith('squat', { page: 1, signal: expect.any(AbortSignal) });
  expect(screen.getByText('60 reps')).toBeInTheDocument();
  expect(screen.getByText('94%', { selector: '.history-personal-bests strong' })).toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
    'Date & Time', 'Sets × Target', 'Duration', 'Form Accuracy', 'Result', 'Action',
  ]);
  expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/history/session/squat-detail-1');
  expect(screen.queryByRole('link', { name: 'Back to By Exercise' })).not.toBeInTheDocument();
});
