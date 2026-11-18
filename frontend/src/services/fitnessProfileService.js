import axios from 'axios';
import { apiUrl } from './apiConfig';
import { getCsrfToken } from './sessionHistoryService';

const FITNESS_PROFILE_URL = apiUrl('/api/users/fitness-profile/');

export async function getFitnessProfile() {
  const response = await axios.get(FITNESS_PROFILE_URL, {
    withCredentials: true,
    timeout: 10000,
  });
  return response.data;
}

export async function saveFitnessProfile(profile) {
  const csrfToken = await getCsrfToken();
  const response = await axios.put(
    FITNESS_PROFILE_URL,
    profile,
    {
      withCredentials: true,
      headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
      timeout: 10000,
    },
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('posefit:fitness-profile-updated', { detail: response.data }));
  }
  return response.data;
}

export function fitnessProfileError(error, fallback) {
  return error?.response?.data?.error || error?.response?.data?.detail || fallback;
}
