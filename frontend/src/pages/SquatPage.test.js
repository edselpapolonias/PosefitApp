import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SquatPage from './SquatPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../components/Navbar', () => function MockNavbar() {
  return <div data-testid="navbar" />;
});

describe('Squat workout presets', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

  test('predefined presets apply their values and keep every stepper locked', () => {
    render(<SquatPage />);

    expect(screen.getByLabelText('Sets: 3, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 10, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 60 sec, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Decrease Sets' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase Rest Time' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Strength/ }));

    expect(screen.getByLabelText('Sets: 4, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 8, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 90 sec, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strength/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Beginner/ })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
    expect(mockNavigate).toHaveBeenCalledWith('/exercises/squat/start?sets=4&reps=8&rest=90', {
      state: { workoutConfig: { sets: 4, reps: 8, rest: 90, preset: 'strength' } },
    });
  });

  test('Custom unlocks editing and Start Workout submits the edited values', () => {
    render(<SquatPage />);

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    expect(screen.getByLabelText('Sets: 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Sets' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Increase Sets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Reps per Set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Rest Time' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getByRole('heading', { name: 'Muscles Worked' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByLabelText('Sets: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 75 sec')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));

    const submitted = { sets: 4, reps: 11, rest: 75, preset: 'custom' };
    expect(JSON.parse(sessionStorage.getItem('posefitSquatWorkoutConfig'))).toEqual(submitted);
    expect(mockNavigate).toHaveBeenCalledWith('/exercises/squat/start?sets=4&reps=11&rest=75', {
      state: { workoutConfig: submitted },
    });
  });

  test('switching back to a predefined preset overwrites custom values and locks controls', () => {
    render(<SquatPage />);

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Sets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Reps per Set' }));
    fireEvent.click(screen.getByRole('button', { name: /Endurance/ }));

    expect(screen.getByLabelText('Sets: 3, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 15, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 45 sec, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Reps per Set' })).toBeDisabled();
  });
});
