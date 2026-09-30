import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlanHistoryPage from './PlanHistoryPage';
import { getPlanHistory } from '../../services/historyService';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => ({ planInstanceId: '41' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('../../components/Navbar', () => ({ activeItem }) => <div data-testid="navbar">{activeItem}</div>);
jest.mock('../../services/historyService', () => ({ getPlanHistory: jest.fn() }));
jest.mock('axios', () => ({ post: jest.fn(() => Promise.resolve({ data: {} })), get: jest.fn() }));

const partialPlan = {
  id: 'beginner-full-body',
  instanceId: 41,
  name: 'Beginner Full Body',
  status: 'active',
  startDate: '2026-09-14',
  completedAt: null,
  durationWeeks: 4,
  totalWorkouts: 12,
  completedWorkouts: 0,
  percentage: 0,
  activeWeek: 1,
  completedWorkoutIds: [],
  schedule: [{ id: 'week-1-monday', week: 1, day: 'Monday', date: '2026-09-14' }],
  daySessions: [{
    id: 'plan-41-week-1-monday',
    planInstanceId: 41,
    workoutId: 'week-1-monday',
    week: 1,
    workoutDay: 'Monday',
    scheduledDate: '2026-09-14',
    currentExerciseIndex: 1,
    status: 'active',
    startedAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-14T09:00:00Z',
    exercises: [
      {
        exerciseId: 'squat', name: 'Squat', metricType: 'reps', setsRequired: 3,
        repsPerSet: 10, restSeconds: 60, completedSets: 2,
        results: [{ setNumber: 1 }, { setNumber: 2 }],
      },
      {
        exerciseId: 'push-up', name: 'Push-up', metricType: 'reps', setsRequired: 3,
        repsPerSet: 8, restSeconds: 60, completedSets: 1,
        results: [{ setNumber: 1 }],
      },
      {
        exerciseId: 'plank', name: 'Plank', metricType: 'time', setsRequired: 3,
        durationPerSet: 20, restSeconds: 60, completedSets: 1,
        results: [{ setNumber: 1 }],
      },
    ],
  }],
};

beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  getPlanHistory.mockReset();
  getPlanHistory.mockResolvedValue(partialPlan);
});

test('renders persisted partial set progress and continues at the exact next circuit step', async () => {
  render(<PlanHistoryPage />);

  expect(await screen.findByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
  expect(screen.getByTestId('navbar')).toHaveTextContent('History');
  expect(screen.getByText('2 / 3 sets completed')).toBeInTheDocument();
  expect(screen.getAllByText('1 / 3 sets completed')).toHaveLength(2);
  expect(screen.getByText('4 / 9 prescribed sets completed')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Continue Workout/ }));

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
    expect.objectContaining({ pathname: '/exercises/push-up/start' }),
    expect.objectContaining({
      state: expect.objectContaining({
        workoutContext: expect.objectContaining({
          planInstanceId: 41,
          workoutId: 'week-1-monday',
          currentExercise: 'push-up',
          currentSet: 2,
          currentRound: 2,
        }),
      }),
    }),
  ));
});
