import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeginnerFullBodyDetails from './BeginnerFullBodyDetails';
import { beginnerScheduleByWeek } from './beginnerFullBodyData';

const mockNavigate = jest.fn();

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

  test('prepares the selected week for the plan flow and preserves save behavior', () => {
    render(<BeginnerFullBodyDetails />);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));

    const activePlan = JSON.parse(sessionStorage.getItem('posefitActiveWorkoutPlan'));
    expect(activePlan.id).toBe('beginner-full-body');
    expect(activePlan.activeWeek).toBe(3);
    expect(activePlan.activeDay).toBe('Monday');
    expect(activePlan.activeWorkout.exercises[0]).toEqual(expect.objectContaining({
      exerciseId: 'squat', sets: 3, reps: 15, restTime: 60,
    }));
    expect(mockNavigate).not.toHaveBeenCalled();

    const saveButton = screen.getByRole('button', { name: 'Save Plan' });
    fireEvent.click(saveButton);
    expect(localStorage.getItem('posefitSavedBeginnerPlan')).toBe('true');
    expect(screen.getByRole('button', { name: 'Plan Saved' })).toHaveAttribute('aria-pressed', 'true');
  });
});
