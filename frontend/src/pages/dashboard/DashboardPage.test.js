import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from './DashboardPage';
import { getDashboard } from '../../services/dashboardService';

jest.mock('../../services/dashboardService');
jest.mock('../../components/Navbar', () => ({ activeItem }) => <nav>{activeItem}</nav>);
jest.mock('react-router-dom', () => ({ Link: ({ to, children }) => <a href={to}>{children}</a> }), { virtual: true });

const data = {
  firstName: 'Alex', totalSeconds: 1800, workoutsCompleted: 2,
  averageAccuracy: 91, currentStreak: 2, bestStreak: 4,
  days: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-${String(7 + index).padStart(2, '0')}`, seconds: index === 0 ? 1800 : 0, loggedIn: index < 2 })),
};

beforeEach(() => jest.clearAllMocks());

test('renders real statistics, empty recent workouts and a disabled plan preview', async () => {
  getDashboard.mockResolvedValue(data);
  render(<DashboardPage />);
  expect(await screen.findByRole('heading', { name: /Welcome back, Alex/ })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Total Workout Time' })).getByText('30')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Average Accuracy' })).getByText('91')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Workout minutes this week: Mon 30, Tue 0/ })).toBeInTheDocument();
  expect(screen.getByText('No recent workouts to display yet.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start Workout' })).toBeDisabled();
  expect(screen.queryByText(/Calories Burned|kcal/)).not.toBeInTheDocument();
});

test('shows loading placeholders and distinguishes missing accuracy from recorded zero', async () => {
  let resolve;
  getDashboard.mockReturnValue(new Promise((done) => { resolve = done; }));
  render(<DashboardPage />);
  expect(screen.getAllByText('Loading…')).toHaveLength(4);
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  resolve({ ...data, totalSeconds: 0, workoutsCompleted: 0, averageAccuracy: null });
  expect(await screen.findByText('No accuracy data this week')).toBeInTheDocument();
  const accuracy = screen.getByRole('region', { name: 'Average Accuracy' });
  expect(within(accuracy).getByText('—')).toBeInTheDocument();
  getDashboard.mockResolvedValue({ ...data, averageAccuracy: 0 });
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(within(accuracy).getByText('0')).toBeInTheDocument());
});

test('handles backend errors and retries without fabricated zero metrics', async () => {
  getDashboard.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(data);
  render(<DashboardPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
  expect(screen.getAllByText('Unavailable')).toHaveLength(4);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('heading', { name: /Welcome back, Alex/ })).toBeInTheDocument();
});
