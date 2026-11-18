import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import UserProfilePage from './UserProfilePage';
import { getFitnessProfile, saveFitnessProfile } from '../../services/fitnessProfileService';

jest.mock('../../components/Navbar', () => () => <div data-testid="navbar" />);
jest.mock('../../services/fitnessProfileService', () => ({
  getFitnessProfile: jest.fn(),
  saveFitnessProfile: jest.fn(),
  fitnessProfileError: (_error, fallback) => fallback,
}));

const profileData = {
  user: {
    username: 'pose-user',
    firstName: 'Pose',
    lastName: 'User',
    email: '',
    age: 28,
  },
  profile: {
    fitnessLevel: 'intermediate',
    exerciseExperience: '1_to_2_years',
    workoutFocus: 'lower_body',
    physicalLimitations: 'yes',
    affectedAreas: ['knee'],
    onboardingCompleted: true,
  },
  shouldOnboard: false,
};

beforeEach(() => {
  getFitnessProfile.mockResolvedValue(profileData);
  saveFitnessProfile.mockReset();
});

test('displays profile information and clears old areas when limitations change to No', async () => {
  saveFitnessProfile.mockImplementation(async (payload) => ({
    ...profileData,
    user: { ...profileData.user, age: payload.age },
    profile: {
      ...profileData.profile,
      workoutFocus: payload.workoutFocus,
      physicalLimitations: payload.physicalLimitations,
      affectedAreas: payload.affectedAreas,
    },
  }));
  render(<UserProfilePage />);

  expect((await screen.findAllByText('Pose User')).length).toBeGreaterThan(0);
  expect(screen.getByRole('region', { name: 'Profile overview' })).toBeInTheDocument();
  expect(screen.getByText('Personalized')).toBeInTheDocument();
  expect(screen.getByText('Knee')).toBeInTheDocument();
  expect(screen.getByText('Lower body / Legs and glutes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
  fireEvent.click(screen.getByRole('radio', { name: /Core and upper body/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(saveFitnessProfile).toHaveBeenCalledWith(expect.objectContaining({
    workoutFocus: 'core_upper_body',
    physicalLimitations: 'no',
    affectedAreas: [],
  })));
  expect(await screen.findByText(/Profile Updated Successfully/)).toBeInTheDocument();
  expect(screen.getByText('Core and upper body')).toBeInTheDocument();
});
