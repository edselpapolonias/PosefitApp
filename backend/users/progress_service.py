"""Range-aware, read-only workout progress analytics."""
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone

from .dashboard_service import dashboard_timezone
from .history_service import SUPPORTED_EXERCISES, _completed_sessions
from .models import WorkoutPlanDaySession, WorkoutSession


RANGE_DAYS = {'7d': 7, '30d': 30}
EXERCISE_ORDER = ('squat', 'push-up', 'plank', 'lunge', 'leg-raise')
ACCURACY_CATEGORIES = (
    ('good', 'Good', 80, '#28b463'),
    ('fair', 'Fair', 60, '#f5a623'),
    ('needs-work', 'Needs Work', 0, '#ef5b5b'),
)


def _average(values):
    values = [value for value in values if value is not None]
    return round(sum(values) / len(values), 1) if values else None


def _round_number(value):
    if value is None:
        return None
    rounded = float(round(value, 1))
    return int(rounded) if rounded.is_integer() else rounded


def _local_day(value, zone):
    return value.astimezone(zone).date()


def _bounds(range_key, now, first_day=None):
    zone = dashboard_timezone()
    today = now.astimezone(zone).date()
    if range_key in RANGE_DAYS:
        day_count = RANGE_DAYS[range_key]
        start_day = today - timedelta(days=day_count - 1)
    else:
        start_day = first_day or today
        day_count = max(1, (today - start_day).days + 1)
    start = datetime.combine(start_day, time.min, tzinfo=zone)
    end = datetime.combine(today + timedelta(days=1), time.min, tzinfo=zone)
    return zone, today, start_day, day_count, start, end


def _session_values(queryset):
    return list(queryset.values(
        'pk', 'session_id', 'exercise', 'completed_at', 'duration', 'sets_completed',
        'accuracy', 'total_reps', 'total_hold_time', 'metric_type',
    ))


def _period_metrics(sessions, zone):
    accuracies = [item['accuracy'] for item in sessions if item['accuracy'] is not None]
    active_days = {_local_day(item['completed_at'], zone) for item in sessions}
    total_reps = sum(
        item['total_reps'] or 0 for item in sessions
        if item['exercise'] != 'plank' and item['metric_type'] == WorkoutSession.METRIC_REPS
    )
    return {
        'averageAccuracy': _average(accuracies),
        'accuracySessions': len(accuracies),
        'activeDays': len(active_days),
        'sessions': len(sessions),
        'totalDuration': sum(item['duration'] or 0 for item in sessions),
        'totalReps': total_reps,
    }


def _comparison(current, previous, period_days):
    if previous is None:
        return None
    items = {}
    for key in ('averageAccuracy', 'activeDays', 'sessions', 'totalDuration', 'totalReps'):
        current_value = current[key]
        previous_value = previous[key]
        if key == 'averageAccuracy' and (current_value is None or previous_value is None):
            items[key] = None
            continue
        delta = _round_number(current_value - previous_value)
        items[key] = {
            'previous': previous_value,
            'delta': delta,
            'direction': 'up' if delta > 0 else 'down' if delta < 0 else 'same',
        }
    return {'periodDays': period_days, **items}


def _aggregation_interval(history_days):
    if history_days <= 45:
        return 'day'
    if history_days <= 180:
        return 'week'
    return 'month'


def _bucket_key(day, interval):
    if interval == 'month':
        return day.replace(day=1)
    if interval == 'week':
        return day - timedelta(days=day.weekday())
    return day


def _bucket_label(day, interval):
    if interval == 'month':
        return day.strftime('%b %Y')
    if interval == 'week':
        return f"Week of {day.strftime('%b')} {day.day}"
    return day.strftime('%b %d').replace(' 0', ' ')


