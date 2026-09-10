import axios from 'axios';
import { apiUrl } from './apiConfig';

export async function getDashboard(signal) {
  const response = await axios.get(apiUrl('/api/users/dashboard/'), {
    withCredentials: true, timeout: 15000, signal,
  });
  return response.data;
}
