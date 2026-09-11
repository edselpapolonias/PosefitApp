import axios from 'axios';
import { apiUrl } from './apiConfig';

const CSRF_STORAGE_KEY = 'posefit-csrf-token';
const CSRF_URL = apiUrl('/api/users/csrf/');
const COMPLETE_SESSION_URL = apiUrl('/api/users/sessions/complete/');

let csrfRequest;

function readStoredCsrfToken() {
    try {
        return sessionStorage.getItem(CSRF_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

function storeCsrfToken(token) {
    if (!token) return;
    try {
        sessionStorage.setItem(CSRF_STORAGE_KEY, token);
    } catch {
        // The token can still be used for this request if storage is unavailable.
    }
}

export async function getCsrfToken() {
    const storedToken = readStoredCsrfToken();
    if (storedToken) return storedToken;

    if (!csrfRequest) {
        csrfRequest = axios.get(CSRF_URL, { withCredentials: true })
            .then((response) => {
                const token = response.data?.csrf_token || '';
                storeCsrfToken(token);
                return token;
            })
            .finally(() => {
                csrfRequest = null;
            });
    }
    return csrfRequest;
}

export async function saveSessionAndGetComparison(sessionResult) {
    if (!sessionResult?.id) {
        throw new Error('A completed session result is required.');
    }

    const csrfToken = await getCsrfToken();
    const response = await axios.post(
        COMPLETE_SESSION_URL,
        sessionResult,
        {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRFToken': csrfToken } : {},
            timeout: 15000,
        }
    );
    return response.data?.comparison || null;
}