def _chart_data(sessions, zone, start_day, today, interval):
    duration = defaultdict(int)
    accuracies = defaultdict(list)
    for item in sessions:
        bucket = _bucket_key(_local_day(item['completed_at'], zone), interval)
        duration[bucket] += item['duration'] or 0
        if item['accuracy'] is not None:
            accuracies[bucket].append(item['accuracy'])

    if interval == 'day':
        bucket_days = [start_day + timedelta(days=offset) for offset in range((today - start_day).days + 1)]
    elif interval == 'week':
        first = _bucket_key(start_day, interval)
        last = _bucket_key(today, interval)
        bucket_days = []
        cursor = first
        while cursor <= last:
            bucket_days.append(cursor)
            cursor += timedelta(days=7)
    else:
        cursor = start_day.replace(day=1)
        last = today.replace(day=1)
        bucket_days = []
        while cursor <= last:
            bucket_days.append(cursor)
            cursor = date(cursor.year + (cursor.month == 12), 1 if cursor.month == 12 else cursor.month + 1, 1)

    return {
        'interval': interval,
        'accuracy': [
            {
                'date': day.isoformat(),
                'label': _bucket_label(day, interval),
                'value': _average(accuracies.get(day, [])),
            }
            for day in bucket_days
        ],
        'workoutTime': [
            {
                'date': day.isoformat(),
                'label': _bucket_label(day, interval),
                'seconds': duration.get(day, 0),
            }
            for day in bucket_days
        ],
    }


def _longest_streak(active_days):
    best = run = 0
    previous = None
    for active_day in sorted(active_days):
        run = run + 1 if previous and active_day == previous + timedelta(days=1) else 1
        best = max(best, run)
        previous = active_day
    return best


def _consistency_data(user, sessions, zone, start_day, today, day_count):
    active_days = {_local_day(item['completed_at'], zone) for item in sessions}
    partial_days = set(WorkoutPlanDaySession.objects.filter(
        user=user,
        status=WorkoutPlanDaySession.STATUS_ACTIVE,
        scheduled_date__gte=start_day,
        scheduled_date__lte=today,
    ).values_list('scheduled_date', flat=True)) - active_days
    days = []
    cursor = start_day
    while cursor <= today:
        status = 'completed' if cursor in active_days else 'partial' if cursor in partial_days else 'missed'
        days.append({'date': cursor.isoformat(), 'status': status})
        cursor += timedelta(days=1)
    return {
        'activeDays': len(active_days),
        'dayCount': day_count,
        'percentage': round((len(active_days) / day_count) * 100) if day_count else 0,
        'longestStreak': _longest_streak(active_days),
        'days': days,
    }


def _highlight(item, value, unit, zone):
    if item is None:
        return None
    return {
        'sessionId': item['session_id'],
        'exercise': item['exercise'],
        'completedAt': item['completed_at'].isoformat(),
        'completedDate': _local_day(item['completed_at'], zone).isoformat(),
        'value': value,
        'unit': unit,
    }


def _highlights(sessions, zone):
    newest = lambda item: (item['completed_at'], item['pk'])
    accuracy_items = [item for item in sessions if item['accuracy'] is not None]
    best_accuracy = max(accuracy_items, key=lambda item: (item['accuracy'], *newest(item)), default=None)
    longest = max(sessions, key=lambda item: (item['duration'] or 0, *newest(item)), default=None)
    rep_items = [
        item for item in sessions
        if item['exercise'] != 'plank'
        and item['metric_type'] == WorkoutSession.METRIC_REPS
        and item['total_reps'] is not None
    ]
    most_reps = max(rep_items, key=lambda item: (item['total_reps'], *newest(item)), default=None)
    return {
        'bestAccuracy': _highlight(best_accuracy, best_accuracy['accuracy'], '%', zone) if best_accuracy else None,
        'longestWorkout': _highlight(longest, longest['duration'], 'seconds', zone) if longest else None,
        'mostReps': _highlight(most_reps, most_reps['total_reps'], 'reps', zone) if most_reps else None,
    }


def _exercise_progress(sessions, zone, interval):
    result = []
    for exercise in EXERCISE_ORDER:
        exercise_sessions = [item for item in sessions if item['exercise'] == exercise]
        accuracy_buckets = defaultdict(list)
        for item in exercise_sessions:
            if item['accuracy'] is not None:
                key = _bucket_key(_local_day(item['completed_at'], zone), interval)
                accuracy_buckets[key].append(item['accuracy'])
        trend = [
            {'date': key.isoformat(), 'value': _average(values)}
            for key, values in sorted(accuracy_buckets.items())
        ]
        is_plank = exercise == 'plank'
        result.append({
            'exercise': exercise,
            'name': SUPPORTED_EXERCISES[exercise],
            'averageAccuracy': _average([item['accuracy'] for item in exercise_sessions]),
            'totalReps': None if is_plank else sum(item['total_reps'] or 0 for item in exercise_sessions),
            'totalHoldTime': sum(item['total_hold_time'] or 0 for item in exercise_sessions) if is_plank else None,
            'setsCompleted': sum(item['sets_completed'] or 0 for item in exercise_sessions),
            'sessions': len(exercise_sessions),
            'trend': trend,
        })
    return result


