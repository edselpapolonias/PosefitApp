import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeginnerFullBodyDetails from './BeginnerFullBodyDetails';

const mockStart = jest.fn();
jest.mock('../../../services/workoutPlanService', () => ({
  fetchActiveWorkoutPlan: () => Promise.resolve(null),
  startBeginnerPlan: (...args) => mockStart(...args), endWorkoutPlan: () => Promise.resolve(),
}));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../../components/Navbar', () => () => null);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

test.each(['Cancel', 'Close confirmation', 'Escape', 'backdrop'])('%s cancels without activation and restores focus', async (method) => {
  render(<BeginnerFullBodyDetails />);
  const trigger = screen.getByRole('button', { name: 'Start This Plan' });
  trigger.focus(); fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'Start Beginner Full Body?' });
  expect(dialog).toHaveTextContent('3 Days/Week');
  expect(dialog).toHaveTextContent('12 Workouts');
  if (method === 'Escape') fireEvent(dialog, new Event('cancel', { cancelable: true }));
  else if (method === 'backdrop') fireEvent.click(dialog);
  else fireEvent.click(screen.getByRole('button', { name: method }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mockStart).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
  await act(async () => {});
});

test('only persists on confirmation, disables duplicate submits, and permits retry on failure', async () => {
  let reject;
  mockStart.mockImplementationOnce(() => new Promise((resolve, rejectRequest) => { reject = rejectRequest; }));
  render(<BeginnerFullBodyDetails />);
  fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
  const start = screen.getByRole('button', { name: 'Start Plan' });
  fireEvent.click(start); fireEvent.click(start);
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Starting Plan...' })).toBeDisabled();
  await act(async () => reject(new Error('network failure')));
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to start the plan. Please try again.');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  mockStart.mockResolvedValueOnce({ id: 'beginner-full-body', instanceId: 3, startDate: '2026-09-14', activeWeek: 1, completedWorkoutIds: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('0 of 12 workouts completed')).toBeInTheDocument();
});
