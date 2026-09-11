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

export async function startBeginnerPlan(startDate) {
  // Do not silently replace an older locally activated plan of another type.
  let stored;
  try { stored = JSON.parse(sessionStorage.getItem('posefitActiveWorkoutPlan')); } catch { /* No valid legacy plan. */ }
  if (stored?.id && stored.id !== 'beginner-full-body') throw new Error('You already have an active workout plan. End it before starting this plan.');
  const response = await post('/api/users/workout-plans/active/', { planId: 'beginner-full-body', startDate });
  return response.data.plan;
}

export async function endWorkoutPlan(plan) {
  await post('/api/users/workout-plans/end/', { instanceId: plan.instanceId });
  sessionStorage.removeItem('posefitActiveWorkoutPlan');
}