def _accuracy_distribution(sessions):
    accurate = [item for item in sessions if item['accuracy'] is not None]
    categories = []
    for key, label, minimum, color in ACCURACY_CATEGORIES:
        if key == 'good':
            count = sum(item['accuracy'] >= minimum for item in accurate)
        elif key == 'fair':
            count = sum(minimum <= item['accuracy'] < 80 for item in accurate)
        else:
            count = sum(item['accuracy'] < 60 for item in accurate)
        categories.append({'key': key, 'label': label, 'minimum': minimum, 'count': count, 'color': color})
    return {'total': len(accurate), 'categories': categories}


def _banner(range_key, current, comparison):
    average = current['averageAccuracy']
    if range_key == 'all':
        if average is None:
            return {'tone': 'neutral', 'title': 'Your progress starts here', 'message': 'Complete a workout with form tracking to build your all-time progress record.'}
        return {
            'tone': 'positive',
            'title': 'Your progress at a glance',
            'message': f"Your all-time average form accuracy is {_round_number(average)}% across {current['accuracySessions']} form-tracked session{'s' if current['accuracySessions'] != 1 else ''}.",
        }
    accuracy_comparison = comparison.get('averageAccuracy') if comparison else None
    days = RANGE_DAYS[range_key]
    if average is None:
        return {'tone': 'neutral', 'title': 'Keep building your record', 'message': f'No form accuracy data is available for the past {days} days yet.'}
    if accuracy_comparison is None:
        return {'tone': 'neutral', 'title': 'A new baseline is taking shape', 'message': f'Your average form accuracy is {_round_number(average)}%. Complete more workouts to compare periods.'}
    delta = abs(accuracy_comparison['delta'])
    if accuracy_comparison['direction'] == 'up':
        return {'tone': 'positive', 'title': "You're improving!", 'message': f'Your average form accuracy increased by {delta} percentage points compared with the previous {days} days.'}
    if accuracy_comparison['direction'] == 'down':
        return {'tone': 'neutral', 'title': 'Keep focusing on form', 'message': f'Your average form accuracy is {delta} percentage points below the previous {days} days. Every controlled rep is progress.'}
    return {'tone': 'positive', 'title': 'Your form is holding steady', 'message': f'Your average form accuracy matched the previous {days} days.'}


def build_progress(user, range_key='30d', now=None):
    """Build a synchronized progress snapshot for one rolling date range."""
    range_key = range_key if range_key in {'7d', '30d', 'all'} else '30d'
    now = now or timezone.now()
    base_sessions = _completed_sessions(user).filter(completed_at__lte=now)
    zone = dashboard_timezone()
    first_completed_at = base_sessions.order_by('completed_at', 'pk').values_list('completed_at', flat=True).first()
    first_day = _local_day(first_completed_at, zone) if first_completed_at else None
    zone, today, start_day, day_count, start, end = _bounds(range_key, now, first_day)
    current_sessions = _session_values(base_sessions.filter(completed_at__gte=start, completed_at__lt=end))
    current = _period_metrics(current_sessions, zone)

    previous = None
    if range_key in RANGE_DAYS:
        period_days = RANGE_DAYS[range_key]
        previous_start = start - timedelta(days=period_days)
        previous_sessions = _session_values(base_sessions.filter(completed_at__gte=previous_start, completed_at__lt=start))
        previous = _period_metrics(previous_sessions, zone)
    comparison = _comparison(current, previous, RANGE_DAYS.get(range_key))
    interval = _aggregation_interval(day_count) if range_key == 'all' else 'day'
    consistency = _consistency_data(user, current_sessions, zone, start_day, today, day_count)

    return {
        'range': range_key,
        'timezone': str(zone),
        'today': today.isoformat(),
        'startDate': start_day.isoformat(),
        'endDate': today.isoformat(),
        'stats': {
            **current,
            'dayCount': day_count,
            'consistencyPercentage': consistency['percentage'],
        },
        'comparison': comparison,
        'charts': _chart_data(current_sessions, zone, start_day, today, interval),
        'consistency': consistency,
        'highlights': _highlights(current_sessions, zone),
        'exercises': _exercise_progress(current_sessions, zone, interval),
        'accuracyDistribution': _accuracy_distribution(current_sessions),
        'banner': _banner(range_key, current, comparison),
    }
