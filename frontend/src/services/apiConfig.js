const browserApiOrigin = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000';

export const API_BASE_URL = (
    process.env.REACT_APP_API_BASE_URL || browserApiOrigin
).replace(/\/$/, '');

export function apiUrl(path) {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
