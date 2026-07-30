from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from .models import CustomUser
from .coach_feedback_service import (
    AI_FEEDBACK_UNAVAILABLE_MESSAGE,
    GeminiConfigError,
    GeminiServiceError,
    generate_exercise_coach_feedback,
)
import datetime
import os


def log_debug(message):
    try:
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'django_debug.log')
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.datetime.now().isoformat()}] {message}\n")
    except Exception as e:
        print('Logging failed:', e)


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
        log_debug('Register failed: Username is required')
        return Response({'error': 'Username is required'}, status=400)

    if password != confirm_password:
        log_debug('Register failed: Passwords do not match')
        return Response({'error': 'Passwords do not match'}, status=400)

    if CustomUser.objects.filter(username=username).exists():
        log_debug(f"Register failed: Username {username} already exists")
        return Response({'error': 'Username already exists'}, status=400)

    user = CustomUser.objects.create_user(
        username=username,
        first_name=first_name,
        last_name=last_name,
        password=password,
        age=age,
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


def _generate_feedback_response(data):
    """Shared logic for generating AI coach feedback."""
    try:
        feedback = generate_exercise_coach_feedback(data)
        return Response({'feedback': feedback}, status=status.HTTP_200_OK)
    except (GeminiConfigError, GeminiServiceError) as exc:
        log_debug(f"Gemini coach feedback failed [{getattr(exc, 'error_type', 'unknown')}]: {exc}")
        return Response(
            {'error': AI_FEEDBACK_UNAVAILABLE_MESSAGE},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(['POST'])
def exercise_coach_feedback(request):
    data = request.data or {}
    return _generate_feedback_response(data)


@api_view(['POST'])
def squat_coach_feedback(request):
    data = request.data or {}
    return _generate_feedback_response(data)

