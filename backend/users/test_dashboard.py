from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import TestCase
from rest_framework.test import APIClient

from .dashboard_service import build_dashboard, record_login_day
from .models import CustomUser, LoginDay, WorkoutSession


class DashboardTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='dashboard-user', password='test-password', first_name='Alex')
        self.now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)

    def session(self, key, when, seconds=60, accuracy=90, exercise='squat', status='completed', user=None):
        return WorkoutSession.objects.create(
            user=user or self.user, session_id=key, exercise=exercise, exercise_name=exercise,
            status=status, completed_at=when, duration=seconds, accuracy=accuracy,
        )

    def test_week_uses_manila_boundary_and_only_completed_user_sessions(self):
        # Monday begins at Sunday 16:00 UTC in Manila.
        start = datetime(2026, 9, 6, 16, tzinfo=timezone.utc)
        self.session('previous-week', start - timedelta(seconds=1), 600)
        self.session('monday', start, 120, 80)
        self.session('plank', start + timedelta(hours=2), 60, 10, 'plank')
        self.session('push-up', self.now, 180, 100, 'push-up')
        self.session('ended', self.now, 900, status='ended')
        self.session('future', self.now + timedelta(days=8), 900)
        other = CustomUser.objects.create_user(username='other')
        self.session('other-user', self.now, 900, user=other)
        result = build_dashboard(self.user, self.now)
        self.assertEqual(result['weekStart'], '2026-09-07')
        self.assertEqual(result['totalSeconds'], 360)
        self.assertEqual(result['workoutsCompleted'], 3)
        self.assertEqual(result['averageAccuracy'], 90)
        self.assertEqual(result['days'][0]['seconds'], 180)
        self.assertEqual(sum(day['seconds'] for day in result['days']), result['totalSeconds'])
        self.assertEqual(WorkoutSession.objects.count(), 7)
        next_week = build_dashboard(self.user, self.now + timedelta(days=4))
        self.assertEqual(next_week['totalSeconds'], 0)
        self.assertEqual(WorkoutSession.objects.count(), 7)

    def test_empty_accuracy_is_null_but_recorded_zero_is_zero(self):
        self.assertIsNone(build_dashboard(self.user, self.now)['averageAccuracy'])
        self.session('plank', self.now, exercise='plank')
        self.assertIsNone(build_dashboard(self.user, self.now)['averageAccuracy'])
        self.session('zero', self.now, accuracy=0, exercise='leg-raise')
        self.assertEqual(build_dashboard(self.user, self.now)['averageAccuracy'], 0)

    def test_unique_login_days_current_and_best_streak(self):
        today = self.now.astimezone(ZoneInfo('Asia/Manila')).date()
        for offset in [8, 7, 6, 2, 1, 0]:
            LoginDay.objects.create(user=self.user, date=today - timedelta(days=offset))
        with patch('users.dashboard_service.timezone.localdate', return_value=today):
            record_login_day(self.user)
            record_login_day(self.user)
        self.assertEqual(LoginDay.objects.count(), 6)
        result = build_dashboard(self.user, self.now)
        self.assertEqual(result['currentStreak'], 3)
        self.assertEqual(result['bestStreak'], 3)
        self.assertEqual(sum(day['loggedIn'] for day in result['days']), 3)
        self.assertEqual(build_dashboard(self.user, self.now + timedelta(days=1))['currentStreak'], 3)
        self.assertEqual(build_dashboard(self.user, self.now + timedelta(days=2))['currentStreak'], 0)

    def test_endpoint_requires_authentication_and_returns_user_name(self):
        client = APIClient()
        self.assertIn(client.get('/api/users/dashboard/').status_code, [401, 403])
        client.force_authenticate(self.user)
        response = client.get('/api/users/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['firstName'], 'Alex')

    def test_successful_login_records_one_local_day(self):
        client = APIClient()
        for _ in range(2):
            response = client.post('/api/users/login/', {'username': self.user.username, 'password': 'test-password'})
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.login_days.count(), 1)

    def test_login_date_uses_manila_midnight(self):
        with patch('django.utils.timezone.now', return_value=datetime(2026, 9, 6, 16, tzinfo=timezone.utc)):
            record_login_day(self.user)
        self.assertEqual(self.user.login_days.get().date.isoformat(), '2026-09-07')
