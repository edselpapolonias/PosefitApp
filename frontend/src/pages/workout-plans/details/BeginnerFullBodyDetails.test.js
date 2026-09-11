import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeginnerFullBodyDetails from './BeginnerFullBodyDetails';
import { beginnerScheduleByWeek } from './beginnerFullBodyData';

const mockNavigate = jest.fn();
const mockStart = jest.fn();
jest.mock('../../../services/workoutPlanService', () => ({ fetchActiveWorkoutPlan: () => Promise.resolve(null), startBeginnerPlan: (...args) => mockStart(...args), endWorkoutPlan: () => Promise.resolve() }));
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); }; });

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

describe('Beginner Full Body plan details', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('numbers workout days continuously across weeks', () => {
    render(<BeginnerFullBodyDetails />);

    [1, 2, 3, 4, 1].forEach((week) => {
      fireEvent.click(screen.getByRole('tab', { name: `Week ${week}` }));
      const panel = within(screen.getByRole('tabpanel'));
      expect(panel.getAllByText(/^DAY \d+$/).map((label) => label.textContent)).toEqual(
        [1, 2, 3].map((day) => `DAY ${(week - 1) * 3 + day}`),
      );
    });
  });

  test('shows all five current exercises and reuses the Exercise Selection push-up image', () => {
    render(<BeginnerFullBodyDetails />);

    expect(screen.getByTestId('navbar')).toHaveTextContent('Workout Plans');
    expect(screen.getByAltText('Athlete demonstrating a push-up')).toHaveAttribute(
      'src',
      expect.stringContaining('exercise-card-push-up'),
    );
    expect(screen.queryByText('Build Strength')).not.toBeInTheDocument();
    expect(screen.queryByText('Stay Consistent')).not.toBeInTheDocument();
    expect(screen.queryByText('Feel Better')).not.toBeInTheDocument();

    const exercisePanel = screen.getByRole('heading', { name: 'Exercises in This Plan' }).closest('section');
    ['Squat', 'Push-up', 'Plank', 'Lunge', 'Leg Raise'].forEach((exercise) => {
      expect(within(exercisePanel).getByText(exercise)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Sit-up/i)).not.toBeInTheDocument();
  });

  test('week tabs replace the visible schedule with the correct progression', () => {
    render(<BeginnerFullBodyDetails />);

    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '1');
    expect(screen.getByText(/Week 1: Foundation/)).toBeInTheDocument();
    expect(screen.getAllByText('2 sets × 8 reps each leg')).toHaveLength(2);
    expect(screen.getAllByText('3 sets × 20 sec')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 2' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '2');
    expect(screen.getByText(/Week 2: Build Consistency/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 12 reps')).toHaveLength(3);
    expect(screen.getAllByText('3 sets × 25 sec')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 3' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '3');
    expect(screen.getByText(/Week 3: Increase Volume/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 30 sec')).toHaveLength(2);
    expect(screen.getAllByText('3 sets × 10 reps each leg')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 4' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '4');
    expect(screen.getByText(/Week 4: Beginner Challenge/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 12 reps each leg')).toHaveLength(2);
    expect(screen.getAllByText('3 sets × 35 sec')).toHaveLength(2);
    expect(screen.getAllByText('3 sets × 15 reps').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('tab', { name: 'Week 4' })).toHaveAttribute('aria-selected', 'true');
  });

  test('keeps each week machine-readable for future plan workout execution', () => {
    expect(Object.keys(beginnerScheduleByWeek)).toEqual(['1', '2', '3', '4']);

    Object.entries(beginnerScheduleByWeek).forEach(([week, workouts]) => {
      expect(workouts).toHaveLength(3);
      workouts.forEach((workout) => {
        expect(workout.week).toBe(Number(week));
        workout.exercises.forEach((exercise, index) => {
          expect(exercise).toEqual(expect.objectContaining({
            exerciseId: expect.any(String),
            day: workout.day,
            week: Number(week),
            order: index + 1,
            sets: expect.any(Number),
            restTime: 60,
            perLeg: expect.any(Boolean),
            type: expect.stringMatching(/^(reps|duration)$/),
          }));
          if (exercise.type === 'duration') expect(exercise.holdTime).toEqual(expect.any(Number));
          if (exercise.type === 'reps') expect(exercise.reps).toEqual(expect.any(Number));
        });
      });
    });

    const weekOneWednesdayLunge = beginnerScheduleByWeek[1][1].exercises[0];
    expect(weekOneWednesdayLunge).toEqual(expect.objectContaining({
      exerciseId: 'lunge', sets: 2, reps: 8, perLeg: true,
    }));
  });

  test('confirmation activates week one only after persistence succeeds', async () => {
    mockStart.mockResolvedValue({ id: 'beginner-full-body', instanceId: 1, startDate: '2026-09-14', activeWeek: 1, completedWorkoutIds: [] });
    render(<BeginnerFullBodyDetails />);
    fireEvent.click(screen.getByRole('tab', { name: 'Week 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
    expect(mockStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
    await waitFor(() => expect(screen.getByText(/Active Plan/)).toBeInTheDocument());
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '1');
    expect(screen.getByText('0 of 12 workouts completed')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
