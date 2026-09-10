"""Read-only dashboard aggregates from session history and recorded login days."""
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.utils import timezone

from .models import LoginDay, WorkoutSession


def dashboard_timezone():
    return ZoneInfo(getattr(settings, 'DASHBOARD_TIME_ZONE', 'Asia/Manila'))


def record_login_day(user):
    return LoginDay.objects.get_or_create(
        user=user, date=timezone.localdate(timezone=dashboard_timezone()),
    )


def build_dashboard(user, now=None):
    zone = dashboard_timezone()
    now = now or timezone.now()
    today = now.astimezone(zone).date()
    monday = today - timedelta(days=today.weekday())
    start = datetime.combine(monday, time.min, tzinfo=zone)
    end = start + timedelta(days=7)
    days = [monday + timedelta(days=offset) for offset in range(7)]
    seconds_by_day = dict.fromkeys(days, 0)
    sessions = WorkoutSession.objects.filter(
        user=user, status=WorkoutSession.STATUS_COMPLETED,
        completed_at__gte=start, completed_at__lt=end, completed_at__lte=now,
    ).values('completed_at', 'duration', 'exercise', 'accuracy')
    accuracies = []
    count = 0
    for session in sessions:
        count += 1
        seconds_by_day[session['completed_at'].astimezone(zone).date()] += session['duration']
        if session['exercise'] in {'squat', 'push-up', 'lunge', 'leg-raise'}:
            accuracies.append(session['accuracy'])

    login_days = list(user.login_days.filter(date__lte=today).values_list('date', flat=True))
    login_set = set(login_days)
    current = 0
    cursor = today if today in login_set else today - timedelta(days=1)
    while cursor in login_set:
        current += 1
        cursor -= timedelta(days=1)
    best = run = 0
    previous = None
    for day in login_days:
        run = run + 1 if previous and day == previous + timedelta(days=1) else 1
        best = max(best, run)
        previous = day
    return {
        'firstName': user.first_name or user.username,
        'timezone': str(zone), 'today': today.isoformat(),
        'weekStart': monday.isoformat(), 'weekEnd': days[-1].isoformat(),
        'totalSeconds': sum(seconds_by_day.values()), 'workoutsCompleted': count,
        'averageAccuracy': round(sum(accuracies) / len(accuracies), 1) if accuracies else None,
        'currentStreak': current, 'bestStreak': best,
        'days': [
            {'date': day.isoformat(), 'seconds': seconds_by_day[day], 'loggedIn': day in login_set}
            for day in days
        ],
    }
