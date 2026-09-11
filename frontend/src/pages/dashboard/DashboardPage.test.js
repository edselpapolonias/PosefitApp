import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from './DashboardPage';
import { getDashboard } from '../../services/dashboardService';

jest.mock('../../services/dashboardService');
jest.mock('../../components/Navbar', () => ({ activeItem }) => <nav>{activeItem}</nav>);
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });

const data = {
  firstName: 'Alex', totalSeconds: 1800, workoutsCompleted: 2,
  averageAccuracy: 91, currentStreak: 2, bestStreak: 4,
  today: '2026-09-07', activePlans: [],
  days: Array.from({ length: 7 }, (_, index) => ({ date: `2026-09-${String(7 + index).padStart(2, '0')}`, seconds: index === 0 ? 1800 : 0, loggedIn: index < 2 })),
};

const planInfo = {
  'beginner-full-body': { name: 'Beginner Full Body', instanceId: 1, workoutId: 'week-1-monday', day: 'Monday' },
  'lower-body-focus': { name: 'Lower Body Focus', instanceId: 2, workoutId: 'lower-body-week-1-tuesday', day: 'Tuesday' },
  'core-upper-body': { name: 'Core & Upper Body', instanceId: 3, workoutId: 'core-upper-week-1-monday', day: 'Monday' },
};

function activePlan(id, date, options = {}) {
  const info = planInfo[id];
  return {
    id,
    name: info.name,
    instanceId: info.instanceId,
    status: 'active',
    activatedAt: `2026-09-01T0${info.instanceId}:00:00Z`,
    completedWorkoutIds: options.completed ? [info.workoutId] : [],
    daySessions: options.inProgress ? [{ workoutId: info.workoutId, status: 'active' }] : [],
    schedule: [{ id: info.workoutId, week: 1, day: info.day, date }],
  };
}

beforeEach(() => jest.clearAllMocks());

test('renders real statistics and a workout-plan empty state without fake exercises', async () => {
  getDashboard.mockResolvedValue(data);
  render(<DashboardPage />);
  expect(await screen.findByRole('heading', { name: /Welcome back, Alex/ })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Total Workout Time' })).getByText('30')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Average Accuracy' })).getByText('91')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Workout minutes this week: Mon 30, Tue 0/ })).toBeInTheDocument();
  expect(screen.getByText('No recent workouts to display yet.')).toBeInTheDocument();
  const planCard = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(planCard).getByRole('heading', { name: 'No Active Plan' })).toBeInTheDocument();
  expect(within(planCard).getByRole('link', { name: /Browse Workout Plans/ })).toHaveAttribute('href', '/workout-plans');
  expect(within(planCard).queryByText(/Squat|Push-up|Plank|Lunge|Leg Raise/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Calories Burned|kcal/)).not.toBeInTheDocument();
});

test('shows every exercise from the plan definition for the workout scheduled on the actual date', async () => {
  getDashboard.mockResolvedValue({ ...data, activePlans: [activePlan('beginner-full-body', data.today)] });
  render(<DashboardPage />);

  await screen.findByRole('heading', { name: "Today's Workout" });
  const card = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(card).getByRole('heading', { name: "Today's Workout" })).toBeInTheDocument();
  expect(within(card).getByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
  expect(within(card).getByLabelText('Exercises: Squat, Push-up, Plank').querySelectorAll('img')).toHaveLength(3);
  expect(within(card).getByText('3 sets × 10 reps')).toBeInTheDocument();
  expect(within(card).getByText('3 sets × 8 reps')).toBeInTheDocument();
  expect(within(card).getByText('3 sets × 20 sec')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /Start Workout/ })).toHaveAttribute('href', '/workout-plans/beginner-full-body');
  expect(within(card).queryByRole('button', { name: 'Next workout plan' })).not.toBeInTheDocument();
});

test('uses a stable carousel for same-day plans and reflects completed and in-progress states', async () => {
  getDashboard.mockResolvedValue({
    ...data,
    activePlans: [
      activePlan('beginner-full-body', data.today, { completed: true }),
      activePlan('core-upper-body', data.today, { inProgress: true }),
    ],
  });
  render(<DashboardPage />);

  await screen.findByText('1 / 2');
  const card = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(card).getByText('1 / 2')).toBeInTheDocument();
  expect(within(card).getByText('Completed')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /View Active Plan/ })).toHaveAttribute('href', '/workout-plans/beginner-full-body');

  fireEvent.click(within(card).getByRole('button', { name: 'Next workout plan' }));
  expect(within(card).getByText('2 / 2')).toBeInTheDocument();
  expect(within(card).getByRole('heading', { name: 'Core & Upper Body' })).toBeInTheDocument();
  expect(within(card).getByText('In Progress')).toBeInTheDocument();
  expect(within(card).getByText('Leg Raise')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /Continue Workout/ })).toHaveAttribute('href', '/workout-plans/core-upper-body');
});

test('automatically selects the plan scheduled on today\'s actual date', async () => {
  getDashboard.mockResolvedValue({
    ...data,
    today: '2026-09-08',
    activePlans: [
      activePlan('beginner-full-body', '2026-09-09'),
      activePlan('lower-body-focus', '2026-09-08'),
    ],
  });
  render(<DashboardPage />);

  await screen.findByRole('heading', { name: 'Lower Body Focus' });
  const card = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(card).getByRole('heading', { name: "Today's Workout" })).toBeInTheDocument();
  expect(within(card).getByText('3 sets × 8 reps each leg')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /Start Workout/ })).toHaveAttribute('href', '/workout-plans/lower-body-focus');
  expect(within(card).queryByRole('button', { name: 'Next workout plan' })).not.toBeInTheDocument();
});

test('does not treat a future start as today just because the weekday matches', async () => {
  getDashboard.mockResolvedValue({
    ...data,
    today: '2026-09-07',
    activePlans: [activePlan('beginner-full-body', '2026-09-14')],
  });
  render(<DashboardPage />);

  await screen.findByRole('heading', { name: 'Up Next' });
  const card = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(card).queryByRole('heading', { name: "Today's Workout" })).not.toBeInTheDocument();
  expect(within(card).getByText('Week 1 · Monday · Sep 14')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /View Active Plan/ })).toHaveAttribute('href', '/workout-plans/beginner-full-body');
});

test('chooses the nearest future workout when no active plan is scheduled today', async () => {
  getDashboard.mockResolvedValue({
    ...data,
    today: '2026-09-06',
    activePlans: [
      activePlan('lower-body-focus', '2026-09-08'),
      activePlan('beginner-full-body', '2026-09-07'),
    ],
  });
  render(<DashboardPage />);

  await screen.findByRole('heading', { name: 'Up Next' });
  const card = screen.getByRole('complementary', { name: 'Workout plan' });
  expect(within(card).getByRole('heading', { name: 'Up Next' })).toBeInTheDocument();
  expect(within(card).getByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
  expect(within(card).getByText('Rest Day · Up Next')).toBeInTheDocument();
  expect(within(card).getByRole('link', { name: /View Active Plan/ })).toHaveAttribute('href', '/workout-plans/beginner-full-body');
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
