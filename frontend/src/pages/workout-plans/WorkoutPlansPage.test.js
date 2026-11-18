import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkoutPlansPage from './WorkoutPlansPage';
import { getFitnessProfile } from '../../services/fitnessProfileService';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../components/Navbar', () => function MockNavbar({ activeItem }) {
  return <div data-testid="navbar">{activeItem}</div>;
});

jest.mock('../../services/fitnessProfileService', () => ({
  getFitnessProfile: jest.fn(),
  fitnessProfileError: (_error, fallback) => fallback,
}));

const profileData = {
  profile: {
    fitnessLevel: 'intermediate',
    workoutFocus: 'lower_body',
    physicalLimitations: 'no',
    affectedAreas: [],
  },
};

describe('Workout Plans page', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    getFitnessProfile.mockReset();
    getFitnessProfile.mockResolvedValue(profileData);
  });

  test('shows exactly the three supported plans and marks the personalized match', async () => {
    render(<WorkoutPlansPage />);

    expect(screen.getByTestId('navbar')).toHaveTextContent('Workout Plans');
    expect(screen.getByText('WORKOUT PLANS')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Choose Your Workout Plan' })).toBeInTheDocument();
    const plans = screen.getByRole('region', { name: 'Workout plans' });
    expect(within(plans).getAllByRole('article')).toHaveLength(3);
    expect(within(plans).getByRole('heading', { name: 'Beginner Full Body' })).toBeInTheDocument();
    expect(within(plans).getByRole('heading', { name: 'Lower Body Focus' })).toBeInTheDocument();
    expect(within(plans).getByRole('heading', { name: 'Core & Upper Body' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Suggested plan — Lower Body Focus' })).toBeInTheDocument();
    const lowerBodyCard = within(plans).getByRole('heading', { name: 'Lower Body Focus' }).closest('article');
    expect(within(lowerBodyCard).getByText('Recommended for you')).toBeInTheDocument();
    expect(within(plans).queryByText('Recommended', { exact: true })).not.toBeInTheDocument();
    expect(within(plans).queryByText('Most Popular')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Body Challenge')).not.toBeInTheDocument();
    expect(screen.queryByText(/Sit-up/i)).not.toBeInTheDocument();
    expect(within(plans).getAllByText('Leg Raise')).toHaveLength(2);
  });

  test('filters plans by level and provides an Advanced empty state', async () => {
    render(<WorkoutPlansPage />);
    await screen.findByRole('heading', { name: 'Suggested plan — Lower Body Focus' });

    fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Beginner Full Body' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('heading', { name: 'No advanced plans yet' })).toBeInTheDocument();
  });

  test('preserves each plan-details route', async () => {
    render(<WorkoutPlansPage />);
    await screen.findByRole('heading', { name: 'Suggested plan — Lower Body Focus' });

    const buttons = screen.getAllByRole('button', { name: 'View Plan Details' });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    fireEvent.click(buttons[2]);

    expect(mockNavigate.mock.calls.map(([route]) => route)).toEqual([
      '/workout-plans/lower-body-focus',
      '/workout-plans/beginner-full-body',
      '/workout-plans/core-upper-body',
    ]);
  });

  test('invites older profiles with no workout focus to complete their profile', async () => {
    getFitnessProfile.mockResolvedValue({
      profile: { ...profileData.profile, workoutFocus: '' },
    });

    render(<WorkoutPlansPage />);

    expect(await screen.findByRole('heading', { name: 'Complete your fitness profile' })).toBeInTheDocument();
    expect(screen.getByText(/workout focus/i)).toBeInTheDocument();
    expect(screen.queryByText('Recommended for you')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Complete profile' }));
    expect(mockNavigate).toHaveBeenCalledWith('/user');
  });

  test('shows no personalized match card or badge when the user chooses no preference', async () => {
    getFitnessProfile.mockResolvedValue({
      profile: { ...profileData.profile, workoutFocus: 'prefer_not_to_say' },
    });

    render(<WorkoutPlansPage />);

    await waitFor(() => expect(screen.queryByText('Preparing your plan suggestion')).not.toBeInTheDocument());
    expect(screen.queryByText(/Suggested plan/)).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended for you')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  test('keeps plans accessible and allows retry when profile retrieval fails', async () => {
    getFitnessProfile.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(profileData);
    render(<WorkoutPlansPage />);

    expect(await screen.findByRole('heading', { name: 'Personalized suggestion unavailable' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Suggested plan — Lower Body Focus' })).toBeInTheDocument();
    expect(getFitnessProfile).toHaveBeenCalledTimes(2);
  });

  test('refreshes the suggestion when a saved profile update is announced', async () => {
    render(<WorkoutPlansPage />);
    expect(await screen.findByRole('heading', { name: 'Suggested plan — Lower Body Focus' })).toBeInTheDocument();

    fireEvent(window, new CustomEvent('posefit:fitness-profile-updated', {
      detail: {
        profile: {
          ...profileData.profile,
          workoutFocus: 'core_upper_body',
        },
      },
    }));

    expect(await screen.findByRole('heading', { name: 'Suggested plan — Core & Upper Body' })).toBeInTheDocument();
    const coreCard = screen.getByRole('heading', { name: 'Core & Upper Body' }).closest('article');
    expect(within(coreCard).getByText('Recommended for you')).toBeInTheDocument();
  });
});
