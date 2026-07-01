from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .models import CustomUser
import datetime
import json
import os
from urllib import request as urlrequest
from urllib import error as urlerror

def log_debug(message):
    try:
        # Save log file in the backend root directory
        import os
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'django_debug.log')
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now().isoformat()}] {message}\n")
    except Exception as e:
        print("Logging failed:", e)

@api_view(['POST'])
def register(request):
    data = request.data
    username = data.get('username', '').strip().lower()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    password = data.get('password')
    confirm_password = data.get('confirm_password')
    age = data.get('age')

    log_debug(f"Register attempt: username={username}, first_name={first_name}, last_name={last_name}, age={age}")

    if not username:
        log_debug("Register failed: Username is required")
        return Response({'error': 'Username is required'}, status=400)

    if password != confirm_password:
        log_debug("Register failed: Passwords do not match")
        return Response({'error': 'Passwords do not match'}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        log_debug(f"Register failed: Username {username} already exists")
        return Response({'error': 'Username already exists'}, status=400)

    user = CustomUser.objects.create_user(
        username=username,
        first_name=first_name,
        last_name=last_name,
        password=password,
        age=age
    )
    log_debug(f"Register success: Created user {username}")
    return Response({'message': 'Account created successfully!'}, status=201)


@api_view(['POST'])
def login_view(request):
    data = request.data
    username = data.get('username', '').strip().lower()
    password = data.get('password')

    log_debug(f"Login attempt: username={username}")

    user = authenticate(request, username=username, password=password)
    log_debug(f"Authentication result for {username}: {'SUCCESS' if user is not None else 'FAILED'}")

    if user:
        login(request, user)
        log_debug(f"Login session started for {username}")
        return Response({
            'message': 'Login successful',
            'user': {
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'age': user.age,
            }
        })
    return Response({'error': 'Invalid credentials'}, status=400)


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out'})

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
        return raw_counts
    if isinstance(raw_counts, list):
        normalized = {}
        for item in raw_counts:
            if isinstance(item, dict):
                reason = item.get('reason')
                count = _safe_int(item.get('count'), 0)
                if reason:
                    normalized[reason] = count
        return normalized
    return {}


def _build_ai_prompt(stats):
    return [
        {
            "role": "system",
            "content": (
                "You are an encouraging squat coach. "
                "Use only the workout summary statistics provided by the system. "
                "Do not inspect video, landmarks, or pose data directly. "
                "Do not judge squats beyond the supplied summary metrics. "
                "Return valid JSON only with these keys: "
                "overallPerformance, strengths, areasForImprovement, recommendations, encouragement. "
                "overallPerformance and encouragement must be strings. "
                "strengths, areasForImprovement, and recommendations must be arrays of short strings. "
                "Keep the response concise, personalized, and specific to the detected issues."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(stats, ensure_ascii=True),
        },
    ]


@api_view(['POST'])
def squat_coach_feedback(request):
    data = request.data or {}
    stats = data.get('stats') or data.get('workoutStats') or data

    total_good = _safe_int(stats.get('validReps', stats.get('goodReps', 0)), 0)
    total_bad = _safe_int(stats.get('incorrectReps', stats.get('badReps', 0)), 0)
    total_attempts = _safe_int(stats.get('totalAttempts', total_good + total_bad), total_good + total_bad)
    accuracy = _safe_int(stats.get('accuracy', round((total_good / total_attempts) * 100) if total_attempts else 0), 0)
    session_duration = _safe_int(stats.get('sessionDuration', 0), 0)

    set_summaries = stats.get('setSummaries', [])
    incorrect_reason_counts = _normalize_reason_counts(
        stats.get('incorrectReasonCounts') or stats.get('incorrectReasons') or {}
    )
    angle_stats = stats.get('angleStats') or {}

    payload = {
        "validReps": total_good,
        "incorrectReps": total_bad,
        "totalAttempts": total_attempts,
        "accuracy": accuracy,
        "sessionDuration": session_duration,
        "setSummaries": set_summaries,
        "incorrectReasonCounts": incorrect_reason_counts,
        "angleStats": angle_stats,
        "sessionMeta": {
            "totalSets": _safe_int(stats.get('totalSets', 0), 0),
            "totalRepsPerSet": _safe_int(stats.get('totalRepsPerSet', 0), 0),
            "restTimeSetting": _safe_int(stats.get('restTimeSetting', 0), 0),
        },
    }

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return Response(
            {'error': 'AI feedback is currently unavailable. Your workout statistics are still available for review.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
    request_body = {
        "model": model,
        "messages": _build_ai_prompt(payload),
        "temperature": 0.6,
    }

    req = urlrequest.Request(
        url='https://api.openai.com/v1/chat/completions',
        data=json.dumps(request_body).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
        },
        method='POST',
    )

    try:
        with urlrequest.urlopen(req, timeout=25) as response:
            raw = response.read().decode('utf-8')
            data = json.loads(raw)
            content = (
                data.get('choices', [{}])[0]
                .get('message', {})
                .get('content', '')
            )
            feedback = json.loads(content)
            return Response({'feedback': feedback}, status=status.HTTP_200_OK)
    except (urlerror.URLError, urlerror.HTTPError, TimeoutError, json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
        return Response(
            {'error': 'AI feedback is currently unavailable. Your workout statistics are still available for review.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )