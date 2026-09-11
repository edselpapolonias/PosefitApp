from datetime import date, timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CustomUser, UserWorkoutPlan, WorkoutPlanDaySession
from .dashboard_service import dashboard_timezone


PLAN_DEFINITIONS = {
    'beginner-full-body': {
        'name': 'Beginner Full Body',
        'workout_id_prefix': 'week-',
        'workout_days': (('Monday', 0), ('Wednesday', 2), ('Friday', 4)),
    },
    'lower-body-focus': {
        'name': 'Lower Body Focus',
        'workout_id_prefix': 'lower-body-week-',
        'workout_days': (('Tuesday', 1), ('Thursday', 3), ('Saturday', 5)),
    },
}


def first_monday(day):
    return day + timedelta(days=(-day.weekday()) % 7)


def plan_schedule(plan):
    definition = PLAN_DEFINITIONS[plan.plan_id]
    return [
        {
            'id': f"{definition['workout_id_prefix']}{week}-{day.lower()}",
            'week': week,
            'day': day,
            'date': (plan.start_date + timedelta(days=(week - 1) * 7 + offset)).isoformat(),
        }
        for week in range(1, 5)
        for day, offset in definition['workout_days']
    ]


def plan_data(plan):
    # Dates and progress reference the existing definition; no exercise prescriptions are copied.
    definition = PLAN_DEFINITIONS[plan.plan_id]
    schedule = plan_schedule(plan)
    valid_ids = {workout['id'] for workout in schedule}
    completed = list(dict.fromkeys(item for item in plan.completed_workout_ids if item in valid_ids))
    current = next((item for item in schedule if item['id'] not in completed), None)
    return {
        'id': plan.plan_id, 'instanceId': plan.pk, 'userId': plan.user_id,
        'name': definition['name'], 'status': 'completed' if plan.completed_at else plan.status,
        'activatedAt': plan.activated_at.isoformat(), 'startDate': plan.start_date.isoformat(),
        'completedAt': plan.completed_at.isoformat() if plan.completed_at else None,
        'durationWeeks': 4, 'totalWorkouts': len(schedule), 'schedule': schedule,
        'completedWorkoutIds': completed, 'completedWorkouts': len(completed),
        'remainingWorkouts': len(schedule) - len(completed), 'percentage': round(len(completed) / len(schedule) * 100),
        'activeWeek': max(1, min(4, (timezone.localdate(timezone=dashboard_timezone()) - plan.start_date).days // 7 + 1)),
        'activeDay': current['day'] if current else None, 'currentWorkoutId': current['id'] if current else None,
    }


def _positive_integer(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _normalize_exercises(value):
    if not isinstance(value, list) or not value:
        return None
    normalized = []
    for index, exercise in enumerate(value):
        if not isinstance(exercise, dict):
            return None
        exercise_id = str(exercise.get('exerciseId') or '').strip().lower()
        metric_type = 'time' if exercise.get('metricType') == 'time' else 'reps'
        sets_required = _positive_integer(exercise.get('setsRequired'))
        target = _positive_integer(exercise.get('durationPerSet') if metric_type == 'time' else exercise.get('repsPerSet'))
        if not exercise_id or not sets_required or not target:
            return None
        normalized.append({
            'exerciseId': exercise_id[:50],
            'name': str(exercise.get('name') or exercise_id.replace('-', ' ').title())[:80],
            'order': index + 1,
            'metricType': metric_type,
            'setsRequired': sets_required,
            'repsPerSet': target if metric_type == 'reps' else None,
            'durationPerSet': target if metric_type == 'time' else None,
            'restSeconds': _positive_integer(exercise.get('restSeconds')),
            'perLeg': bool(exercise.get('perLeg')),
            'completedSets': 0,
            'results': [],
        })
    return normalized


def _next_exercise_index(exercises, after_index):
    for offset in range(1, len(exercises) + 1):
        index = (after_index + offset) % len(exercises)
        if exercises[index]['completedSets'] < exercises[index]['setsRequired']:
            return index
    return -1


def _day_session_data(day_session):
    return {
        'id': day_session.session_id,
        'planInstanceId': day_session.plan_id,
        'workoutId': day_session.workout_id,
        'week': day_session.week,
        'workoutDay': day_session.workout_day,
        'scheduledDate': day_session.scheduled_date.isoformat(),
        'exercises': day_session.exercises,
        'currentExerciseIndex': day_session.current_exercise_index,
        'status': day_session.status,
        'startedAt': day_session.started_at.isoformat(),
        'completedAt': day_session.completed_at.isoformat() if day_session.completed_at else None,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_workout_day_session(request):
    data = request.data or {}
    plan = UserWorkoutPlan.objects.filter(
        user=request.user, pk=data.get('planInstanceId'), status='active'
    ).first()
    if not plan:
        return Response({'error': 'The active workout plan was not found.'}, status=404)
    try:
        scheduled_date = date.fromisoformat(str(data.get('scheduledDate') or ''))
    except ValueError:
        return Response({'error': 'A valid scheduled date is required.'}, status=400)
    week = _positive_integer(data.get('week'))
    workout_id = str(data.get('workoutId') or '').strip()
    exercises = _normalize_exercises(data.get('exercises'))
    definition = PLAN_DEFINITIONS.get(plan.plan_id)
    day_offset = dict(definition['workout_days']).get(data.get('workoutDay')) if definition else None
    expected_date = plan.start_date + timedelta(days=(week - 1) * 7 + day_offset) if week and day_offset is not None else None
    expected_id = f"{definition['workout_id_prefix']}{week}-{str(data.get('workoutDay')).lower()}" if definition and week else None
    if not exercises or week not in range(1, 5) or workout_id != expected_id or scheduled_date != expected_date:
        return Response({'error': 'The scheduled workout data is invalid.'}, status=400)
    session_id = str(data.get('id') or '')[:180]
    if not session_id:
        return Response({'error': 'A workout session id is required.'}, status=400)
    day_session, _ = WorkoutPlanDaySession.objects.get_or_create(
        user=request.user,
        plan=plan,
        workout_id=workout_id[:100],
        defaults={
            'session_id': session_id,
            'week': week,
            'workout_day': data.get('workoutDay'),
            'scheduled_date': scheduled_date,
            'exercises': exercises,
        },
    )
    return Response({'session': _day_session_data(day_session)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_workout_day_set(request):
    data = request.data or {}
    result = data.get('sessionResult') if isinstance(data.get('sessionResult'), dict) else {}
    result_id = str(result.get('id') or '')
    with transaction.atomic():
        day_session = WorkoutPlanDaySession.objects.select_for_update().filter(
            user=request.user, session_id=data.get('sessionId'), status=WorkoutPlanDaySession.STATUS_ACTIVE
        ).first()
        if not day_session:
            return Response({'error': 'The active workout day session was not found.'}, status=404)
        exercises = day_session.exercises
        if any(
            result.get('sessionResultId') == result_id
            for item in exercises
            for result in item.get('results', [])
        ):
            return Response({'session': _day_session_data(day_session)})
        index = next((i for i, item in enumerate(exercises) if item['exerciseId'] == data.get('exerciseId')), -1)
        if index < 0 or index != day_session.current_exercise_index:
            return Response({'error': 'This is not the current exercise in the workout circuit.'}, status=409)
        exercise = exercises[index]
        target_value = result.get('totalHoldTime') if exercise['metricType'] == 'time' else result.get('correctReps')
        target = exercise.get('durationPerSet') or exercise.get('repsPerSet')
        target_complete = (_positive_integer(target_value) or 0) >= target
        if exercise.get('perLeg'):
            per_leg_counts = result.get('analysis', {}).get('perLegCounts', {}) if isinstance(result.get('analysis'), dict) else {}
            target_complete = all((_positive_integer(per_leg_counts.get(leg)) or 0) >= target for leg in ('left', 'right'))
        if result.get('status') != 'completed' or not result_id or not target_complete:
            return Response({'error': 'The prescribed set target has not been completed.'}, status=400)
        exercise['completedSets'] += 1
        exercise['results'].append({
            'setNumber': exercise['completedSets'],
            'sessionResultId': result_id[:120],
            'target': exercise.get('durationPerSet') or exercise.get('repsPerSet'),
            'completed': target_value,
            'accuracy': result.get('accuracy'),
            'duration': result.get('duration'),
            'formIssues': result.get('formIssues') if isinstance(result.get('formIssues'), list) else [],
            'analysis': result.get('analysis') if isinstance(result.get('analysis'), dict) else {},
            'completedAt': result.get('completedAt'),
        })
        day_session.current_exercise_index = _next_exercise_index(exercises, index)
        day_session.exercises = exercises
        day_session.save(update_fields=['exercises', 'current_exercise_index', 'updated_at'])
    return Response({'session': _day_session_data(day_session)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def finish_workout_day_session(request):
    with transaction.atomic():
        day_session = WorkoutPlanDaySession.objects.select_for_update().select_related('plan').filter(
            user=request.user, session_id=request.data.get('sessionId')
        ).first()
        if not day_session:
            return Response({'error': 'The workout day session was not found.'}, status=404)
        if any(item['completedSets'] < item['setsRequired'] for item in day_session.exercises):
            return Response({'error': 'Complete every prescribed set before finishing this workout.'}, status=409)
        if day_session.status != WorkoutPlanDaySession.STATUS_COMPLETED:
            day_session.status = WorkoutPlanDaySession.STATUS_COMPLETED
            day_session.completed_at = timezone.now()
            day_session.current_exercise_index = -1
            day_session.save(update_fields=['status', 'completed_at', 'current_exercise_index', 'updated_at'])
        plan = day_session.plan
        completed = list(dict.fromkeys([*plan.completed_workout_ids, day_session.workout_id]))
        plan.completed_workout_ids = completed
        if len(completed) >= 12 and not plan.completed_at:
            plan.completed_at = timezone.now()
        plan.save(update_fields=['completed_workout_ids', 'completed_at'])
    return Response({'session': _day_session_data(day_session), 'plan': plan_data(plan)})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def active_workout_plan(request):
    if request.method == 'GET':
        plan = UserWorkoutPlan.objects.filter(user=request.user, status='active').first()
        return Response({'plan': plan_data(plan) if plan and plan.plan_id in PLAN_DEFINITIONS else None})
    requested_plan_id = request.data.get('planId')
    if requested_plan_id not in PLAN_DEFINITIONS:
        return Response({'error': 'This plan is not available for activation.'}, status=400)
    with transaction.atomic():
        CustomUser.objects.select_for_update().get(pk=request.user.pk)
        plan = UserWorkoutPlan.objects.filter(user=request.user, status='active').first()
        if plan and plan.plan_id != requested_plan_id:
            return Response({'error': 'You already have an active workout plan. End it before starting this plan.'}, status=409)
        if not plan:
            today = timezone.localdate(timezone=dashboard_timezone())
            try:
                selected = date.fromisoformat(request.data.get('startDate', ''))
            except (TypeError, ValueError):
                return Response({'error': 'Please choose a valid Monday start date.'}, status=400)
            if selected.weekday() != 0 or selected < today:
                return Response({'error': 'Please choose today or a future Monday.'}, status=400)
            plan = UserWorkoutPlan.objects.create(user=request.user, plan_id=requested_plan_id, start_date=selected)
        return Response({'plan': plan_data(plan)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_workout_plan(request):
    with transaction.atomic():
        CustomUser.objects.select_for_update().get(pk=request.user.pk)
        plan = UserWorkoutPlan.objects.filter(user=request.user, pk=request.data.get('instanceId'), status='active').first()
        if plan:
            plan.status = 'ended'
            plan.ended_at = timezone.now()
            plan.save(update_fields=['status', 'ended_at'])
    return Response({'ended': True})
