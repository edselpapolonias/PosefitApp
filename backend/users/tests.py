from django.test import SimpleTestCase

from .coach_feedback_service import (
    _build_request_body,
    _normalize_feedback,
    normalize_exercise_request,
)


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

    def test_request_requires_exactly_three_short_feedback_sections(self):
        body = _build_request_body(normalize_exercise_request({'exercise': 'squat'}))
        properties = body['generationConfig']['responseSchema']['properties']

        self.assertEqual(
            set(properties),
            {'overallPerformance', 'whatYouDidWell', 'whatToImprove'},
        )
        self.assertEqual(body['generationConfig']['maxOutputTokens'], 512)

    def test_no_detected_issue_cannot_be_replaced_by_invented_problem(self):
        payload = normalize_exercise_request({
            'exercise': 'squat',
            'summary': {'correctReps': 10, 'incorrectReps': 0, 'accuracy': 100, 'mistakes': {}},
        })
        feedback = _normalize_feedback({
            'overallPerformance': 'You completed the session with 100% accuracy.',
            'whatYouDidWell': 'Your recorded repetitions met the form rules.',
            'whatToImprove': 'Your knees may have moved incorrectly.',
        }, payload)

        self.assertIn('No significant form issue was detected', feedback['whatToImprove'])
        self.assertNotIn('knees', feedback['whatToImprove'].lower())

    def test_feedback_is_limited_to_two_sentences_per_section(self):
        payload = normalize_exercise_request({
            'exercise': 'squat',
            'summary': {'mistakes': {'Squat depth too shallow': 2}},
        })
        feedback = _normalize_feedback({
            'overallPerformance': 'First sentence. Second sentence. Third sentence.',
            'whatYouDidWell': 'First strength. Second strength. Third strength.',
            'whatToImprove': 'First action. Second action. Third action.',
        }, payload)

        self.assertNotIn('Third', feedback['overallPerformance'])
        self.assertNotIn('Third', feedback['whatYouDidWell'])
        self.assertNotIn('Third', feedback['whatToImprove'])
