import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import ExerciseConsideration from './ExerciseConsideration';
import { getFitnessProfile } from '../../services/fitnessProfileService';
import { EXERCISE_CONSIDERATIONS, getExerciseConsiderations } from './exerciseConsiderations';

jest.mock('../../services/fitnessProfileService', () => ({
  getFitnessProfile: jest.fn(),
}));

beforeEach(() => {
  localStorage.setItem('user', JSON.stringify({ username: 'profile-user' }));
  getFitnessProfile.mockReset();
});

test('defines the required relevant-area mapping for every exercise', () => {
  expect(Object.fromEntries(Object.entries(EXERCISE_CONSIDERATIONS).map(([key, value]) => [key, value.relevantAreas]))).toEqual({
    squat: ['knee', 'hip', 'back'],
    'push-up': ['shoulder', 'wrist', 'back'],
    plank: ['shoulder', 'wrist', 'back', 'hip'],
    lunge: ['knee', 'hip', 'back'],
    'leg-raise': ['hip', 'back'],
  });
  expect(getExerciseConsiderations('squat', ['shoulder'])).toBeNull();
  expect(getExerciseConsiderations('squat', ['other']).items[0].area).toBe('other');
});

test('renders multiple relevant areas inside one consideration card', async () => {
  getFitnessProfile.mockResolvedValue({
    profile: {
      onboardingCompleted: true,
      physicalLimitations: 'yes',
      affectedAreas: ['knee', 'back', 'wrist'],
    },
  });
  render(<ExerciseConsideration exerciseId="squat" />);

  const card = await screen.findByRole('complementary', { name: 'Exercise Consideration' });
  expect(within(card).getByText('Knee')).toBeInTheDocument();
  expect(within(card).getByText('Back')).toBeInTheDocument();
  expect(within(card).queryByText('Wrist')).not.toBeInTheDocument();
  expect(screen.getAllByRole('complementary')).toHaveLength(1);
});

test('does not render a personalized notice for No', async () => {
  getFitnessProfile.mockResolvedValue({
    profile: {
      onboardingCompleted: true,
      physicalLimitations: 'no',
      affectedAreas: ['knee'],
    },
  });
  const { container } = render(<ExerciseConsideration exerciseId="squat" />);

  await waitFor(() => expect(getFitnessProfile).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
