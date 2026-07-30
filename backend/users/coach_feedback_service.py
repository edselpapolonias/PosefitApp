import json
import os
import re
import socket
from urllib import error as urlerror
from urllib import request as urlrequest

AI_FEEDBACK_UNAVAILABLE_MESSAGE = 'AI Coach Feedback is currently unavailable. Your workout statistics are still available for review.'
DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
GEMINI_ENDPOINT_TEMPLATE = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'


class GeminiConfigError(RuntimeError):
    def __init__(self, message, error_type='config_error'):
        super().__init__(message)
        self.error_type = error_type


class GeminiServiceError(RuntimeError):
    def __init__(self, message, error_type='service_error'):
        super().__init__(message)
        self.error_type = error_type


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return default


def _normalize_reason_counts(raw_counts):
    if isinstance(raw_counts, dict):
        return {str(key): _safe_int(value, 0) for key, value in raw_counts.items()}
    if isinstance(raw_counts, list):
        normalized = {}
        for item in raw_counts:
            if isinstance(item, dict):
                reason = item.get('reason')
                count = _safe_int(item.get('count'), 0)
                if reason:
                    normalized[str(reason)] = count
        return normalized
    return {}


def _normalize_set_results(set_results):
    normalized = []
    for item in set_results or []:
        if isinstance(item, dict):
            good_reps = _safe_int(item.get('goodReps', item.get('correctReps', 0)), 0)
            bad_reps = _safe_int(item.get('badReps', item.get('incorrectReps', 0)), 0)
            total_attempts = good_reps + bad_reps
            normalized.append({
                'setNumber': _safe_int(item.get('setNumber', item.get('setNum', 0)), 0),
                'goodReps': good_reps,
                'incorrectReps': bad_reps,
                'duration': _safe_int(item.get('duration', item.get('setDuration', 0)), 0),
                'accuracy': _safe_int(item.get('accuracy', round((good_reps / total_attempts) * 100) if total_attempts else 0), 0),
            })
    return normalized


def _normalize_angle_stats(summary):
    angle_stats = summary.get('angleStats') or {}
    if isinstance(angle_stats, dict) and angle_stats:
        return {
            'minDeepestAngle': _safe_int(angle_stats.get('minDeepestAngle', 0), 0),
            'maxDeepestAngle': _safe_int(angle_stats.get('maxDeepestAngle', 0), 0),
            'averageDeepestAngle': _safe_int(angle_stats.get('averageDeepestAngle', 0), 0),
        }

    rep_angles = summary.get('repAngles') or summary.get('deepestAngles') or []
    if isinstance(rep_angles, list) and rep_angles:
        values = [_safe_int(item, None) for item in rep_angles]
        values = [value for value in values if value is not None]
        if values:
            return {
                'minDeepestAngle': min(values),
                'maxDeepestAngle': max(values),
                'averageDeepestAngle': round(sum(values) / len(values)),
            }

    return {}


def normalize_exercise_request(data):
    request_data = data or {}
    exercise = str(request_data.get('exercise') or request_data.get('exerciseName') or 'squat').strip().lower()
    summary = request_data.get('summary') or request_data.get('stats') or request_data.get('workoutStats') or request_data
    if not isinstance(summary, dict):
        summary = {}

    valid_reps = _safe_int(summary.get('correctReps', summary.get('validReps', summary.get('goodReps', 0))), 0)
    incorrect_reps = _safe_int(summary.get('incorrectReps', summary.get('badReps', 0)), 0)
    total_attempts = _safe_int(summary.get('totalAttempts', valid_reps + incorrect_reps), valid_reps + incorrect_reps)
    accuracy = _safe_int(summary.get('accuracy', round((valid_reps / total_attempts) * 100) if total_attempts else 0), 0)
    duration = _safe_int(summary.get('duration', summary.get('sessionDuration', 0)), 0)

    normalized_summary = {
        'correctReps': valid_reps,
        'incorrectReps': incorrect_reps,
        'totalAttempts': total_attempts,
        'accuracy': accuracy,
        'duration': duration,
        'setResults': _normalize_set_results(summary.get('setResults') or summary.get('setSummaries') or []),
        'mistakes': _normalize_reason_counts(summary.get('mistakes') or summary.get('incorrectReasonCounts') or summary.get('incorrectReasons') or {}),
        'angleStats': _normalize_angle_stats(summary),
        'sessionMeta': {
            'totalSets': _safe_int(summary.get('totalSets', 0), 0),
            'totalRepsPerSet': _safe_int(summary.get('totalRepsPerSet', 0), 0),
            'restTimeSetting': _safe_int(summary.get('restTimeSetting', 0), 0),
        },
    }

    return {
        'exercise': exercise,
        'summary': normalized_summary,
    }


def _build_system_instruction():
    return (
        'You are an AI fitness coach. '
        'The user\'s exercise has already been analyzed by a biomechanics-based computer vision system. '
        'Do NOT determine whether repetitions are correct or incorrect. '
        'Do NOT analyze movement. '
        'Do NOT invent mistakes. '
        'Only interpret the workout statistics provided. '
        'Generate the following sections: Overall Performance, Strengths, Areas for Improvement, Personalized Recommendations, and Encouraging Closing Message. '
        'Maximum 150 words. '
        'Friendly and encouraging. '
        'Professional tone. '
        'Base every recommendation only on the detected mistakes. '
        'If accuracy is high, acknowledge good performance. '
        'If multiple mistakes exist, prioritize the most frequent ones.'
    )


