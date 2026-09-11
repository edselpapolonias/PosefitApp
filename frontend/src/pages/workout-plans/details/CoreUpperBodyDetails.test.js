import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CoreUpperBodyDetails from './CoreUpperBodyDetails';
import { coreUpperScheduleByWeek } from './coreUpperBodyData';

const mockNavigate = jest.fn();
let mockPersisted = null;
let mockStartDate = null;

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { csrf_token: 'test' } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

jest.mock('../../../services/workoutPlanService', () => ({
  fetchActiveWorkoutPlan: () => Promise.resolve(mockPersisted),
  startCoreUpperPlan: (startDate) => {
    mockStartDate = startDate;
    mockPersisted = { id: 'core-upper-body', name: 'Core & Upper Body', instanceId: 3, startDate, activeWeek: 1, completedWorkoutIds: [] };
    return Promise.resolve(mockPersisted);
  },
  endWorkoutPlan: () => { mockPersisted = null; return Promise.resolve(); },
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});

describe('Core & Upper Body plan details', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    mockPersisted = null;
    mockStartDate = null;
  });

  test('numbers workout days continuously across weeks', () => {
    render(<CoreUpperBodyDetails />);

    [1, 2, 3, 4, 1].forEach((week) => {
      fireEvent.click(screen.getByRole('tab', { name: `Week ${week}` }));
      const panel = within(screen.getByRole('tabpanel'));
      expect(panel.getAllByText(/^DAY \d+$/).map((label) => label.textContent)).toEqual(
        [1, 2, 3].map((day) => `DAY ${(week - 1) * 3 + day}`),
      );
    });
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

  test('confirms, persists, and opens the reusable Core & Upper Body active plan', async () => {
    render(<CoreUpperBodyDetails />);

    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
    expect(screen.getByRole('heading', { name: 'Start Core & Upper Body?' })).toBeInTheDocument();
    expect(screen.getByText(/Workouts are scheduled every Monday, Wednesday, and Friday/)).toBeInTheDocument();
    expect(mockPersisted).toBeNull();
    expect([...document.querySelectorAll('.start-plan-dialog__preview strong')].map((item) => item.textContent)).toEqual(['MON', 'WED', 'FRI']);
    expect([...document.querySelectorAll('.start-plan-dialog__preview time')].map((item) => new Date(`${item.dateTime}T12:00:00`).getDay())).toEqual([1, 3, 5]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Start Core & Upper Body?' })).not.toBeInTheDocument();
    expect(mockPersisted).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'End Plan' })).toBeInTheDocument());

    expect(new Date(`${mockStartDate}T12:00:00`).getDay()).toBe(1);
    expect(screen.getByRole('heading', { name: 'Core & Upper Body' })).toBeInTheDocument();
    expect(screen.getByLabelText('Plan details')).toHaveTextContent('3 Days/Week25–40 min4 WeeksIntermediate');
    expect(screen.getByText('0 of 12 workouts completed')).toBeInTheDocument();

    const calendar = screen.getByRole('heading', { name: 'Weekly Calendar' }).closest('section');
    expect([...calendar.querySelectorAll('.is-workout time')].map((item) => new Date(`${item.dateTime}T12:00:00`).getDay())).toEqual([1, 3, 5]);
    const dayOne = screen.getByRole('article', { name: 'DAY 1, Monday' });
    expect(dayOne.querySelectorAll('.beginner-active__exercises img')).toHaveLength(3);
    expect(within(dayOne).getByText('3 sets × 20 sec')).toBeInTheDocument();
    fireEvent.click(within(dayOne).getByRole('button', { name: 'Start Workout' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      { pathname: '/exercises/push-up/start', search: expect.stringContaining('workoutSession=') },
      { state: expect.objectContaining({ workoutConfig: expect.objectContaining({ sets: 1, reps: 8 }) }) },
    );
    expect(screen.queryByRole('button', { name: /Save Plan|Plan Saved/ })).not.toBeInTheDocument();
  });
});
