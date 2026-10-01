import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressPage from './ProgressPage';
import { getProgress } from '../../services/progressService';

jest.mock('../../components/Navbar', () => ({ activeItem }) => <div data-testid="navbar">{activeItem}</div>);
jest.mock('../../services/progressService', () => ({ getProgress: jest.fn() }));
jest.mock('react-router-dom', () => ({
  Link: ({ to, state, children, ...props }) => <a href={to} data-back-to={state?.backTo} {...props}>{children}</a>,
}), { virtual: true });
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart" />,
  Bar: () => <div data-testid="bar-chart" />,
  Doughnut: () => <div data-testid="doughnut-chart" />,
}));

function response(range = '30d') {
  return {
    range,
    stats: { averageAccuracy: 91, activeDays: 2, dayCount: range === '7d' ? 7 : 30, sessions: 3, totalDuration: 900, totalReps: 45, consistencyPercentage: 7 },
    comparison: range === 'all' ? null : {
      periodDays: range === '7d' ? 7 : 30,
      averageAccuracy: { delta: 4, direction: 'up', previous: 87 },
      activeDays: { delta: 1, direction: 'up', previous: 1 },
      sessions: { delta: 1, direction: 'up', previous: 2 },
      totalDuration: { delta: 300, direction: 'up', previous: 600 },
      totalReps: { delta: 15, direction: 'up', previous: 30 },
    },
    charts: {
      interval: 'day',
      accuracy: [{ date: '2026-09-30', label: 'Sep 30', value: 91 }],
      workoutTime: [{ date: '2026-09-30', label: 'Sep 30', seconds: 900 }],
    },
    consistency: { activeDays: 2, dayCount: 30, percentage: 7, longestStreak: 2, days: [{ date: '2026-09-30', status: 'completed' }] },
    highlights: {
      bestAccuracy: { sessionId: 'best-session', completedAt: '2026-09-30T10:00:00Z', value: 96, unit: '%' },
      longestWorkout: { sessionId: 'long-session', completedAt: '2026-09-29T10:00:00Z', value: 600, unit: 'seconds' },
      mostReps: { sessionId: 'rep-session', completedAt: '2026-09-28T10:00:00Z', value: 30, unit: 'reps' },
    },
    exercises: ['squat', 'push-up', 'plank', 'lunge', 'leg-raise'].map((exercise) => ({
      exercise,
      name: exercise === 'push-up' ? 'Push-up' : exercise === 'leg-raise' ? 'Leg Raise' : exercise[0].toUpperCase() + exercise.slice(1),
      averageAccuracy: 90,
      totalReps: exercise === 'plank' ? null : 10,
      totalHoldTime: exercise === 'plank' ? 60 : null,
      setsCompleted: 3,
      sessions: 1,
      trend: [{ date: '2026-09-30', value: 90 }],
    })),
    accuracyDistribution: { total: 3, categories: [
      { key: 'good', label: 'Good', count: 2, color: '#28b463' },
      { key: 'fair', label: 'Fair', count: 1, color: '#f5a623' },
      { key: 'needs-work', label: 'Needs Work', count: 0, color: '#ef5b5b' },
    ] },
    banner: { tone: 'positive', title: "You're improving!", message: 'Accuracy improved using real comparison data.' },
  };
}

beforeEach(() => {
  getProgress.mockReset();
  getProgress.mockImplementation((range) => Promise.resolve(response(range)));
});

test('renders persisted progress data, all exercises, and exact highlight links', async () => {
  render(<ProgressPage />);

  expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument();
  expect(await screen.findByText('Leg Raise')).toBeInTheDocument();
  expect(getProgress).toHaveBeenCalledWith('30d', expect.any(AbortSignal));
  expect(screen.getByTestId('navbar')).toHaveTextContent('Progress');
  expect(screen.getByText((content, element) => element.tagName === 'STRONG' && element.textContent === '91%')).toBeInTheDocument();
  expect(screen.queryByText('Sit-up')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View Best Form Accuracy session summary' })).toHaveAttribute('href', '/history/session/best-session');
  expect(screen.getByRole('link', { name: 'View Longest Workout session summary' })).toHaveAttribute('href', '/history/session/long-session');
  expect(screen.getByRole('link', { name: 'View Most Reps in a Workout session summary' })).toHaveAttribute('href', '/history/session/rep-session');
  expect(screen.getAllByTestId('line-chart')).toHaveLength(1);
  expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
});

test('one range selector reloads the synchronized snapshot', async () => {
  render(<ProgressPage />);
  await screen.findByText('Leg Raise');

  fireEvent.click(screen.getByRole('button', { name: '7 Days' }));

  await waitFor(() => expect(getProgress).toHaveBeenLastCalledWith('7d', expect.any(AbortSignal)));
  expect(screen.getByRole('button', { name: '7 Days' })).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByText('2 / 7')).toBeInTheDocument();
});
