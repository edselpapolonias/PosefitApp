from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from django.test import SimpleTestCase, TestCase
from django.utils import timezone as django_timezone
from rest_framework.test import APIClient

from .coach_feedback_service import (
    _build_request_body,
    _normalize_feedback,
    normalize_exercise_request,
)
from .session_progress_service import build_progress_comparison
from .models import CustomUser, WorkoutSession


class CoachFeedbackServiceTests(SimpleTestCase):
    def test_normalizes_only_recorded_session_measurements(self):
        payload = normalize_exercise_request({
            'exercise': 'squat',
            'summary': {
                'metricType': 'reps',
                'totalReps': 30,
                'correctReps': 26,
                'incorrectReps': 4,
                'setsCompleted': 3,
                'accuracy': 87,
                'duration': 342,
                'mistakes': {'Squat depth too shallow': 3, 'Ignored issue': 0},
                'angleStats': {'minDeepestAngle': 76, 'maxDeepestAngle': 112, 'averageDeepestAngle': 91},
                'email': 'must-not-be-forwarded@example.com',
            },
        })

        summary = payload['summary']
        self.assertEqual(summary['mostFrequentFormIssue'], 'Squat depth too shallow')
        self.assertEqual(summary['mistakes'], {'Squat depth too shallow': 3})
        self.assertNotIn('email', summary)

    def test_request_requires_one_feedback_paragraph(self):
        body = _build_request_body(normalize_exercise_request({'exercise': 'squat'}))
        properties = body['generationConfig']['responseSchema']['properties']

        self.assertEqual(set(properties), {'feedbackParagraph'})
        self.assertEqual(body['generationConfig']['thinkingConfig']['thinkingBudget'], 0)
        self.assertEqual(body['generationConfig']['maxOutputTokens'], 2048)

    def test_feedback_is_normalized_to_one_paragraph(self):
        payload = normalize_exercise_request({
            'exercise': 'squat',
            'summary': {'correctReps': 10, 'incorrectReps': 0, 'accuracy': 100, 'mistakes': {}},
        })
        feedback = _normalize_feedback({
            'feedbackParagraph': (
                'Excellent session. You completed all repetitions correctly with 100% accuracy. '
                'Continue using the same controlled movement in your next session.'
            ),
        }, payload)

        self.assertEqual(set(feedback), {'feedbackParagraph'})
        self.assertNotIn('\n', feedback['feedbackParagraph'])

    def test_feedback_is_limited_to_four_sentences(self):
        payload = normalize_exercise_request({
            'exercise': 'squat',
            'summary': {'mistakes': {'Squat depth too shallow': 2}},
        })
        feedback = _normalize_feedback({
            'feedbackParagraph': 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.',
        }, payload)

        self.assertIn('Fourth sentence.', feedback['feedbackParagraph'])
        self.assertNotIn('Fifth sentence.', feedback['feedbackParagraph'])

    def test_legacy_sectioned_feedback_is_combined(self):
        payload = normalize_exercise_request({'exercise': 'squat'})
        feedback = _normalize_feedback({
            'overallPerformance': 'Solid session.',
            'whatYouDidWell': 'Most repetitions were correct.',
            'whatToImprove': 'Keep the movement controlled.',
        }, payload)

        self.assertEqual(
            feedback['feedbackParagraph'],
            'Solid session. Most repetitions were correct. Keep the movement controlled.',
        )


def session_result(accuracy, session_id='session-current'):
    return SimpleNamespace(
        session_id=session_id,
        exercise_name='Squat',
        accuracy=accuracy,
        completed_at=datetime(2026, 9, 3, tzinfo=timezone.utc),
        correct_reps=9,
        incorrect_reps=1,
        total_hold_time=None,
    )


