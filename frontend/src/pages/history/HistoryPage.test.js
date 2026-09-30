import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import HistoryPage from './HistoryPage';
import { getHistory } from '../../services/historyService';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ state: null }),
  Link: ({ to, state, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../components/Navbar', () => ({ activeItem }) => <div data-testid="navbar">{activeItem}</div>);
jest.mock('../../services/historyService', () => ({ getHistory: jest.fn() }));

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
      configuration: { totalSets: 3, repsPerSet: 10 },
    }],
    page: 1,
    pageSize: 6,
    totalItems: 8,
    totalPages: 2,
  },
  activityOverview: [{ date: '2026-09-10', count: 1 }],
  topExercises: [{ exercise: 'squat', name: 'Squat', sessions: 8 }],
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

beforeEach(() => {
  getHistory.mockReset();
  getHistory.mockImplementation(({ page = 1 }) => Promise.resolve({
    ...historyData,
    sessions: { ...historyData.sessions, page },
  }));
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
  expect(screen.getByText('11:20 min')).toBeInTheDocument();

  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('columnheader').map((heading) => heading.textContent)).toEqual([
    'Date', 'Workout', 'Duration', 'Results', 'Action',
  ]);
  expect(screen.getByRole('button', { name: 'By Plan' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'By Exercise' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'View Summary' })).toHaveAttribute('href', '/history/session/squat-1');
  expect(screen.queryByText('Recent Achievements')).not.toBeInTheDocument();
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

  fireEvent.change(screen.getByPlaceholderText('Search workouts...'), { target: { value: 'PLANK' } });
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'PLANK' })));

  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, search: 'PLANK' })));
});
