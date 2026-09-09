import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LungePage from './LungePage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar() {
  return <div data-testid="navbar" />;
});

describe('Lunge configuration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

  test('applies Lunge presets and submits the locked values to the camera page', () => {
    render(<LungePage />);

    expect(screen.getByLabelText('Sets: 3, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 10, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 60 sec, locked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Strength/ }));
    expect(screen.getByLabelText('Sets: 4, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 12, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 90 sec, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Reps per Set' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
    const submitted = { sets: 4, reps: 12, rest: 90, preset: 'strength' };
    expect(JSON.parse(sessionStorage.getItem('posefitLungeWorkoutConfig'))).toEqual(submitted);
    expect(mockNavigate).toHaveBeenCalledWith('/exercises/lunge/start?sets=4&reps=12&rest=90', {
      state: { workoutConfig: submitted },
    });
  });

  test('Custom values remain editable and persist while switching information tabs', () => {
    render(<LungePage />);

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Sets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Reps per Set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Rest Time' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Muscles' }));

    expect(screen.getByRole('heading', { name: 'Muscles Worked' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByLabelText('Sets: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 11')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 75 sec')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Reps per Set' })).toBeEnabled();
  });
});
