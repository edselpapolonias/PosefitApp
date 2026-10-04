"""Read-only all-time workout history aggregates."""
from collections import Counter
from datetime import date, datetime, time, timedelta

from django.core.paginator import Paginator
from django.db.models import Avg, Count, Max, Q, Sum

from .dashboard_service import best_login_streak, dashboard_timezone
from .models import UserWorkoutPlan, WorkoutSession
from .workout_plan_views import PLAN_DEFINITIONS, plan_data, plan_schedule


SUPPORTED_EXERCISES = {
    'squat': 'Squat',
    'push-up': 'Push-up',
    'plank': 'Plank',
    'lunge': 'Lunge',
    'leg-raise': 'Leg Raise',
}


def _completed_sessions(user):
    return WorkoutSession.objects.select_related(
        'workout_plan_day_session__plan',
    ).filter(
        user=user,
        status=WorkoutSession.STATUS_COMPLETED,
        exercise__in=SUPPORTED_EXERCISES,
    ).filter(
        Q(workout_plan_day_session__isnull=True)
        | Q(workout_plan_day_session__status='completed')
    )


def _plan_history_item(plan):
    data = plan_data(plan)
    last_activity = getattr(plan, 'last_activity_at', None)
    if last_activity is None:
        last_activity = max(
            (session.updated_at for session in plan.day_sessions.all()),
            default=None,
        )
    data['lastActivityAt'] = last_activity.isoformat() if last_activity else None
    return data


def plan_history_data(user):
    """Return plan instances with persisted workout-day activity, newest first."""
    plans = (
        UserWorkoutPlan.objects.filter(
            user=user,
            plan_id__in=PLAN_DEFINITIONS,
            day_sessions__isnull=False,
        )
        .annotate(last_activity_at=Max('day_sessions__updated_at'))
        .prefetch_related('day_sessions')
        .distinct()
        .order_by('-last_activity_at', '-pk')
    )
    return [_plan_history_item(plan) for plan in plans]


def plan_history_detail_data(user, instance_id):
    plan = (
        UserWorkoutPlan.objects.filter(
            user=user,
            pk=instance_id,
            plan_id__in=PLAN_DEFINITIONS,
            day_sessions__isnull=False,
        )
        .annotate(last_activity_at=Max('day_sessions__updated_at'))
        .prefetch_related('day_sessions')
        .distinct()
        .first()
    )
    return _plan_history_item(plan) if plan else None


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
    plan_day = session.workout_plan_day_session
    plan_definition = PLAN_DEFINITIONS.get(plan_day.plan.plan_id) if plan_day else None
    return {
        'id': session.session_id,
        'exercise': session.exercise,
        'exerciseName': SUPPORTED_EXERCISES.get(session.exercise, session.exercise_name),
        'metricType': session.metric_type,
        'completedAt': session.completed_at.isoformat(),
        'duration': session.duration,
        'setsCompleted': session.sets_completed,
        'accuracy': session.accuracy,
        'planName': plan_definition['name'] if plan_definition else None,
        'configuration': session.configuration if isinstance(session.configuration, dict) else {},
    }


