import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeginnerFullBodyDetails from './BeginnerFullBodyDetails';
import { beginnerFullBodyPlan, beginnerScheduleByWeek } from './beginnerFullBodyData';
import { activePlanSchedule, activePlanProgress, localDateKey } from './beginnerActivePlan';

const mockNavigate = jest.fn();
let mockPersisted = null;
jest.mock('../../../services/workoutPlanService', () => ({
  fetchActiveWorkoutPlan: () => Promise.resolve(mockPersisted),
  startBeginnerPlan: () => { mockPersisted = { id: 'beginner-full-body', instanceId: 1, startDate: '2026-09-14', activeWeek: 1, completedWorkoutIds: [] }; return Promise.resolve(mockPersisted); },
  endWorkoutPlan: () => { mockPersisted = null; return Promise.resolve(); },
}));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); }; });
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../../../components/Navbar', () => ({ activeItem }) => <nav>{activeItem}</nav>);
beforeEach(() => { mockPersisted = null; sessionStorage.clear(); localStorage.clear(); mockNavigate.mockClear(); });

test('reuses all 12 prescriptions and schedules Monday, Wednesday, Friday across a year boundary', () => {
  const plan = { id: beginnerFullBodyPlan.id, startDate: '2026-12-28', completedWorkoutIds: [] };
  const weeks = activePlanSchedule(plan);
  expect(plan.startDate).toBe('2026-12-28');
  expect(weeks.flatMap((week) => week.workouts)).toHaveLength(12);
  weeks.forEach((week) => {
    expect(week.workouts.map((workout) => workout.date.getDay())).toEqual([1, 3, 5]);
    week.workouts.forEach((workout, index) => expect(workout.exercises).toBe(beginnerScheduleByWeek[week.week][index].exercises));
  });
  expect(localDateKey(weeks[1].start)).toBe('2027-01-04');
  expect(activePlanProgress(plan, weeks)).toMatchObject({ completed: 0, remaining: 12, percent: 0, weeksCompleted: 0 });
  const completedWorkoutIds = [...weeks[0].workouts.map((workout) => workout.id), 'unknown', weeks[0].workouts[0].id];
  expect(activePlanProgress({ ...plan, completedWorkoutIds }, weeks)).toMatchObject({ completed: 3, remaining: 9, percent: 25, weeksCompleted: 1 });
});

test('activation, static actions, synchronized calendar and restoration', async () => {
  const { unmount } = render(<BeginnerFullBodyDetails />);
  fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'End Plan' })).toBeInTheDocument());
  expect(screen.getByText(/Active Plan/)).toBeInTheDocument();
  const stored = mockPersisted;
  fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockPersisted).toBe(stored);
  [1, 2, 3, 4].forEach((week) => {
    fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^Week ${week} `) }));
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('data-week', String(week));
    expect(within(panel).getAllByRole('article')).toHaveLength(3);
    const dates = [...panel.querySelectorAll('time')].map((time) => time.dateTime);
    const calendar = screen.getByRole('heading', { name: 'Weekly Calendar' }).closest('section');
    expect([...calendar.querySelectorAll('.is-workout time')].map((time) => time.dateTime)).toEqual(dates);
    expect(within(panel).getAllByText(/^Day \d+$/).map((item) => item.textContent)).toEqual([1, 2, 3].map((day) => `Day ${(week - 1) * 3 + day}`));
  });
  expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
  expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '3');
  expect(screen.getByText('0 of 12 workouts completed')).toBeInTheDocument();
  unmount();
  render(<BeginnerFullBodyDetails />);
  await waitFor(() => expect(screen.getByText(/Active Plan/)).toBeInTheDocument());
  expect(mockPersisted.startDate).toBe(stored.startDate);
});

test('End Plan restores the original details and stays ended after reopening', async () => {
  const { unmount } = render(<BeginnerFullBodyDetails />);
  expect(screen.queryByRole('button', { name: /Save Plan|Plan Saved/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'End Plan' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'End Plan' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start This Plan' })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Start This Plan' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Exercises in This Plan' })).toBeInTheDocument();
  expect(sessionStorage.getItem('posefitActiveWorkoutPlan')).toBeNull();

  expect(mockNavigate).not.toHaveBeenCalled();
  unmount();
  render(<BeginnerFullBodyDetails />);
  expect(screen.getByRole('button', { name: 'Start This Plan' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'End Plan' })).not.toBeInTheDocument();
});
