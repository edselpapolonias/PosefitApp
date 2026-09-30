import axios from 'axios';
import { apiUrl } from './apiConfig';

export async function getHistory({ page = 1, search = '', signal } = {}) {
  const response = await axios.get(apiUrl('/api/users/history/'), {
    withCredentials: true,
    params: { page, ...(search ? { search } : {}) },
    signal,
  });
  return response.data;
}

export async function getHistorySession(sessionId, signal) {
  const response = await axios.get(
    apiUrl(`/api/users/history/sessions/${encodeURIComponent(sessionId)}/`),
    { withCredentials: true, signal },
  );
  return response.data?.session || null;
}

export async function getPlanHistory(instanceId, signal) {
  const response = await axios.get(
    apiUrl(`/api/users/history/plans/${encodeURIComponent(instanceId)}/`),
    { withCredentials: true, signal },
  );
  return response.data?.plan || null;
}
