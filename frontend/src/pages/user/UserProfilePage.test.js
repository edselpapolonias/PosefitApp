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
      physicalLimitations: payload.physicalLimitations,
      affectedAreas: payload.affectedAreas,
    },
  }));
  render(<UserProfilePage />);

  expect(await screen.findByText('Pose User')).toBeInTheDocument();
  expect(screen.getByText('Knee')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Edit Profile/ }));
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(saveFitnessProfile).toHaveBeenCalledWith(expect.objectContaining({
    physicalLimitations: 'no',
    affectedAreas: [],
  })));
  expect(await screen.findByText(/Profile Updated Successfully/)).toBeInTheDocument();
});
