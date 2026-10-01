from datetime import date, datetime, timedelta, timezone

from django.test import TestCase
from rest_framework.test import APIClient

from .models import CustomUser, UserWorkoutPlan, WorkoutPlanDaySession, WorkoutSession
from .progress_service import build_progress


class ProgressTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='progress-page-user', password='test-pass')
        self.other = CustomUser.objects.create_user(username='other-progress-user')
        self.now = datetime(2026, 9, 30, 12, tzinfo=timezone.utc)

    def session(self, key, exercise, days_ago, *, accuracy=90, duration=60, reps=10, hold=0, status='completed', user=None):
        return WorkoutSession.objects.create(
            user=user or self.user,
            session_id=key,
            exercise=exercise,
            exercise_name=exercise.replace('-', ' ').title(),
            metric_type='time' if exercise == 'plank' else 'reps',
            status=status,
            completed_at=self.now - timedelta(days=days_ago),
            duration=duration,
            sets_completed=3,
            accuracy=accuracy,
            total_reps=None if exercise == 'plank' else reps,
            total_hold_time=hold if exercise == 'plank' else None,
        )

    def test_range_snapshot_uses_real_completed_owned_sessions(self):
        self.session('today-squat', 'squat', 0, accuracy=96, duration=600, reps=30)
        self.session('yesterday-plank', 'plank', 1, accuracy=None, duration=180, hold=120)
        self.session('old-lunge', 'lunge', 8, accuracy=70, duration=300, reps=20)
        self.session('ended', 'push-up', 0, accuracy=1, duration=999, reps=99, status='ended')
        self.session('other-user', 'squat', 0, accuracy=1, duration=999, reps=99, user=self.other)

        result = build_progress(self.user, '7d', now=self.now)

        self.assertEqual(result['range'], '7d')
        self.assertEqual(result['startDate'], '2026-09-24')
        self.assertEqual(result['stats']['sessions'], 2)
        self.assertEqual(result['stats']['activeDays'], 2)
        self.assertEqual(result['stats']['totalDuration'], 780)
        self.assertEqual(result['stats']['totalReps'], 30)
        self.assertEqual(result['stats']['averageAccuracy'], 96)
        self.assertEqual(result['accuracyDistribution']['total'], 1)
        self.assertEqual(result['highlights']['bestAccuracy']['sessionId'], 'today-squat')
        self.assertEqual(result['highlights']['bestAccuracy']['completedDate'], '2026-09-30')
        self.assertEqual(result['highlights']['longestWorkout']['sessionId'], 'today-squat')
        self.assertEqual(result['highlights']['mostReps']['sessionId'], 'today-squat')
        plank = next(item for item in result['exercises'] if item['exercise'] == 'plank')
        self.assertIsNone(plank['totalReps'])
        self.assertEqual(plank['totalHoldTime'], 120)

    def test_comparisons_ties_and_all_time_streak_are_deterministic(self):
        self.session('current-older', 'squat', 1, accuracy=90, duration=500, reps=40)
        self.session('current-newer', 'push-up', 0, accuracy=90, duration=500, reps=40)
        self.session('previous', 'lunge', 7, accuracy=80, duration=200, reps=20)
        self.session('streak-three', 'leg-raise', 2, accuracy=88, duration=100, reps=10)

        current = build_progress(self.user, '7d', now=self.now)
        self.assertEqual(current['comparison']['averageAccuracy']['delta'], 9.3)
        self.assertEqual(current['highlights']['bestAccuracy']['sessionId'], 'current-newer')
        self.assertEqual(current['highlights']['longestWorkout']['sessionId'], 'current-newer')
        self.assertEqual(current['highlights']['mostReps']['sessionId'], 'current-newer')
        self.assertEqual(current['consistency']['longestStreak'], 3)

        all_time = build_progress(self.user, 'all', now=self.now)
        self.assertIsNone(all_time['comparison'])
        self.assertEqual(all_time['stats']['dayCount'], 8)
        self.assertEqual(all_time['consistency']['longestStreak'], 3)

    def test_partial_plan_day_is_visualized_but_not_counted(self):
        plan = UserWorkoutPlan.objects.create(
            user=self.user,
            plan_id='beginner-full-body',
            start_date=date(2026, 9, 30),
        )
        day = WorkoutPlanDaySession.objects.create(
            user=self.user,
            plan=plan,
            session_id='partial-day',
            workout_id='week-1-monday',
            week=1,
            workout_day='Monday',
            scheduled_date=date(2026, 9, 30),
            exercises=[],
        )
        partial = self.session('hidden-plan-set', 'squat', 0, accuracy=99, duration=999, reps=99)
        partial.workout_plan_day_session = day
        partial.save(update_fields=['workout_plan_day_session'])

        result = build_progress(self.user, '7d', now=self.now)

        self.assertEqual(result['stats']['sessions'], 0)
        self.assertEqual(result['consistency']['days'][-1]['status'], 'partial')

    def test_endpoint_authentication_default_and_explicit_ranges(self):
        anonymous = APIClient().get('/api/users/progress/')
        self.assertIn(anonymous.status_code, [401, 403])
        client = APIClient()
        client.force_authenticate(self.user)
        self.assertEqual(client.get('/api/users/progress/').data['range'], '30d')
        self.assertEqual(client.get('/api/users/progress/?range=all').data['range'], 'all')
        self.assertEqual(client.get('/api/users/progress/?range=unknown').data['range'], '30d')

    def test_completed_session_can_persist_missing_accuracy_as_missing(self):
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.post('/api/users/sessions/complete/', {
            'id': 'missing-accuracy',
            'exercise': {'id': 'squat', 'name': 'Squat'},
            'metricType': 'reps',
            'status': 'completed',
            'completedAt': self.now.isoformat(),
            'duration': 60,
            'setsCompleted': 1,
            'totalReps': 10,
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(WorkoutSession.objects.get(session_id='missing-accuracy').accuracy)
        self.assertIsNone(build_progress(self.user, '7d', now=self.now)['stats']['averageAccuracy'])
