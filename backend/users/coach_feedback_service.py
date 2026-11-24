import json
import os
import re
import socket
import time
from urllib import error as urlerror
from urllib import request as urlrequest

AI_FEEDBACK_UNAVAILABLE_MESSAGE = 'AI Coach Feedback is currently unavailable. Your workout statistics are still available for review.'
DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
DEFAULT_GEMINI_FALLBACK_MODEL = 'gemini-2.5-flash-lite'
GEMINI_ENDPOINT_TEMPLATE = 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
GEMINI_REQUEST_TIMEOUT_SECONDS = 15
GEMINI_RETRY_DELAYS_SECONDS = (0.75,)
GEMINI_RETRYABLE_ERROR_TYPES = {
    'provider_error',
    'rate_limited',
    'request_timeout',
    'timeout',
    'connection_reset',
    'parse_error',
    'invalid_response',
}


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
        return {
            str(key).strip()[:120]: _safe_int(value, 0)
            for key, value in raw_counts.items()
            if str(key).strip() and _safe_int(value, 0) > 0
        }
    if isinstance(raw_counts, list):
        normalized = {}
        for item in raw_counts:
            if isinstance(item, dict):
                reason = item.get('reason')
                count = _safe_int(item.get('count'), 0)
                if reason and count > 0:
                    normalized[str(reason).strip()[:120]] = count
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

    mistakes = _normalize_reason_counts(summary.get('mistakes') or summary.get('incorrectReasonCounts') or summary.get('incorrectReasons') or {})
    # Structured detector output is authoritative; retain the legacy mistakes map.
    issues = {}
    for item in summary.get('formIssues', []) if isinstance(summary.get('formIssues'), list) else []:
        if not isinstance(item, dict):
            continue
        issue_id = str(item.get('issueId') or '').strip()[:160]
        label = str(item.get('label') or item.get('type') or '').strip()[:120]
        count = max(0, _safe_int(item.get('count')))
        if issue_id and label and count:
            issues[issue_id] = {
                'issueId': issue_id, 'label': label,
                'count': count + issues.get(issue_id, {}).get('count', 0),
            }
    form_issues = sorted(issues.values(), key=lambda item: -item['count'])
    if form_issues:
        mistakes = {item['label']: item['count'] for item in form_issues}
    most_frequent_issue = max(mistakes, key=mistakes.get) if mistakes else None

    normalized_summary = {
        'metricType': 'time' if summary.get('metricType') == 'time' else 'reps',
        'totalReps': _safe_int(summary.get('totalReps', total_attempts), total_attempts),
        'correctReps': valid_reps,
        'incorrectReps': incorrect_reps,
        'totalAttempts': total_attempts,
        'setsCompleted': _safe_int(summary.get('setsCompleted', 0), 0),
        'accuracy': max(0, min(100, accuracy)),
        'duration': duration,
        'totalHoldTime': _safe_int(summary.get('totalHoldTime', 0), 0),
        'setResults': _normalize_set_results(summary.get('setResults') or summary.get('setSummaries') or []),
        'mistakes': mistakes,
        'formIssues': form_issues,
        'mostFrequentFormIssue': most_frequent_issue,
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
        'You are the feedback-writing layer for PoseFit. All supplied detector results and statistics '
        'are final. Never decide or reinterpret which issues occurred, rep validity, or accuracy. '
        'Write a concise overall feedbackParagraph using only supplied performance statistics. '
        'Do not diagnose form issues in that paragraph. For EVERY entry in summary.formIssues, '
        'return one issueFeedback item with the exact issueId and a concise, actionable advice sentence. '
        'Address all supplied issues in descending occurrence count, including less frequent issues. '
        'Only explain the issue identified by that entry; never introduce other alignment, posture, '
        'joint, or technique problems. Never invent measurements, pain, injuries or medical conditions. '
        'Do not add IDs, labels or counts. The detector owns these fields. '
        'If formIssues is empty but legacy summary.mistakes is populated, briefly address ALL those '
        'recorded mistakes in the paragraph. If both are empty, give positive reinforcement and '
        'return an empty issueFeedback list. Keep each advice sentence under 30 words, and the '
        'overall paragraph under 90 words. Use plain beginner-friendly language, without markdown '
        'or medical advice.'
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
            'temperature': 0.2,
            # Gemini 2.5 Flash counts thinking tokens toward this limit. Disable
            # thinking for this simple rewrite task and leave enough room for a
            # complete JSON response; concision is enforced after parsing.
            'thinkingConfig': {
                'thinkingBudget': 0,
            },
            'maxOutputTokens': 2048,
            'responseMimeType': 'application/json',
            'responseSchema': {
                'type': 'OBJECT',
                'properties': {
                    'feedbackParagraph': {'type': 'STRING'},
                    'issueFeedback': {
                        'type': 'ARRAY',
                        'items': {
                            'type': 'OBJECT',
                            'properties': {'issueId': {'type': 'STRING'}, 'advice': {'type': 'STRING'}},
                            'required': ['issueId', 'advice'],
                        },
                    }
                },
                'required': ['feedbackParagraph', 'issueFeedback']
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


def _shorten_feedback_text(value, max_sentences=4, max_chars=620, max_words=90):
    text = ' '.join(str(value or '').split()).strip()
    if not text:
        return ''

    text = re.sub(
        r'(?i)\b(overall performance|what you did well|what to improve|most detected issue)\s*:\s*',
        '',
        text,
    )

    sentences = re.split(r'(?<=[.!?])\s+', text)
    shortened = ' '.join(sentences[:max_sentences]).strip()
    words = shortened.split()
    if len(words) > max_words:
        shortened = ' '.join(words[:max_words]).rstrip(' ,;:') + '.'
    if len(shortened) <= max_chars:
        return shortened

    clipped = shortened[:max_chars].rsplit(' ', 1)[0].rstrip(' ,;:')
    return f'{clipped}.' if clipped else ''


def _normalize_feedback(feedback, _payload):
    if not isinstance(feedback, dict):
        raise GeminiServiceError('Gemini feedback was not returned as JSON.')

    def _legacy_text(value):
        if isinstance(value, list):
            return ' '.join(str(item).strip() for item in value if str(item).strip())
        if isinstance(value, str):
            return value
        return ''

    paragraph = feedback.get('feedbackParagraph')
    if not paragraph:
        paragraph = ' '.join(filter(None, [
            _legacy_text(feedback.get('overallPerformance')),
            _legacy_text(feedback.get('whatYouDidWell') or feedback.get('strengths')),
            _legacy_text(
                feedback.get('whatToImprove')
                or feedback.get('areasForImprovement')
                or feedback.get('recommendations')
            ),
        ]))
    paragraph = _shorten_feedback_text(paragraph)
    if not paragraph:
        raise GeminiServiceError('Gemini feedback was missing its feedback paragraph.', error_type='invalid_response')

    result = {'feedbackParagraph': paragraph}
    allowed = {item['issueId'] for item in _payload['summary'].get('formIssues', [])}
    advice_by_id = {}
    for item in feedback.get('issueFeedback', []) if isinstance(feedback.get('issueFeedback'), list) else []:
        if isinstance(item, dict) and item.get('issueId') in allowed:
            advice = _shorten_feedback_text(item.get('advice'), max_sentences=1, max_words=30)
            if advice:
                advice_by_id.setdefault(item['issueId'], advice)
    if allowed:
        result['issueFeedback'] = [
            {'issueId': item['issueId'], 'advice': advice_by_id[item['issueId']]}
            for item in _payload['summary']['formIssues'] if item['issueId'] in advice_by_id
        ]
    return result


def build_detector_fallback_feedback(data):
    """Return useful, factual feedback when the optional AI provider is unavailable."""
    payload = normalize_exercise_request(data)
    exercise = payload['exercise'].replace('-', ' ').title()
    summary = payload['summary']
    accuracy = summary['accuracy']
    sets_completed = summary['setsCompleted']
    parts = []

    if summary['metricType'] == 'time':
        total_hold_time = summary['totalHoldTime']
        if total_hold_time > 0:
            parts.append(
                f'You recorded {total_hold_time} seconds of valid hold time in this {exercise} session '
                f'with {accuracy}% form accuracy.'
            )
        else:
            parts.append(f'Your {exercise} session was recorded with {accuracy}% form accuracy.')
    elif summary['totalAttempts'] > 0:
        parts.append(
            f'You completed {summary["totalAttempts"]} attempts in this {exercise} session, '
            f'including {summary["correctReps"]} correct repetitions, with {accuracy}% form accuracy.'
        )
    else:
        parts.append(f'Your {exercise} session was recorded with {accuracy}% form accuracy.')

    if sets_completed > 0:
        parts.append(f'You completed {sets_completed} {"set" if sets_completed == 1 else "sets"}.')

    issues = summary.get('formIssues') or []
    if issues:
        primary = issues[0]
        count = primary['count']
        parts.append(
            f'Your main detected form issue was {primary["label"]}, recorded '
            f'{count} {"time" if count == 1 else "times"}. Review the guidance below and use controlled movement in your next session.'
        )
    else:
        parts.append('No significant form issues were recorded. Continue using controlled movement and consistent technique.')

    return {
        'feedbackParagraph': _shorten_feedback_text(' '.join(parts)),
        'issueFeedback': [],
        'source': 'detector_fallback',
    }


def _request_gemini_feedback(payload, api_key, model):
    request_body = _build_request_body(payload)
    req = urlrequest.Request(
        url=GEMINI_ENDPOINT_TEMPLATE.format(model=model, api_key=api_key),
        data=json.dumps(request_body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urlrequest.urlopen(req, timeout=GEMINI_REQUEST_TIMEOUT_SECONDS) as response:
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
        feedback = _normalize_feedback(json.loads(_strip_code_fences(feedback_text)), payload)
        feedback['source'] = 'gemini'
        feedback['model'] = model
        return feedback
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError) as exc:
        raise GeminiServiceError(f'Failed to parse Gemini response: {exc}', error_type='parse_error') from exc


def _gemini_models():
    primary = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
    fallback = os.getenv('GEMINI_FALLBACK_MODEL', DEFAULT_GEMINI_FALLBACK_MODEL).strip()
    return [model for model in dict.fromkeys([primary, fallback]) if model]


def generate_exercise_coach_feedback(data):
    payload = normalize_exercise_request(data)
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise GeminiConfigError('GEMINI_API_KEY is not configured.', error_type='missing_api_key')

    models = _gemini_models()
    last_error = None
    for model_index, model in enumerate(models):
        attempts = len(GEMINI_RETRY_DELAYS_SECONDS) + 1 if model_index == 0 else 1
        for attempt in range(attempts):
            try:
                return _request_gemini_feedback(payload, api_key, model)
            except GeminiServiceError as exc:
                last_error = exc
                if exc.error_type not in GEMINI_RETRYABLE_ERROR_TYPES:
                    raise
                if attempt + 1 < attempts:
                    time.sleep(GEMINI_RETRY_DELAYS_SECONDS[attempt])

    if last_error:
        raise last_error
    raise GeminiServiceError('No Gemini model is configured.', error_type='config_error')
