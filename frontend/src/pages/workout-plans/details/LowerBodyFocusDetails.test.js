import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import LowerBodyFocusDetails from './LowerBodyFocusDetails';
import { lowerBodyScheduleByWeek } from './lowerBodyFocusData';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

describe('Lower Body Focus plan details', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('uses the shared plan design with the four correct exercises and current Lunge image', () => {
    render(<LowerBodyFocusDetails />);

    expect(screen.getByTestId('navbar')).toHaveTextContent('Workout Plans');
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByAltText('Athlete demonstrating a forward lunge')).toHaveAttribute(
      'src',
      expect.stringContaining('exercise-card-lunge'),
    );

    const exercisePanel = screen.getByRole('heading', { name: 'Exercises in This Plan' }).closest('section');
    ['Squat', 'Lunge', 'Plank', 'Leg Raise'].forEach((exercise) => {
      expect(within(exercisePanel).getByText(exercise)).toBeInTheDocument();
    });
    expect(within(exercisePanel).queryByText('Push-up')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sit-up/i)).not.toBeInTheDocument();
  });

  test('each week tab renders its own progressive workout cards', () => {
    render(<LowerBodyFocusDetails />);

    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '1');
    expect(screen.getByText(/Week 1: Foundation/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 20 sec')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 2' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '2');
    expect(screen.getByText(/Week 2: Build Strength/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 25 sec')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 3' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '3');
    expect(screen.getByText(/Week 3: Increase Volume/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 30 sec')).toHaveLength(2);
    expect(screen.getAllByText('4 sets × 12 reps')).toHaveLength(3);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 4' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '4');
    expect(screen.getByText(/Week 4: Lower Body Challenge/)).toBeInTheDocument();
    expect(screen.getAllByText('3 sets × 35 sec')).toHaveLength(2);
    expect(screen.getAllByText('4 sets × 15 reps')).toHaveLength(3);
  });

  test('stores every scheduled exercise as ordered execution data', () => {
    expect(Object.keys(lowerBodyScheduleByWeek)).toEqual(['1', '2', '3', '4']);

    Object.entries(lowerBodyScheduleByWeek).forEach(([week, workouts]) => {
      expect(workouts).toHaveLength(3);
      workouts.forEach((workout) => {
        expect(workout.planId).toBe('lower-body-focus');
        expect(workout.week).toBe(Number(week));
        workout.exercises.forEach((exercise, index) => {
          expect(exercise).toEqual(expect.objectContaining({
            planId: 'lower-body-focus',
            exerciseId: expect.any(String),
            week: Number(week),
            day: workout.day,
            order: index + 1,
            sets: expect.any(Number),
            restTime: 60,
            perLeg: expect.any(Boolean),
            type: expect.stringMatching(/^(reps|duration)$/),
          }));
          if (exercise.exerciseId === 'lunge') expect(exercise.perLeg).toBe(true);
          if (exercise.exerciseId === 'plank') {
            expect(exercise.type).toBe('duration');
            expect(exercise.holdTime).toEqual(expect.any(Number));
            expect(exercise.reps).toBeUndefined();
          }
        });
      });
    });

    expect(lowerBodyScheduleByWeek[1][1].exercises.map(({ exerciseId }) => exerciseId)).toEqual([
      'lunge', 'squat', 'leg-raise',
    ]);
  });

  test('prepares Lower Body data for Start This Plan and keeps its own saved state', () => {
    render(<LowerBodyFocusDetails />);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));

    const activePlan = JSON.parse(sessionStorage.getItem('posefitActiveWorkoutPlan'));
    expect(activePlan.id).toBe('lower-body-focus');
    expect(activePlan.activeWeek).toBe(4);
    expect(activePlan.activeWorkout.exercises[0]).toEqual(expect.objectContaining({
      exerciseId: 'squat', sets: 4, reps: 15, restTime: 60,
    }));
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save Plan' }));
    expect(localStorage.getItem('posefitSavedLowerBodyPlan')).toBe('true');
    expect(localStorage.getItem('posefitSavedBeginnerPlan')).toBeNull();
    expect(screen.getByRole('button', { name: 'Plan Saved' })).toHaveAttribute('aria-pressed', 'true');
  });
});