def _achievement_data(sessions, best_streak):
    """Return genuine all-time milestones used by the History summary cards."""
    longest = sessions.order_by('-duration', '-completed_at', '-pk').first()
    most_accurate = sessions.filter(accuracy__isnull=False).order_by(
        '-accuracy', '-completed_at', '-pk',
    ).first()
    return {
        'longestWorkout': {
            'duration': longest.duration,
            'completedAt': longest.completed_at.isoformat(),
        } if longest else None,
        'bestAccuracy': {
            'accuracy': most_accurate.accuracy,
            'completedAt': most_accurate.completed_at.isoformat(),
        } if most_accurate else None,
        'bestStreak': {'days': best_streak},
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


def exercise_history_overview_data(user):
    """Return fixed-order all-time summaries for every supported exercise."""
    grouped = {
        item['exercise']: item
        for item in _completed_sessions(user).values('exercise').annotate(
            session_count=Count('pk'),
            average_accuracy=Avg('accuracy'),
            total_reps=Sum('total_reps'),
            total_hold_time=Sum('total_hold_time'),
            last_performed=Max('completed_at'),
        )
    }
    exercises = []
    for exercise, name in SUPPORTED_EXERCISES.items():
        values = grouped.get(exercise, {})
        average_accuracy = values.get('average_accuracy')
        last_performed = values.get('last_performed')
        exercises.append({
            'exercise': exercise,
            'name': name,
            'metricType': WorkoutSession.METRIC_TIME if exercise == 'plank' else WorkoutSession.METRIC_REPS,
            'sessions': values.get('session_count', 0),
            'averageAccuracy': round(average_accuracy, 1) if average_accuracy is not None else None,
            'totalReps': None if exercise == 'plank' else values.get('total_reps') or 0,
            'totalHoldTime': values.get('total_hold_time') or 0 if exercise == 'plank' else None,
            'lastPerformed': last_performed.isoformat() if last_performed else None,
        })
    return exercises


def _shift_month(month, offset):
    month_index = (month.year * 12 + month.month - 1) + offset
    return date(month_index // 12, month_index % 12 + 1, 1)


def _exercise_analytics(sessions, is_plank, today=None):
    """Build the chart, frequency, personal-best, and improvement datasets."""
    zone = dashboard_timezone()
    scored = sessions.filter(accuracy__isnull=False)
    trend_sessions = list(scored.order_by('-completed_at', '-pk')[:8])
    trend = [
        {
            'completedAt': session.completed_at.isoformat(),
            'accuracy': session.accuracy,
        }
        for session in reversed(trend_sessions)
    ]

    current_month = (today or datetime.now(zone).date()).replace(day=1)
    months = [_shift_month(current_month, offset) for offset in range(-3, 1)]
    frequency_rows = {
        month.strftime('%Y-%m'): {
            'key': month.strftime('%Y-%m'),
            'label': month.strftime('%b'),
            'days': [0] * 7,
        }
        for month in months
    }
    frequency_start = datetime.combine(months[0], time.min, tzinfo=zone)
    for completed_at in sessions.filter(completed_at__gte=frequency_start).values_list('completed_at', flat=True):
        local_date = completed_at.astimezone(zone).date()
        row = frequency_rows.get(local_date.strftime('%Y-%m'))
        if row:
            row['days'][local_date.weekday()] += 1

    best_accuracy = scored.order_by('-accuracy', '-completed_at', '-pk').first()
    volume_field = 'total_hold_time' if is_plank else 'total_reps'
    best_volume = sessions.filter(**{f'{volume_field}__isnull': False}).order_by(
        f'-{volume_field}', '-completed_at', '-pk',
    ).first()
    longest = sessions.order_by('-duration', '-completed_at', '-pk').first()
    first_scored = scored.order_by('completed_at', 'pk').first()
    latest_scored = scored.order_by('-completed_at', '-pk').first()
    accuracy_change = (
        latest_scored.accuracy - first_scored.accuracy
        if first_scored and latest_scored and first_scored.pk != latest_scored.pk
        else None
    )

    return {
        'accuracyTrend': trend,
        'workoutFrequency': list(frequency_rows.values()),
        'personalBests': {
            'accuracy': {
                'value': best_accuracy.accuracy,
                'completedAt': best_accuracy.completed_at.isoformat(),
            } if best_accuracy else None,
            'volume': {
                'value': getattr(best_volume, volume_field),
                'completedAt': best_volume.completed_at.isoformat(),
            } if best_volume else None,
            'duration': {
                'value': longest.duration,
                'completedAt': longest.completed_at.isoformat(),
            } if longest else None,
        },
        'accuracyChange': accuracy_change,
    }


def exercise_history_data(user, exercise, page=1, page_size=6, today=None):
    """Return one exercise's lifetime summary and newest-first completed sessions."""
    if exercise not in SUPPORTED_EXERCISES:
        return None
    sessions = _completed_sessions(user).filter(exercise=exercise)
    aggregates = sessions.aggregate(
        total_sessions=Count('pk'),
        average_accuracy=Avg('accuracy'),
        best_accuracy=Max('accuracy'),
        total_duration=Sum('duration'),
        total_reps=Sum('total_reps'),
        total_hold_time=Sum('total_hold_time'),
    )
    paginator = Paginator(sessions.order_by('-completed_at', '-pk'), page_size)
    requested_page = max(1, page)
    page_object = paginator.get_page(min(requested_page, paginator.num_pages or 1))
    is_plank = exercise == 'plank'

    return {
        'exercise': exercise,
        'name': SUPPORTED_EXERCISES[exercise],
        'metricType': WorkoutSession.METRIC_TIME if is_plank else WorkoutSession.METRIC_REPS,
        'stats': {
            'totalSessions': aggregates['total_sessions'],
            'averageAccuracy': round(aggregates['average_accuracy'], 1) if aggregates['average_accuracy'] is not None else None,
            'bestAccuracy': aggregates['best_accuracy'],
            'totalDuration': aggregates['total_duration'] or 0,
            'totalReps': None if is_plank else aggregates['total_reps'] or 0,
            'totalHoldTime': aggregates['total_hold_time'] or 0 if is_plank else None,
        },
        'analytics': _exercise_analytics(sessions, is_plank, today=today),
        'sessions': {
            'items': [
                {
                    **_session_data(session),
                    'totalReps': session.total_reps,
                    'totalHoldTime': session.total_hold_time,
                }
                for session in page_object.object_list
            ],
            'page': page_object.number,
            'pageSize': page_size,
            'totalItems': paginator.count,
            'totalPages': paginator.num_pages,
        },
    }


def build_history(user, search='', page=1, page_size=8, today=None, sort='newest'):
    """Return all-time metrics plus a searched and ordered session page."""
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

    ordering = ('completed_at', 'pk') if sort == 'oldest' else ('-completed_at', '-pk')
    paginator = Paginator(filtered.order_by(*ordering), page_size)
    requested_page = max(1, page)
    page_object = paginator.get_page(min(requested_page, paginator.num_pages or 1))
    accuracies = sessions.filter(accuracy__isnull=False)
    average_accuracy = accuracies.aggregate(value=Avg('accuracy'))['value']
    login_days = list(user.login_days.order_by('date').values_list('date', flat=True))
    streak = best_login_streak(login_days)

    return {
        'stats': {
            'totalWorkouts': sessions.count(),
            'totalDuration': aggregates['total_duration'] or 0,
            'workoutPlansCompleted': _completed_plan_count(user),
            'averageAccuracy': round(average_accuracy, 1) if average_accuracy is not None else None,
            'bestStreak': streak,
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
        'achievements': _achievement_data(sessions, streak),
        'planHistory': plan_history_data(user),
    }
