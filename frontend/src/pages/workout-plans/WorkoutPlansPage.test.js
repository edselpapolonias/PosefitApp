import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkoutPlansPage from './WorkoutPlansPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

describe('Workout Plans page', () => {
  beforeEach(() => mockNavigate.mockClear());

  test('shows exactly the three supported plans with current exercises', () => {
    render(<WorkoutPlansPage />);

    expect(screen.getByTestId('navbar')).toHaveTextContent('Workout Plans');
    expect(screen.getByText('WORKOUT PLANS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose Your Workout Plan' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Workout plans' });
    expect(within(plans).getAllByRole('article')).toHaveLength(3);
    expect(within(plans).getByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
    expect(within(plans).getByRole('heading', { name: 'Lower Body Focus' })).toBeInTheDocument();
    expect(within(plans).getByRole('heading', { name: 'Core & Upper Body' })).toBeInTheDocument();
    expect(within(plans).getByText('Recommended')).toBeInTheDocument();
    expect(within(plans).queryByText('Most Popular')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Body Challenge')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sit-up/i)).not.toBeInTheDocument();
    expect(within(plans).getAllByText('Leg Raise')).toHaveLength(2);
  });

  test('filters plans by level and provides an Advanced empty state', () => {
    render(<WorkoutPlansPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Beginner Full Body' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('heading', { name: 'No advanced plans yet' })).toBeInTheDocument();
  });

  test('preserves each plan-details route', () => {
    render(<WorkoutPlansPage />);

    const buttons = screen.getAllByRole('button', { name: 'View Plan Details' });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    expect(mockNavigate.mock.calls.map(([route]) => route)).toEqual([
      '/workout-plans/beginner-full-body',
      '/workout-plans/lower-body-focus',
      '/workout-plans/core-upper-body',
    ]);
  });
});