def _build_request_body(payload):
    return {
        'systemInstruction': {
            'parts': [
                {
                    'text': _build_system_instruction(),
                }
            ],
        },
        'contents': [
            {
                'role': 'user',
                'parts': [
                    {
                        'text': json.dumps(payload, ensure_ascii=False),
                    }
                ],
            }
        ],
        'generationConfig': {
            'temperature': 0.6,
            'maxOutputTokens': 2048,
            'responseMimeType': 'application/json',
            'responseSchema': {
                'type': 'OBJECT',
                'properties': {
                    'overallPerformance': {'type': 'STRING'},
                    'strengths': {
                        'type': 'ARRAY',
                        'items': {'type': 'STRING'}
                    },
                    'areasForImprovement': {
                        'type': 'ARRAY',
                        'items': {'type': 'STRING'}
                    },
                    'recommendations': {
                        'type': 'ARRAY',
                        'items': {'type': 'STRING'}
                    },
                    'encouragement': {'type': 'STRING'}
                },
                'required': ['overallPerformance', 'strengths', 'areasForImprovement', 'recommendations', 'encouragement']
            }
        },
    }


def _http_error_type(code, error_body):
    error_text = (error_body or '').lower()
    if code == 401:
        return 'unauthorized'
    if code == 403:
        if 'api key' in error_text or 'authentication' in error_text:
            return 'invalid_api_key'
        return 'forbidden'
    if code == 400:
        if 'api key' in error_text or ('key' in error_text and 'invalid' in error_text):
            return 'invalid_api_key'
        return 'bad_request'
    if code == 404:
        return 'model_not_found'
    if code == 408:
        return 'request_timeout'
    if code == 429:
        return 'rate_limited'
    if 500 <= code <= 599:
        return 'provider_error'
    return 'http_error'


def _url_error_type(exc):
    reason = getattr(exc, 'reason', None)
    if isinstance(reason, TimeoutError):
        return 'timeout'
    if isinstance(reason, socket.gaierror):
        return 'dns_error'
    if isinstance(reason, ConnectionRefusedError):
        return 'connection_refused'
    if isinstance(reason, OSError):
        errno_value = getattr(reason, 'errno', None)
        winerror_value = getattr(reason, 'winerror', None)
        if errno_value in (11001, 11004) or winerror_value in (11001, 11004):
            return 'dns_error'
        if errno_value in (111, 10061) or winerror_value in (111, 10061):
            return 'connection_refused'
        if errno_value in (104, 10054) or winerror_value in (104, 10054):
            return 'connection_reset'
    return 'network_error'


def _extract_feedback_text(response_data):
    candidates = response_data.get('candidates') or []
    for candidate in candidates:
        content = candidate.get('content') or {}
        parts = content.get('parts') or []
        text_chunks = []
        for part in parts:
            if isinstance(part, dict) and part.get('text'):
                text_chunks.append(str(part['text']))
        text = ''.join(text_chunks).strip()
        if text:
            return text
    raise GeminiServiceError('Gemini response did not include feedback text.')


def _strip_code_fences(text):
    cleaned = text.strip()
    fence_match = re.match(r'^```(?:json)?\s*(.*?)\s*```$', cleaned, flags=re.IGNORECASE | re.DOTALL)
    if fence_match:
        return fence_match.group(1).strip()
    return cleaned


def _normalize_feedback(feedback):
    if not isinstance(feedback, dict):
        raise GeminiServiceError('Gemini feedback was not returned as JSON.')

    def _normalize_list(value):
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [line.strip() for line in value.split('\n') if line.strip()]
        return []

    return {
        'overallPerformance': str(feedback.get('overallPerformance', '')).strip(),
        'strengths': _normalize_list(feedback.get('strengths')),
        'areasForImprovement': _normalize_list(feedback.get('areasForImprovement')),
        'recommendations': _normalize_list(feedback.get('recommendations')),
        'encouragement': str(feedback.get('encouragement', '')).strip(),
    }


def generate_exercise_coach_feedback(data):
    payload = normalize_exercise_request(data)
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise GeminiConfigError('GEMINI_API_KEY is not configured.', error_type='missing_api_key')

    model = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL)
    request_body = _build_request_body(payload)
    req = urlrequest.Request(
        url=GEMINI_ENDPOINT_TEMPLATE.format(model=model, api_key=api_key),
        data=json.dumps(request_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urlrequest.urlopen(req, timeout=30) as response:
            raw = response.read().decode('utf-8')
    except urlerror.HTTPError as exc:
        error_body = exc.read().decode('utf-8', errors='replace') if exc.fp else ''
        error_type = _http_error_type(exc.code, error_body)
        raise GeminiServiceError(
            f'Gemini request failed with HTTP {exc.code}: {error_body}',
            error_type=error_type,
        ) from exc
    except (urlerror.URLError, TimeoutError) as exc:
        error_type = 'timeout' if isinstance(exc, TimeoutError) else _url_error_type(exc)
        raise GeminiServiceError(f'Gemini request failed: {exc}', error_type=error_type) from exc

    try:
        response_data = json.loads(raw)
        feedback_text = _extract_feedback_text(response_data)
        return _normalize_feedback(json.loads(_strip_code_fences(feedback_text)))
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiServiceError(f'Failed to parse Gemini response: {exc}', error_type='parse_error') from exc
