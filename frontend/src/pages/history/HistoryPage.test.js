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

test('renders real all-time metrics, the workout table, and static future controls', async () => {
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
  expect(screen.getByRole('button', { name: 'By Plan' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'By Exercise' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'View Summary' })).toHaveAttribute('href', '/history/session/squat-1');
  expect(screen.queryByText('Recent Achievements')).not.toBeInTheDocument();
  expect(screen.queryByText('Consistency is progress!')).not.toBeInTheDocument();
});

test('searches by exercise name and uses the actual page count', async () => {
  renderHistory();
  expect((await screen.findAllByText('Squat')).length).toBeGreaterThan(0);

  fireEvent.change(screen.getByPlaceholderText('Search workouts...'), { target: { value: 'PLANK' } });
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'PLANK' })));

  fireEvent.click(screen.getByRole('button', { name: '2' }));
  await waitFor(() => expect(getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, search: 'PLANK' })));
});
