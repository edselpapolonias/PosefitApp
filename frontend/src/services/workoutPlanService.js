import axios from 'axios';
import { apiUrl } from './apiConfig';
import { getCsrfToken } from './sessionHistoryService';

export async function fetchActiveWorkoutPlans(signal) {
  const response = await axios.get(apiUrl('/api/users/workout-plans/active/'), { withCredentials: true, timeout: 15000, signal });
  return response.data.plans || (response.data.plan ? [response.data.plan] : []);
}

export async function fetchActiveWorkoutPlan(signal, planId) {
  const plans = await fetchActiveWorkoutPlans(signal);
  return planId ? plans.find((plan) => plan.id === planId) || null : plans[0] || null;
}

async function post(path, data) {
  const token = await getCsrfToken();
  return axios.post(apiUrl(path), data, { withCredentials: true, timeout: 15000, headers: { 'X-CSRFToken': token } });
}

export async function startWorkoutPlan(planId, startDate) {
  const response = await post('/api/users/workout-plans/active/', { planId, startDate });
  return response.data.plan;
}

export const startBeginnerPlan = (startDate) => startWorkoutPlan('beginner-full-body', startDate);
export const startLowerBodyPlan = (startDate) => startWorkoutPlan('lower-body-focus', startDate);
export const startCoreUpperPlan = (startDate) => startWorkoutPlan('core-upper-body', startDate);

export async function endWorkoutPlan(plan) {
  await post('/api/users/workout-plans/end/', { instanceId: plan.instanceId });
  sessionStorage.removeItem('posefitActiveWorkoutPlan');
}
