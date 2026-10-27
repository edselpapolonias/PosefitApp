from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from .models import CustomUser, FitnessProfile, WorkoutPlanDaySession, WorkoutSession
from .dashboard_service import build_dashboard, record_login_day
from .history_service import (
    build_history,
    exercise_history_data,
    exercise_history_overview_data,
    history_session_data,
    plan_history_detail_data,
    recent_session_data,
)
from .progress_service import build_progress
from .workout_plan_views import active_plans_data
from .session_progress_service import (
    build_progress_comparison,
    find_previous_completed_session,
)
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

    if isinstance(age, bool) or (isinstance(age, float) and not age.is_integer()):
        return Response({'error': 'Enter a valid whole-number age.'}, status=400)
    try:
        parsed_age = int(age)
    except (TypeError, ValueError):
        return Response({'error': 'Enter a valid whole-number age.'}, status=400)
    if parsed_age < 1 or parsed_age > 120:
        return Response({'error': 'Age must be between 1 and 120.'}, status=400)

    with transaction.atomic():
        user = CustomUser.objects.create_user(
            username=username,
            first_name=first_name,
            last_name=last_name,
            password=password,
            age=parsed_age,
        )
        FitnessProfile.objects.create(user=user, onboarding_required=True)
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
        record_login_day(user)
        log_debug(f"Login session started for {username}")
        return Response({
            'message': 'Login successful',
            'csrf_token': get_token(request),
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard(request):
    data = build_dashboard(request.user)
    data['activePlans'] = active_plans_data(request.user)
    data['recentWorkouts'] = recent_session_data(request.user)
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress(request):
    return Response(build_progress(request.user, range_key=request.query_params.get('range', '30d')))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history(request):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    search = str(request.query_params.get('search') or '').strip()[:80]
    sort = 'oldest' if request.query_params.get('sort') == 'oldest' else 'newest'
    return Response(build_history(request.user, search=search, page=page, sort=sort))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_exercises(request):
    return Response({'exercises': exercise_history_overview_data(request.user)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_exercise(request, exercise):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    data = exercise_history_data(request.user, exercise, page=page)
    if data is None:
        return Response(
            {'error': 'The requested exercise history is not supported.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_session(request, session_id):
    session = history_session_data(request.user, session_id)
    if session is None:
        return Response(
            {'error': 'The completed workout session was not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response({'session': session})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def history_plan(request, instance_id):
    plan = plan_history_detail_data(request.user, instance_id)
    if plan is None:
        return Response(
            {'error': 'The workout plan history was not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response({'plan': plan})


@api_view(['GET'])
def csrf_token(request):
    return Response({'csrf_token': get_token(request)})


FITNESS_LEVELS = {choice for choice, _ in FitnessProfile.FitnessLevel.choices}
EXERCISE_EXPERIENCE_OPTIONS = {choice for choice, _ in FitnessProfile.ExerciseExperience.choices}
LIMITATION_RESPONSES = {choice for choice, _ in FitnessProfile.LimitationResponse.choices}
AFFECTED_AREA_OPTIONS = {'knee', 'shoulder', 'wrist', 'hip', 'back', 'other'}


def _fitness_profile_response(user, profile=None):
    if profile is None:
        profile = FitnessProfile.objects.filter(user=user).first()

    profile_data = {
        'fitnessLevel': profile.fitness_level if profile else '',
        'exerciseExperience': profile.exercise_experience if profile else '',
        'physicalLimitations': profile.physical_limitations if profile else '',
        'affectedAreas': profile.affected_areas if profile else [],
        'onboardingCompleted': bool(profile and profile.onboarding_completed),
    }
    return {
        'user': {
            'username': user.username,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'email': user.email,
            'age': user.age,
        },
        'profile': profile_data,
        'shouldOnboard': bool(profile and profile.onboarding_required and not profile.onboarding_completed),
    }


def _validated_profile_data(data):
    raw_age = data.get('age')
    if isinstance(raw_age, bool) or (isinstance(raw_age, float) and not raw_age.is_integer()):
        return None, 'Enter a valid whole-number age.'
    try:
        age = int(raw_age)
    except (TypeError, ValueError):
        return None, 'Enter a valid whole-number age.'
    if age < 1 or age > 120:
        return None, 'Age must be between 1 and 120.'

    fitness_level = str(data.get('fitnessLevel') or '')
    if fitness_level not in FITNESS_LEVELS:
        return None, 'Select a valid fitness level.'

    exercise_experience = str(data.get('exerciseExperience') or '')
    if exercise_experience not in EXERCISE_EXPERIENCE_OPTIONS:
        return None, 'Select a valid exercise experience.'

    physical_limitations = str(data.get('physicalLimitations') or '')
    if physical_limitations not in LIMITATION_RESPONSES:
        return None, 'Select a valid physical limitations response.'

    affected_areas = data.get('affectedAreas', [])
    if not isinstance(affected_areas, list):
        return None, 'Affected areas must be a list.'
    if any(not isinstance(area, str) or area not in AFFECTED_AREA_OPTIONS for area in affected_areas):
        return None, 'Select only valid affected areas.'
    if physical_limitations != FitnessProfile.LimitationResponse.YES:
        affected_areas = []
    else:
        affected_areas = list(dict.fromkeys(affected_areas))

    return {
        'age': age,
        'fitness_level': fitness_level,
        'exercise_experience': exercise_experience,
        'physical_limitations': physical_limitations,
        'affected_areas': affected_areas,
    }, None


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def fitness_profile(request):
    """Retrieve or update only the authenticated user's fitness profile."""
    profile = FitnessProfile.objects.filter(user=request.user).first()
    if request.method == 'GET':
        return Response(_fitness_profile_response(request.user, profile))

    values, error = _validated_profile_data(request.data or {})
    if error:
        return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        request.user.age = values.pop('age')
        request.user.save(update_fields=['age'])
        profile, _ = FitnessProfile.objects.select_for_update().get_or_create(
            user=request.user,
            defaults={'onboarding_required': False},
        )
        for field, value in values.items():
            setattr(profile, field, value)
        profile.onboarding_completed = True
        profile.full_clean()
        profile.save()

    return Response(_fitness_profile_response(request.user, profile))


def _non_negative_integer(value, default=0, nullable=False):
    if value is None and nullable:
        return None
    try:
        return max(0, int(float(value)))
    except (TypeError, ValueError):
        return None if nullable else default


def _json_list(value):
    return value if isinstance(value, list) else []


def _json_object(value):
    return value if isinstance(value, dict) else {}


def _completed_at(value):
    parsed = parse_datetime(str(value)) if value else None
    if parsed is None:
        return timezone.now()
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_workout_session(request):
    """Idempotently save a result and compare it with the previous matching session."""
    data = request.data or {}
    session_id = str(data.get('id') or '').strip()
    exercise_data = data.get('exercise') if isinstance(data.get('exercise'), dict) else {}
    exercise = str(exercise_data.get('id') or '').strip().lower()

    if not session_id or not exercise:
        return Response(
            {'error': 'A session id and exercise are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    exercise_name = str(exercise_data.get('name') or exercise.replace('-', ' ').title()).strip()[:80]
    metric_type = WorkoutSession.METRIC_TIME if data.get('metricType') == 'time' else WorkoutSession.METRIC_REPS
    session_status = (
        WorkoutSession.STATUS_COMPLETED
        if data.get('status') == WorkoutSession.STATUS_COMPLETED
        else WorkoutSession.STATUS_ENDED
    )
    parsed_accuracy = _non_negative_integer(data.get('accuracy'), nullable=True)
    accuracy = min(100, parsed_accuracy) if parsed_accuracy is not None else None
    feedback = data.get('feedback')
    workout_context = data.get('workoutContext') if isinstance(data.get('workoutContext'), dict) else {}
    plan_day_session = None
    if workout_context.get('source') == 'workout-plan':
        plan_day_session = WorkoutPlanDaySession.objects.filter(
            user=request.user,
            session_id=workout_context.get('workoutSessionId'),
            plan_id=workout_context.get('planInstanceId'),
            workout_id=workout_context.get('workoutId'),
        ).first()

    values = {
        'workout_plan_day_session': plan_day_session,
        'exercise': exercise[:50],
        'exercise_name': exercise_name or 'Exercise',
        'metric_type': metric_type,
        'status': session_status,
        'completed_at': _completed_at(data.get('completedAt')),
        'duration': _non_negative_integer(data.get('duration')),
        'sets_completed': _non_negative_integer(data.get('setsCompleted')),
        'accuracy': accuracy,
        'correct_reps': _non_negative_integer(data.get('correctReps'), nullable=True),
        'incorrect_reps': _non_negative_integer(data.get('incorrectReps'), nullable=True),
        'total_reps': _non_negative_integer(data.get('totalReps'), nullable=True),
        'total_hold_time': _non_negative_integer(data.get('totalHoldTime'), nullable=True),
        'form_issues': _json_list(data.get('formIssues')),
        'set_results': _json_list(data.get('setResults')),
        'configuration': _json_object(data.get('config')),
        'analysis': _json_object(data.get('analysis')),
    }

    with transaction.atomic():
        workout_session, created = WorkoutSession.objects.select_for_update().get_or_create(
            user=request.user,
            session_id=session_id[:120],
            defaults=values,
        )
        if not created and workout_session.workout_plan_day_session_id is None:
            for field, value in values.items():
                setattr(workout_session, field, value)
        if isinstance(feedback, dict) and feedback:
            workout_session.feedback = feedback
        workout_session.full_clean()
        workout_session.save()

        previous_session = find_previous_completed_session(workout_session)
        comparison = build_progress_comparison(workout_session, previous_session)

    return Response({
        'sessionId': workout_session.session_id,
        'saved': True,
        'comparison': comparison,
    })


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