class ProgressComparisonTests(SimpleTestCase):
    def test_first_session_does_not_create_a_fake_previous_accuracy(self):
        comparison = build_progress_comparison(session_result(92), None)

        self.assertFalse(comparison['hasPrevious'])
        self.assertEqual(comparison['status'], 'first_session')
        self.assertIsNone(comparison['previous'])
        self.assertIsNone(comparison['differencePercentagePoints'])

    def test_improvement_is_measured_in_percentage_points(self):
        comparison = build_progress_comparison(
            session_result(92),
            session_result(77, 'session-previous'),
        )

        self.assertEqual(comparison['status'], 'improved')
        self.assertEqual(comparison['differencePercentagePoints'], 15)
        self.assertIn('15 percentage points', comparison['message'])

    def test_decrease_uses_neutral_deterministic_wording(self):
        comparison = build_progress_comparison(
            session_result(84),
            session_result(92, 'session-previous'),
        )

        self.assertEqual(comparison['status'], 'decreased')
        self.assertEqual(comparison['differencePercentagePoints'], -8)
        self.assertIn('decreased by 8 percentage points', comparison['message'])

    def test_equal_accuracy_reports_no_change(self):
        comparison = build_progress_comparison(
            session_result(90),
            session_result(90, 'session-previous'),
        )

        self.assertEqual(comparison['status'], 'no_change')
        self.assertEqual(comparison['differencePercentagePoints'], 0)
        self.assertIn('remained the same', comparison['message'])


class WorkoutSessionApiTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='progress-user', password='password123')
        self.other_user = CustomUser.objects.create_user(username='other-user', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.completed_at = django_timezone.now()

    def create_session(self, user, session_id, exercise, accuracy, completed_at):
        return WorkoutSession.objects.create(
            user=user,
            session_id=session_id,
            exercise=exercise,
            exercise_name=exercise.replace('-', ' ').title(),
            metric_type=WorkoutSession.METRIC_REPS,
            status=WorkoutSession.STATUS_COMPLETED,
            completed_at=completed_at,
            accuracy=accuracy,
        )

    def test_endpoint_compares_only_immediately_previous_same_user_exercise(self):
        previous = self.create_session(
            self.user,
            'previous-squat',
            'squat',
            77,
            self.completed_at - timedelta(days=2),
        )
        self.create_session(
            self.user,
            'previous-lunge',
            'lunge',
            99,
            self.completed_at - timedelta(days=1),
        )
        self.create_session(
            self.other_user,
            'other-squat',
            'squat',
            100,
            self.completed_at - timedelta(hours=1),
        )

        payload = {
            'id': 'current-squat',
            'exercise': {'id': 'squat', 'name': 'Squat'},
            'metricType': 'reps',
            'status': 'completed',
            'completedAt': self.completed_at.isoformat(),
            'accuracy': 92,
            'setsCompleted': 3,
            'totalReps': 30,
            'correctReps': 28,
            'incorrectReps': 2,
        }
        response = self.client.post('/api/users/sessions/complete/', payload, format='json')

        self.assertEqual(response.status_code, 200)
        comparison = response.data['comparison']
        self.assertEqual(comparison['previous']['sessionId'], previous.session_id)
        self.assertEqual(comparison['differencePercentagePoints'], 15)

        second_response = self.client.post('/api/users/sessions/complete/', payload, format='json')
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(
            WorkoutSession.objects.filter(user=self.user, session_id='current-squat').count(),
            1,
        )

    def test_endpoint_requires_an_authenticated_user(self):
        client = APIClient()
        response = client.post('/api/users/sessions/complete/', {}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_login_csrf_token_allows_authenticated_session_save(self):
        client = APIClient(enforce_csrf_checks=True)
        login_response = client.post(
            '/api/users/login/',
            {'username': self.user.username, 'password': 'password123'},
            format='json',
        )

        self.assertEqual(login_response.status_code, 200)
        csrf_token = login_response.data['csrf_token']
        response = client.post(
            '/api/users/sessions/complete/',
            {
                'id': 'csrf-session',
                'exercise': {'id': 'plank', 'name': 'Plank'},
                'metricType': 'time',
                'status': 'completed',
                'completedAt': self.completed_at.isoformat(),
                'accuracy': 88,
                'totalHoldTime': 60,
            },
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
            HTTP_ORIGIN='http://127.0.0.1:3000',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['comparison']['title'].startswith('First Plank'))

    def test_login_accepts_valid_csrf_when_an_old_session_cookie_exists(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.user)
        csrf_token = client.get('/api/users/csrf/').data['csrf_token']

        response = client.post(
            '/api/users/login/',
            {'username': self.user.username, 'password': 'password123'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token,
            HTTP_ORIGIN='http://127.0.0.1:3000',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['username'], self.user.username)
