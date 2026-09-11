import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LowerBodyFocusDetails from './LowerBodyFocusDetails';
import { lowerBodyScheduleByWeek } from './lowerBodyFocusData';

const mockNavigate = jest.fn();
let mockPersisted = null;
let mockStartDate = null;

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { csrf_token: 'test' } })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

jest.mock('../../../services/workoutPlanService', () => ({
  fetchActiveWorkoutPlan: () => Promise.resolve(mockPersisted),
  startLowerBodyPlan: (startDate) => {
    mockStartDate = startDate;
    mockPersisted = { id: 'lower-body-focus', name: 'Lower Body Focus', instanceId: 2, startDate, activeWeek: 1, completedWorkoutIds: [] };
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

describe('Lower Body Focus plan details', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    mockPersisted = null;
    mockStartDate = null;
  });

  test('numbers workout days continuously across weeks', () => {
    render(<LowerBodyFocusDetails />);

    [1, 2, 3, 4, 1].forEach((week) => {
      fireEvent.click(screen.getByRole('tab', { name: `Week ${week}` }));
      const panel = within(screen.getByRole('tabpanel'));
      expect(panel.getAllByText(/^DAY \d+$/).map((label) => label.textContent)).toEqual(
        [1, 2, 3].map((day) => `DAY ${(week - 1) * 3 + day}`),
      );
    });
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
      expect(workouts.map(({ day }) => day)).toEqual(['Tuesday', 'Thursday', 'Saturday']);
    });

    expect(lowerBodyScheduleByWeek[1][1].exercises.map(({ exerciseId }) => exerciseId)).toEqual([
      'lunge', 'squat', 'leg-raise',
    ]);
  });

  test('opens its confirmation without activation and previews Tuesday, Thursday, and Saturday', async () => {
    render(<LowerBodyFocusDetails />);

    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
    expect(screen.getByRole('heading', { name: 'Start Lower Body Focus?' })).toBeInTheDocument();
    expect(screen.getByText(/Workouts are scheduled every Tuesday, Thursday, and Saturday/)).toBeInTheDocument();
    expect(mockPersisted).toBeNull();
    expect([...document.querySelectorAll('.start-plan-dialog__preview strong')].map((item) => item.textContent)).toEqual(['TUE', 'THU', 'SAT']);
    expect([...document.querySelectorAll('.start-plan-dialog__preview time')].map((item) => new Date(`${item.dateTime}T12:00:00`).getDay())).toEqual([2, 4, 6]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Start Lower Body Focus?' })).not.toBeInTheDocument();
    expect(mockPersisted).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Start This Plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Plan' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'End Plan' })).toBeInTheDocument());
    expect(new Date(`${mockStartDate}T12:00:00`).getDay()).toBe(1);
    expect(screen.getByLabelText('Plan details')).toHaveTextContent('3 Days/Week30–40 min4 WeeksIntermediate');
    expect(screen.getByRole('heading', { name: 'Lower Body Focus' })).toBeInTheDocument();
    expect(screen.getByText('0 of 12 workouts completed')).toBeInTheDocument();

    const calendar = screen.getByRole('heading', { name: 'Weekly Calendar' }).closest('section');
    expect([...calendar.querySelectorAll('.is-workout time')].map((item) => new Date(`${item.dateTime}T12:00:00`).getDay())).toEqual([2, 4, 6]);
    const dayOne = screen.getByRole('article', { name: 'DAY 1, Tuesday' });
    expect(within(dayOne).getByText('3 sets × 8 reps each leg')).toBeInTheDocument();
    fireEvent.click(within(dayOne).getByRole('button', { name: 'Start Workout' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      { pathname: '/exercises/squat/start', search: expect.stringContaining('workoutSession=') },
      { state: expect.objectContaining({ workoutConfig: expect.objectContaining({ sets: 1, reps: 10 }) }) },
    );
  });

  test('shows Start This Plan without a Save Plan action', () => {
    render(<LowerBodyFocusDetails />);

    expect(screen.getByRole('button', { name: 'Start This Plan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Plan|Plan Saved/ })).not.toBeInTheDocument();
  });
});
