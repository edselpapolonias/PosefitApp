import axios from 'axios';
import { apiUrl } from './apiConfig';
import { getCsrfToken } from './sessionHistoryService';

export async function fetchActiveWorkoutPlan(signal) {
  const response = await axios.get(apiUrl('/api/users/workout-plans/active/'), { withCredentials: true, timeout: 15000, signal });
  return response.data.plan;
}

async function post(path, data) {
  const token = await getCsrfToken();
  return axios.post(apiUrl(path), data, { withCredentials: true, timeout: 15000, headers: { 'X-CSRFToken': token } });
}

export async function startWorkoutPlan(planId, startDate) {
  // Do not silently replace an older locally activated plan of another type.
  let stored;
  try { stored = JSON.parse(sessionStorage.getItem('posefitActiveWorkoutPlan')); } catch { /* No valid legacy plan. */ }
  if (stored?.id && stored.id !== planId) throw new Error('You already have an active workout plan. End it before starting this plan.');
  const response = await post('/api/users/workout-plans/active/', { planId, startDate });
  return response.data.plan;
}

export const startBeginnerPlan = (startDate) => startWorkoutPlan('beginner-full-body', startDate);
export const startLowerBodyPlan = (startDate) => startWorkoutPlan('lower-body-focus', startDate);

export async function endWorkoutPlan(plan) {
  await post('/api/users/workout-plans/end/', { instanceId: plan.instanceId });
  sessionStorage.removeItem('posefitActiveWorkoutPlan');
}
