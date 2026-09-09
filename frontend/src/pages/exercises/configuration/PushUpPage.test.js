import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PushUpPage from './PushUpPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../../components/Navbar', () => function MockNavbar() {
  return <div data-testid="navbar" />;
});

describe('Push-up configuration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

  test('uses Push-up preset values and submits locked presets to the camera page', () => {
    render(<PushUpPage />);

    expect(screen.getByLabelText('Sets: 3, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 8, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 60 sec, locked')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Intermediate/ }));
    expect(screen.getByLabelText('Sets: 4, locked')).toBeInTheDocument();
    expect(screen.getByLabelText('Reps per Set: 10, locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Reps per Set' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Start Workout' }));
    const submitted = { sets: 4, reps: 10, rest: 60, preset: 'intermediate' };
    expect(JSON.parse(sessionStorage.getItem('posefitPushUpWorkoutConfig'))).toEqual(submitted);
    expect(mockNavigate).toHaveBeenCalledWith('/exercises/push-up/start?sets=4&reps=10&rest=60', {
      state: { workoutConfig: submitted },
    });
  });

  test('keeps Custom values while switching between Overview and Muscles', () => {
    render(<PushUpPage />);

    fireEvent.click(screen.getByRole('button', { name: /Custom/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Reps per Set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Rest Time' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Muscles' }));

    expect(screen.getByRole('heading', { name: 'Muscles Worked' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(screen.getByLabelText('Reps per Set: 9')).toBeInTheDocument();
    expect(screen.getByLabelText('Rest Time: 75 sec')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Increase Sets' })).toBeEnabled();
  });
});
