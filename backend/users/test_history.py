from datetime import date, datetime, timedelta, timezone

from django.test import TestCase
from rest_framework.test import APIClient

from .history_service import build_history, history_session_data
from .models import CustomUser, LoginDay, UserWorkoutPlan, WorkoutSession
from .workout_plan_views import plan_schedule


class HistoryTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='history-user', password='test-pass')
        self.other_user = CustomUser.objects.create_user(username='other-history-user')
        self.now = datetime(2026, 9, 12, 4, tzinfo=timezone.utc)

    def session(self, key, exercise, when, duration=60, accuracy=90, status='completed', user=None):
        return WorkoutSession.objects.create(
            user=user or self.user,
            session_id=key,
            exercise=exercise,
            exercise_name=exercise.replace('-', ' ').title(),
            metric_type='time' if exercise == 'plank' else 'reps',
            status=status,
            completed_at=when,
            duration=duration,
            sets_completed=3,
            accuracy=accuracy,
            configuration={'totalSets': 3, 'holdSecondsPerSet': 20} if exercise == 'plank' else {'totalSets': 3, 'repsPerSet': 10},
        )

    def test_all_time_metrics_use_only_supported_completed_user_sessions(self):
        self.session('old-squat', 'squat', self.now - timedelta(days=100), 90, 80)
        self.session('plank', 'plank', self.now - timedelta(days=1), 150, 100)
        self.session('ended', 'lunge', self.now, 999, 1, 'ended')
        self.session('legacy-sit-up', 'sit-up', self.now, 999, 1)
        self.session('other', 'squat', self.now, 999, 1, user=self.other_user)
        for offset in [9, 8, 7, 3, 2, 1, 0]:
            LoginDay.objects.create(user=self.user, date=date(2026, 9, 12) - timedelta(days=offset))

        complete_plan = UserWorkoutPlan.objects.create(
            user=self.user,
            plan_id='beginner-full-body',
            start_date=date(2026, 8, 3),
            completed_at=self.now,
        )
        complete_plan.completed_workout_ids = [item['id'] for item in plan_schedule(complete_plan)]
        complete_plan.save(update_fields=['completed_workout_ids'])
        incomplete_plan = UserWorkoutPlan.objects.create(
            user=self.user,
            plan_id='lower-body-focus',
            start_date=date(2026, 8, 4),
            completed_at=self.now,
        )
        incomplete_plan.completed_workout_ids = [item['id'] for item in plan_schedule(incomplete_plan)[:11]]
        incomplete_plan.save(update_fields=['completed_workout_ids'])

        result = build_history(self.user, today=date(2026, 9, 12))

        self.assertEqual(result['stats'], {
            'totalWorkouts': 2,
            'totalDuration': 240,
            'workoutPlansCompleted': 1,
            'averageAccuracy': 90.0,
            'bestStreak': 4,
        })
        self.assertEqual([item['exercise'] for item in result['sessions']['items']], ['plank', 'squat'])
        self.assertEqual(result['topExercises'][0]['sessions'], 1)
        self.assertEqual(sum(day['count'] for day in result['activityOverview']), 1)

    def test_search_pagination_and_endpoint_authentication(self):
        for index in range(8):
            self.session(
                f'squat-{index}',
                'squat',
                self.now - timedelta(hours=index),
            )
        self.session('plank', 'plank', self.now + timedelta(minutes=1))

        first_page = build_history(self.user, page=1, today=date(2026, 9, 12))
        self.assertEqual(first_page['sessions']['totalPages'], 2)
        self.assertEqual(first_page['sessions']['items'][0]['exercise'], 'plank')
        search_result = build_history(self.user, search='PLANK', page=4, today=date(2026, 9, 12))
        self.assertEqual(search_result['sessions']['page'], 1)
        self.assertEqual(search_result['sessions']['totalItems'], 1)

        anonymous = APIClient().get('/api/users/history/')
        self.assertIn(anonymous.status_code, [401, 403])
        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get('/api/users/history/?search=squat&page=2')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['sessions']['page'], 2)

    def test_session_detail_returns_saved_data_and_enforces_ownership(self):
        session = self.session('selected-squat', 'squat', self.now, 680, 94)
        session.total_reps = 30
        session.correct_reps = 28
        session.incorrect_reps = 2
        session.set_results = [
            {'setNum': 1, 'goodReps': 10, 'badReps': 0, 'accuracy': 100},
            {'setNum': 2, 'goodReps': 9, 'badReps': 1, 'accuracy': 90},
        ]
        session.form_issues = [
            {'issueId': 'squat:insufficient-depth', 'label': 'Incomplete Squat Depth', 'count': 1, 'advice': 'Lower with control.'},
        ]
        session.feedback = {
            'feedbackParagraph': 'Your saved feedback.',
            'issueFeedback': [{'issueId': 'squat:insufficient-depth', 'advice': 'Use the saved advice.'}],
        }
        session.save(update_fields=[
            'total_reps', 'correct_reps', 'incorrect_reps', 'set_results', 'form_issues', 'feedback',
        ])

        detail = history_session_data(self.user, 'selected-squat')
        self.assertEqual(detail['id'], 'selected-squat')
        self.assertEqual(detail['totalReps'], 30)
        self.assertEqual(detail['setResults'], session.set_results)
        self.assertEqual(detail['formIssues'], session.form_issues)
        self.assertEqual(detail['feedback'], session.feedback)

        client = APIClient()
        client.force_authenticate(self.user)
        response = client.get('/api/users/history/sessions/selected-squat/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['session']['feedback'], session.feedback)

        other_client = APIClient()
        other_client.force_authenticate(self.other_user)
        self.assertEqual(other_client.get('/api/users/history/sessions/selected-squat/').status_code, 404)
        self.assertEqual(history_session_data(self.user, 'missing-session'), None)
