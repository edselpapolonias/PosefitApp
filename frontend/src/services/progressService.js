import axios from 'axios';
import { apiUrl } from './apiConfig';

export async function getProgress(range = '30d', signal) {
  const response = await axios.get(apiUrl('/api/users/progress/'), {
    withCredentials: true,
    params: { range },
    signal,
  });
  return response.data;
}
