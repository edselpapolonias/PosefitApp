import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlankPage from './PlankPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../components/Navbar', () => function MockNavbar() {
  return <div data-testid="navbar" />;
});

describe('Plank configuration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

  test('uses timed Plank presets and submits hold time without a reps value', () => {
    render(<PlankPage />);

    expect(screen.getByLabelText('Sets: 3, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Hold Time: 20 sec, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 60 sec, locked')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Reps per Set/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Strength/ }));
    expect(screen.getByLabelText('Sets: 4, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Hold Time: 60 sec, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 90 sec, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Hold Time' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
    const submitted = { sets: 4, hold: 60, rest: 90, preset: 'strength' };
    expect(JSON.parse(sessionStorage.getItem('posefitPlankWorkoutConfig'))).toEqual(submitted);
    expect(mockNavigate).toHaveBeenCalledWith('/exercises/plank/start?sets=4&hold=60&rest=90', {
      state: { workoutConfig: submitted },
    });
  });

  test('Custom unlocks timed controls and preserves values across tabs', () => {
    render(<PlankPage />);

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Sets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Hold Time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Rest Time' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Muscles' }));

    expect(screen.getByRole('heading', { name: 'Muscles Worked' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByLabelText('Sets: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Hold Time: 25 sec')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 75 sec')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Hold Time' })).toBeEnabled();
  });
});
