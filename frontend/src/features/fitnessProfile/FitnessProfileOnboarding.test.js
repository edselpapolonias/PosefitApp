import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FitnessProfileOnboardingGate, {
  FitnessProfileOnboarding,
  PROFILE_STATUS_RETRY_DELAYS,
} from './FitnessProfileOnboarding';
import { getFitnessProfile, saveFitnessProfile } from '../../services/fitnessProfileService';

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
}), { virtual: true });

jest.mock('../../services/fitnessProfileService', () => ({
  getFitnessProfile: jest.fn(),
  saveFitnessProfile: jest.fn(),
  fitnessProfileError: (_error, fallback) => fallback,
}));

const initialData = {
  user: { age: 21 },
  profile: {
    fitnessLevel: '',
    exerciseExperience: '',
    workoutFocus: '',
    physicalLimitations: '',
    affectedAreas: [],
  },
  shouldOnboard: true,
};

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ username: 'new-user' }));
  getFitnessProfile.mockReset();
  saveFitnessProfile.mockReset();
});

test('uses the sign-up age as read-only and skips affected areas when limitations are No', async () => {
  const onComplete = jest.fn();
  saveFitnessProfile.mockResolvedValue({ ...initialData, user: { age: 21 }, shouldOnboard: false });
  render(<FitnessProfileOnboarding initialData={initialData} onComplete={onComplete} />);

  const age = screen.getByLabelText('Age');
  expect(age).toHaveValue('21');
  expect(age).toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /Beginner/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Less than 6 months' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /General fitness \/ Full body/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  await waitFor(() => expect(saveFitnessProfile).toHaveBeenCalledWith({
    age: 21,
    fitnessLevel: 'beginner',
    exerciseExperience: 'less_than_6_months',
    workoutFocus: 'full_body',
    physicalLimitations: 'no',
    affectedAreas: [],
  }));
  expect(onComplete).toHaveBeenCalled();
});

test('shows the optional sixth step for Yes and allows the disclosure to be skipped', async () => {
  saveFitnessProfile.mockResolvedValue({ ...initialData, shouldOnboard: false });
  render(<FitnessProfileOnboarding initialData={initialData} onComplete={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /Intermediate/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: '1-2 years' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /Lower body \/ Legs and glutes/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
  expect(screen.getByText('Step 5 of 6')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByRole('heading', { name: 'Which Areas Are Affected?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Skip this question' }));

  await waitFor(() => expect(saveFitnessProfile).toHaveBeenCalledWith(expect.objectContaining({
    workoutFocus: 'lower_body',
    physicalLimitations: 'yes',
    affectedAreas: [],
  })));
});

test('requires a workout focus before advancing to physical limitations', () => {
  render(<FitnessProfileOnboarding initialData={initialData} onComplete={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /Beginner/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Less than 6 months' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  expect(screen.getByRole('heading', { name: 'What Would You Like to Focus On?' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('allows no preference while still completing the required workout-focus step', async () => {
  saveFitnessProfile.mockResolvedValue({ ...initialData, shouldOnboard: false });
  render(<FitnessProfileOnboarding initialData={initialData} onComplete={jest.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /Beginner/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Less than 6 months' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: /No preference \/ Prefer not to say/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  await waitFor(() => expect(saveFitnessProfile).toHaveBeenCalledWith(expect.objectContaining({
    workoutFocus: 'prefer_not_to_say',
  })));
});

test('retries temporary profile-status failures before showing onboarding', async () => {
  jest.useFakeTimers();
  getFitnessProfile
    .mockRejectedValueOnce(new Error('temporary failure'))
    .mockRejectedValueOnce(new Error('temporary failure'))
    .mockResolvedValue(initialData);

  render(<FitnessProfileOnboardingGate />);
  expect(screen.getByText('Checking your fitness profile...')).toBeInTheDocument();

  await act(async () => { await Promise.resolve(); });
  await act(async () => {
    jest.advanceTimersByTime(PROFILE_STATUS_RETRY_DELAYS[0]);
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(PROFILE_STATUS_RETRY_DELAYS[1]);
    await Promise.resolve();
  });

  expect(getFitnessProfile).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('heading', { name: 'Tell Us Your Age' })).toBeInTheDocument();
  jest.useRealTimers();
});

test('shows a retry action instead of silently bypassing onboarding', async () => {
  jest.useFakeTimers();
  getFitnessProfile.mockRejectedValue(new Error('service unavailable'));
  render(<FitnessProfileOnboardingGate />);

  await act(async () => { await Promise.resolve(); });
  await act(async () => {
    jest.advanceTimersByTime(PROFILE_STATUS_RETRY_DELAYS[0]);
    await Promise.resolve();
  });
  await act(async () => {
    jest.advanceTimersByTime(PROFILE_STATUS_RETRY_DELAYS[1]);
    await Promise.resolve();
  });

  expect(screen.getByRole('heading', { name: 'Unable to Verify Your Profile' })).toBeInTheDocument();
  getFitnessProfile.mockReset();
  getFitnessProfile.mockResolvedValue({ ...initialData, shouldOnboard: false });
  fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  await act(async () => { await Promise.resolve(); });

  expect(getFitnessProfile).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('heading', { name: 'Unable to Verify Your Profile' })).not.toBeInTheDocument();
  jest.useRealTimers();
});
