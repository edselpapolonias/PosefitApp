from datetime import date
from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from .models import CustomUser, UserWorkoutPlan
from .workout_plan_views import first_monday


class WorkoutPlanTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username='plan-user', password='test-pass')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_monday_rule_for_all_activation_days(self):
        for day in range(14, 21):
            expected = date(2026, 9, 14 if day == 14 else 21)
            self.assertEqual(first_monday(date(2026, 9, day)), expected)

    @patch('users.workout_plan_views.timezone.localdate', return_value=date(2026, 9, 15))
    def test_activation_is_owned_idempotent_and_has_twelve_dates(self, _today):
        url = '/api/users/workout-plans/active/'
        self.assertIsNone(self.client.get(url).data['plan'])
        self.assertEqual(UserWorkoutPlan.objects.count(), 0)
        response = self.client.post(url, {'planId': 'beginner-full-body', 'userId': 999, 'startDate': '2026-09-21'}, format='json')
        self.assertEqual(response.status_code, 200)
        plan = response.data['plan']
        self.assertEqual(plan['userId'], self.user.pk)
        self.assertEqual(plan['startDate'], '2026-09-21')
        self.assertEqual(plan['activeWeek'], 1)
        self.assertEqual(plan['completedWorkouts'], 0)
        self.assertEqual(plan['remainingWorkouts'], 12)
        self.assertEqual([date.fromisoformat(item['date']).weekday() for item in plan['schedule']], [0, 2, 4] * 4)
        again = self.client.post(url, {'planId': 'beginner-full-body'}, format='json')
        self.assertEqual(again.data['plan']['instanceId'], plan['instanceId'])
        self.assertEqual(UserWorkoutPlan.objects.count(), 1)
        self.client.post('/api/users/workout-plans/end/', {'instanceId': plan['instanceId']}, format='json')
        self.assertIsNone(self.client.get(url).data['plan'])
        self.assertEqual(UserWorkoutPlan.objects.get().status, 'ended')

    def test_other_active_plan_is_not_replaced(self):
        previous = UserWorkoutPlan.objects.create(user=self.user, plan_id='other-plan', start_date=date(2026, 9, 14))
        response = self.client.post('/api/users/workout-plans/active/', {'planId': 'beginner-full-body'}, format='json')
        self.assertEqual(response.status_code, 409)
        previous.refresh_from_db()
        self.assertEqual(previous.status, 'active')

    def test_authentication_and_ownership(self):
        self.assertIn(APIClient().post('/api/users/workout-plans/active/', {'planId': 'beginner-full-body'}).status_code, [401, 403])
        other = CustomUser.objects.create_user(username='other-plan-user')
        plan = UserWorkoutPlan.objects.create(user=other, plan_id='beginner-full-body', start_date=date(2026, 9, 14))
        self.client.post('/api/users/workout-plans/end/', {'instanceId': plan.pk}, format='json')
        plan.refresh_from_db()
        self.assertEqual(plan.status, 'active')
        self.assertIsNone(self.client.get('/api/users/workout-plans/active/').data['plan'])

    @patch('users.workout_plan_views.timezone.localdate', return_value=date(2026, 9, 14))
    def test_selected_monday_validation(self, _today):
        for value in ['2026-09-07', '2026-09-15', 'bad-date', '', None]:
            response = self.client.post('/api/users/workout-plans/active/', {'planId': 'beginner-full-body', 'startDate': value}, format='json')
            self.assertEqual(response.status_code, 400)
        self.assertEqual(UserWorkoutPlan.objects.count(), 0)
        response = self.client.post('/api/users/workout-plans/active/', {'planId': 'beginner-full-body', 'startDate': '2026-10-05'}, format='json')
        self.assertEqual(response.status_code, 200)
        plan = response.data['plan']
        self.assertEqual(plan['startDate'], '2026-10-05')
        self.assertEqual(plan['schedule'][-1]['date'], '2026-10-30')
