"""Read-only all-time workout history aggregates."""
from collections import Counter
from datetime import datetime, time, timedelta

from django.core.paginator import Paginator
from django.db.models import Avg, Sum

from .dashboard_service import best_login_streak, dashboard_timezone
from .models import UserWorkoutPlan, WorkoutSession
from .workout_plan_views import PLAN_DEFINITIONS, plan_schedule


SUPPORTED_EXERCISES = {
    'squat': 'Squat',
    'push-up': 'Push-up',
    'plank': 'Plank',
    'lunge': 'Lunge',
    'leg-raise': 'Leg Raise',
}


def _completed_sessions(user):
    return WorkoutSession.objects.filter(
        user=user,
        status=WorkoutSession.STATUS_COMPLETED,
        exercise__in=SUPPORTED_EXERCISES,
    )


def _completed_plan_count(user):
    count = 0
    plans = UserWorkoutPlan.objects.filter(
        user=user,
        completed_at__isnull=False,
        plan_id__in=PLAN_DEFINITIONS,
    )
    for plan in plans:
        valid_ids = {workout['id'] for workout in plan_schedule(plan)}
        completed_ids = set(plan.completed_workout_ids or []) & valid_ids
        if len(valid_ids) == 12 and completed_ids == valid_ids:
            count += 1
    return count


def _activity_overview(sessions, today):
    zone = dashboard_timezone()
    start_date = today - timedelta(days=today.weekday() + (11 * 7))
    start = datetime.combine(start_date, time.min, tzinfo=zone)
    end = datetime.combine(today + timedelta(days=1), time.min, tzinfo=zone)
    counts = Counter(
        completed_at.astimezone(zone).date()
        for completed_at in sessions.filter(
            completed_at__gte=start,
            completed_at__lt=end,
        ).values_list('completed_at', flat=True)
    )
    return [
        {
            'date': (start_date + timedelta(days=offset)).isoformat(),
            'count': counts[start_date + timedelta(days=offset)],
        }
        for offset in range((today - start_date).days + 1)
    ]


def _top_exercises(sessions):
    counts = Counter(sessions.values_list('exercise', flat=True))
    stable_order = {exercise: index for index, exercise in enumerate(SUPPORTED_EXERCISES)}
    ranked = sorted(counts, key=lambda exercise: (-counts[exercise], stable_order[exercise]))
    return [
        {
            'exercise': exercise,
            'name': SUPPORTED_EXERCISES[exercise],
            'sessions': counts[exercise],
        }
        for exercise in ranked
    ]


def _session_data(session):
    return {
        'id': session.session_id,
        'exercise': session.exercise,
        'exerciseName': SUPPORTED_EXERCISES.get(session.exercise, session.exercise_name),
        'metricType': session.metric_type,
        'completedAt': session.completed_at.isoformat(),
        'duration': session.duration,
        'setsCompleted': session.sets_completed,
        'accuracy': session.accuracy,
        'configuration': session.configuration if isinstance(session.configuration, dict) else {},
    }


def history_session_data(user, session_id):
    """Return one completed session owned by the user without mutating it."""
    session = _completed_sessions(user).filter(session_id=session_id).first()
    if session is None:
        return None
    return {
        **_session_data(session),
        'status': session.status,
        'correctReps': session.correct_reps,
        'incorrectReps': session.incorrect_reps,
        'totalReps': session.total_reps,
        'totalHoldTime': session.total_hold_time,
        'formIssues': session.form_issues if isinstance(session.form_issues, list) else [],
        'setResults': session.set_results if isinstance(session.set_results, list) else [],
        'analysis': session.analysis if isinstance(session.analysis, dict) else {},
        'feedback': session.feedback if isinstance(session.feedback, dict) else None,
    }


def recent_session_data(user, limit=3):
    """Return a small newest-first preview from the same history queryset."""
    sessions = _completed_sessions(user).order_by('-completed_at', '-pk')[:limit]
    return [
        {
            **_session_data(session),
            'totalReps': session.total_reps,
            'totalHoldTime': session.total_hold_time,
            'analysis': session.analysis if isinstance(session.analysis, dict) else {},
        }
        for session in sessions
    ]


def build_history(user, search='', page=1, page_size=6, today=None):
    """Return all-time metrics plus a searched, newest-first session page."""
    zone = dashboard_timezone()
    today = today or datetime.now(zone).date()
    sessions = _completed_sessions(user)
    aggregates = sessions.aggregate(total_duration=Sum('duration'))
    filtered = sessions
    if search:
        matching_ids = [
            exercise for exercise, name in SUPPORTED_EXERCISES.items()
            if search.casefold() in name.casefold()
        ]
        filtered = filtered.filter(exercise__in=matching_ids)

    paginator = Paginator(filtered.order_by('-completed_at', '-pk'), page_size)
    requested_page = max(1, page)
    page_object = paginator.get_page(min(requested_page, paginator.num_pages or 1))
    accuracies = sessions.filter(accuracy__isnull=False)
    average_accuracy = accuracies.aggregate(value=Avg('accuracy'))['value']
    login_days = user.login_days.order_by('date').values_list('date', flat=True)

    return {
        'stats': {
            'totalWorkouts': sessions.count(),
            'totalDuration': aggregates['total_duration'] or 0,
            'workoutPlansCompleted': _completed_plan_count(user),
            'averageAccuracy': round(average_accuracy, 1) if average_accuracy is not None else None,
            'bestStreak': best_login_streak(login_days),
        },
        'sessions': {
            'items': [_session_data(session) for session in page_object.object_list],
            'page': page_object.number,
            'pageSize': page_size,
            'totalItems': paginator.count,
            'totalPages': paginator.num_pages,
        },
        'activityOverview': _activity_overview(sessions, today),
        'topExercises': _top_exercises(sessions),
    }
