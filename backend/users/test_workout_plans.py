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

    @patch('users.workout_plan_views.timezone.localdate', return_value=date(2026, 9, 11))
    def test_different_active_plans_coexist_and_can_end_independently(self, _today):
        previous = UserWorkoutPlan.objects.create(user=self.user, plan_id='lower-body-focus', start_date=date(2026, 9, 14))
        response = self.client.post('/api/users/workout-plans/active/', {
            'planId': 'beginner-full-body',
            'startDate': '2026-09-14',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        previous.refresh_from_db()
        self.assertEqual(previous.status, 'active')
        self.assertEqual(UserWorkoutPlan.objects.filter(user=self.user, status='active').count(), 2)
        plans = self.client.get('/api/users/workout-plans/active/').data['plans']
        self.assertEqual([plan['id'] for plan in plans], ['lower-body-focus', 'beginner-full-body'])

        self.client.post('/api/users/workout-plans/end/', {'instanceId': response.data['plan']['instanceId']}, format='json')
        remaining = self.client.get('/api/users/workout-plans/active/').data['plans']
        self.assertEqual([plan['id'] for plan in remaining], ['lower-body-focus'])

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

    @patch('users.workout_plan_views.timezone.localdate', return_value=date(2026, 9, 15))
    def test_lower_body_uses_tuesday_thursday_saturday_and_its_own_ids(self, _today):
        response = self.client.post('/api/users/workout-plans/active/', {
            'planId': 'lower-body-focus',
            'startDate': '2026-09-21',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        plan = response.data['plan']
        self.assertEqual(plan['name'], 'Lower Body Focus')
        self.assertEqual(plan['completedWorkouts'], 0)
        self.assertEqual(plan['remainingWorkouts'], 12)
        self.assertEqual([item['day'] for item in plan['schedule']], ['Tuesday', 'Thursday', 'Saturday'] * 4)
        self.assertEqual(
            [date.fromisoformat(item['date']).weekday() for item in plan['schedule']],
            [1, 3, 5] * 4,
        )
        self.assertEqual(plan['schedule'][0]['id'], 'lower-body-week-1-tuesday')
        self.assertEqual(plan['schedule'][-1]['id'], 'lower-body-week-4-saturday')
        self.assertEqual(plan['schedule'][0]['date'], '2026-09-22')
        self.assertEqual(plan['schedule'][-1]['date'], '2026-10-17')

    @patch('users.workout_plan_views.timezone.localdate', return_value=date(2026, 9, 11))
    def test_core_upper_uses_monday_wednesday_friday_and_its_own_ids(self, _today):
        response = self.client.post('/api/users/workout-plans/active/', {
            'planId': 'core-upper-body',
            'startDate': '2026-09-14',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        plan = response.data['plan']
        self.assertEqual(plan['name'], 'Core & Upper Body')
        self.assertEqual(plan['startDate'], '2026-09-14')
        self.assertEqual(plan['completedWorkouts'], 0)
        self.assertEqual(plan['remainingWorkouts'], 12)
        self.assertEqual([item['day'] for item in plan['schedule']], ['Monday', 'Wednesday', 'Friday'] * 4)
        self.assertEqual(
            [date.fromisoformat(item['date']).weekday() for item in plan['schedule']],
            [0, 2, 4] * 4,
        )
        self.assertEqual(plan['schedule'][0]['id'], 'core-upper-week-1-monday')
        self.assertEqual(plan['schedule'][-1]['id'], 'core-upper-week-4-friday')
        self.assertEqual(plan['schedule'][0]['date'], '2026-09-14')
        self.assertEqual(plan['schedule'][-1]['date'], '2026-10-09')

    def test_core_upper_day_session_persists_circuit_sets_and_completes_one_workout(self):
        plan = UserWorkoutPlan.objects.create(
            user=self.user,
            plan_id='core-upper-body',
            start_date=date(2026, 9, 14),
        )
        session_id = f'plan-{plan.pk}-core-upper-week-1-monday'
        started = self.client.post('/api/users/workout-plans/day-sessions/start/', {
            'id': session_id,
            'planInstanceId': plan.pk,
            'workoutId': 'core-upper-week-1-monday',
            'week': 1,
            'workoutDay': 'Monday',
            'scheduledDate': '2026-09-14',
            'exercises': [
                {'exerciseId': 'push-up', 'name': 'Push-up', 'metricType': 'reps', 'setsRequired': 2, 'repsPerSet': 8},
                {'exerciseId': 'plank', 'name': 'Plank', 'metricType': 'time', 'setsRequired': 2, 'durationPerSet': 20},
                {'exerciseId': 'leg-raise', 'name': 'Leg Raise', 'metricType': 'reps', 'setsRequired': 1, 'repsPerSet': 10},
            ],
        }, format='json')
        self.assertEqual(started.status_code, 200)
        self.assertEqual(started.data['session']['currentExerciseIndex'], 0)

        early_finish = self.client.post('/api/users/workout-plans/day-sessions/finish/', {'sessionId': session_id}, format='json')
        self.assertEqual(early_finish.status_code, 409)

        steps = [
            ('push-up', {'correctReps': 8}, 1),
            ('plank', {'totalHoldTime': 20}, 2),
            ('leg-raise', {'correctReps': 10}, 0),
            ('push-up', {'correctReps': 8}, 1),
            ('plank', {'totalHoldTime': 20}, -1),
        ]
        last_session = None
        for index, (exercise_id, result_values, next_index) in enumerate(steps):
            completed = self.client.post('/api/users/workout-plans/day-sessions/set-complete/', {
                'sessionId': session_id,
                'exerciseId': exercise_id,
                'sessionResult': {
                    'id': f'core-set-{index + 1}',
                    'status': 'completed',
                    'accuracy': 90,
                    'duration': 20,
                    'formIssues': [],
                    **result_values,
                },
            }, format='json')
            self.assertEqual(completed.status_code, 200)
            last_session = completed.data['session']
            self.assertEqual(last_session['currentExerciseIndex'], next_index)

        self.assertEqual([item['completedSets'] for item in last_session['exercises']], [2, 2, 1])
        self.assertEqual([len(item['results']) for item in last_session['exercises']], [2, 2, 1])

        finished = self.client.post('/api/users/workout-plans/day-sessions/finish/', {'sessionId': session_id}, format='json')
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(finished.data['plan']['completedWorkoutIds'], ['core-upper-week-1-monday'])
        self.assertEqual(finished.data['plan']['completedWorkouts'], 1)
        self.assertEqual(finished.data['plan']['remainingWorkouts'], 11)
        self.assertEqual(finished.data['plan']['percentage'], 8)

    def test_lower_body_day_session_requires_each_leg_target(self):
        plan = UserWorkoutPlan.objects.create(
            user=self.user,
            plan_id='lower-body-focus',
            start_date=date(2026, 9, 21),
        )
        session_id = f'plan-{plan.pk}-lower-body-week-1-tuesday'
        started = self.client.post('/api/users/workout-plans/day-sessions/start/', {
            'id': session_id,
            'planInstanceId': plan.pk,
            'workoutId': 'lower-body-week-1-tuesday',
            'week': 1,
            'workoutDay': 'Tuesday',
            'scheduledDate': '2026-09-22',
            'exercises': [{
                'exerciseId': 'lunge',
                'name': 'Lunge',
                'metricType': 'reps',
                'setsRequired': 1,
                'repsPerSet': 8,
                'perLeg': True,
            }],
        }, format='json')
        self.assertEqual(started.status_code, 200)

        incomplete = self.client.post('/api/users/workout-plans/day-sessions/set-complete/', {
            'sessionId': session_id,
            'exerciseId': 'lunge',
            'sessionResult': {
                'id': 'lunge-one-leg',
                'status': 'completed',
                'correctReps': 16,
                'analysis': {'perLegCounts': {'left': 8, 'right': 7}},
            },
        }, format='json')
        self.assertEqual(incomplete.status_code, 400)

        completed = self.client.post('/api/users/workout-plans/day-sessions/set-complete/', {
            'sessionId': session_id,
            'exerciseId': 'lunge',
            'sessionResult': {
                'id': 'lunge-both-legs',
                'status': 'completed',
                'correctReps': 16,
                'analysis': {'perLegCounts': {'left': 8, 'right': 8}},
            },
        }, format='json')
        self.assertEqual(completed.status_code, 200)
        self.assertEqual(completed.data['session']['exercises'][0]['completedSets'], 1)

        finished = self.client.post('/api/users/workout-plans/day-sessions/finish/', {
            'sessionId': session_id,
        }, format='json')
        self.assertEqual(finished.status_code, 200)
        self.assertEqual(finished.data['plan']['completedWorkoutIds'], ['lower-body-week-1-tuesday'])
        self.assertEqual(finished.data['plan']['completedWorkouts'], 1)
        self.assertEqual(finished.data['plan']['remainingWorkouts'], 11)
        self.assertEqual(finished.data['plan']['percentage'], 8)
