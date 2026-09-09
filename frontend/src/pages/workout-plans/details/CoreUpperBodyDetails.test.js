import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreUpperBodyDetails from './CoreUpperBodyDetails';
import { coreUpperScheduleByWeek } from './coreUpperBodyData';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

describe('Core & Upper Body plan details', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  test('uses the shared plan design with only the three correct exercises and current Push-up image', () => {
    render(<CoreUpperBodyDetails />);

    expect(screen.getByTestId('navbar')).toHaveTextContent('Workout Plans');
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByAltText('Athlete demonstrating a push-up')).toHaveAttribute(
      'src',
      expect.stringContaining('exercise-card-push-up'),
    );

    const exercisePanel = screen.getByRole('heading', { name: 'Exercises in This Plan' }).closest('section');
    ['Push-up', 'Plank', 'Leg Raise'].forEach((exercise) => {
      expect(within(exercisePanel).getByText(exercise)).toBeInTheDocument();
    });
    expect(within(exercisePanel).queryByText('Squat')).not.toBeInTheDocument();
    expect(within(exercisePanel).queryByText('Lunge')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sit-up/i)).not.toBeInTheDocument();
  });

  test('each week tab renders its own progressive workout cards', () => {
    render(<CoreUpperBodyDetails />);

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
    expect(screen.getAllByText('4 sets × 10 reps')).toHaveLength(2);
    expect(screen.getAllByText('3 sets × 30 sec')).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 4' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('data-week', '4');
    expect(screen.getByText(/Week 4: Core & Upper Body Challenge/)).toBeInTheDocument();
    expect(screen.getAllByText('4 sets × 15 reps')).toHaveLength(4);
    expect(screen.getAllByText('3 sets × 35 sec')).toHaveLength(2);
    expect(screen.getByText('3 sets × 40 sec')).toBeInTheDocument();
  });

  test('stores deterministic execution data with explicit day and exercise order', () => {
    expect(Object.keys(coreUpperScheduleByWeek)).toEqual(['1', '2', '3', '4']);

    Object.entries(coreUpperScheduleByWeek).forEach(([week, workouts]) => {
      expect(workouts).toHaveLength(3);
      workouts.forEach((workout, dayIndex) => {
        expect(workout).toEqual(expect.objectContaining({
          planId: 'core-upper-body',
          week: Number(week),
          dayOrder: dayIndex + 1,
        }));
        workout.exercises.forEach((exercise, exerciseIndex) => {
          expect(exercise).toEqual(expect.objectContaining({
            planId: 'core-upper-body',
            exerciseId: expect.stringMatching(/^(push-up|plank|leg-raise)$/),
            week: Number(week),
            day: workout.day,
            dayOrder: dayIndex + 1,
            order: exerciseIndex + 1,
            sets: expect.any(Number),
            restTime: 60,
            perLeg: false,
            type: expect.stringMatching(/^(reps|duration)$/),
          }));
          if (exercise.exerciseId === 'plank') {
            expect(exercise.type).toBe('duration');
            expect(exercise.holdTime).toEqual(expect.any(Number));
            expect(exercise.reps).toBeUndefined();
          } else {
            expect(exercise.type).toBe('reps');
            expect(exercise.reps).toEqual(expect.any(Number));
            expect(exercise.holdTime).toBeUndefined();
          }
        });
      });
    });

    expect(coreUpperScheduleByWeek[1][1].exercises.map(({ exerciseId }) => exerciseId)).toEqual([
      'leg-raise', 'push-up', 'plank',
    ]);
  });

  test('prepares Core & Upper data for Start This Plan and keeps its own saved state', () => {
    render(<CoreUpperBodyDetails />);

    fireEvent.click(screen.getByRole('tab', { name: 'Week 4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));

    const activePlan = JSON.parse(sessionStorage.getItem('posefitActiveWorkoutPlan'));
    expect(activePlan.id).toBe('core-upper-body');
    expect(activePlan.activeWeek).toBe(4);
    expect(activePlan.activeWorkout.exercises[0]).toEqual(expect.objectContaining({
      exerciseId: 'push-up', sets: 4, reps: 12, restTime: 60,
    }));
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save Plan' }));
    expect(localStorage.getItem('posefitSavedCoreUpperPlan')).toBe('true');
    expect(localStorage.getItem('posefitSavedBeginnerPlan')).toBeNull();
    expect(localStorage.getItem('posefitSavedLowerBodyPlan')).toBeNull();
    expect(screen.getByRole('button', { name: 'Plan Saved' })).toHaveAttribute('aria-pressed', 'true');
  });
});
