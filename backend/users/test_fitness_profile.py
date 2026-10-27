from django.test import TestCase
from rest_framework.test import APIClient

from .models import CustomUser, FitnessProfile


class FitnessProfileApiTests(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username='profile-user',
            password='password123',
            first_name='Pose',
            last_name='User',
            age=28,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.payload = {
            'age': 29,
            'fitnessLevel': 'intermediate',
            'exerciseExperience': '1_to_2_years',
            'physicalLimitations': 'yes',
            'affectedAreas': ['knee', 'back'],
        }

    def test_existing_accounts_are_not_forced_into_onboarding(self):
        response = self.client.get('/api/users/fitness-profile/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['shouldOnboard'])
        self.assertFalse(response.data['profile']['onboardingCompleted'])
        self.assertEqual(response.data['user']['age'], 28)

    def test_profile_update_belongs_to_authenticated_user(self):
        response = self.client.put('/api/users/fitness-profile/', self.payload, format='json')

        self.assertEqual(response.status_code, 200)
        profile = FitnessProfile.objects.get(user=self.user)
        self.assertEqual(profile.affected_areas, ['knee', 'back'])
        self.assertTrue(profile.onboarding_completed)
        self.assertFalse(response.data['shouldOnboard'])
        self.user.refresh_from_db()
        self.assertEqual(self.user.age, 29)

    def test_no_or_prefer_not_to_say_clears_affected_areas(self):
        self.client.put('/api/users/fitness-profile/', self.payload, format='json')
        payload = {**self.payload, 'physicalLimitations': 'prefer_not_to_say'}
        response = self.client.put('/api/users/fitness-profile/', payload, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['profile']['physicalLimitations'], 'prefer_not_to_say')
        self.assertEqual(response.data['profile']['affectedAreas'], [])

    def test_invalid_profile_values_are_rejected(self):
        response = self.client.put(
            '/api/users/fitness-profile/',
            {**self.payload, 'age': 0, 'affectedAreas': ['ankle']},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(FitnessProfile.objects.filter(user=self.user).exists())

    def test_request_cannot_select_another_users_profile(self):
        other_user = CustomUser.objects.create_user(username='other-profile-user', age=44)
        response = self.client.put(
            '/api/users/fitness-profile/',
            {**self.payload, 'user': other_user.pk},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(FitnessProfile.objects.filter(user=self.user).exists())
        self.assertFalse(FitnessProfile.objects.filter(user=other_user).exists())

    def test_profile_requires_authentication(self):
        response = APIClient().get('/api/users/fitness-profile/')
        self.assertEqual(response.status_code, 403)


class FitnessProfileRegistrationTests(TestCase):
    def test_registration_creates_incomplete_required_profile_using_signup_age(self):
        response = APIClient().post('/api/users/register/', {
            'username': 'new-user',
            'first_name': 'New',
            'last_name': 'User',
            'age': '21',
            'password': 'password123',
            'confirm_password': 'password123',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        user = CustomUser.objects.get(username='new-user')
        self.assertEqual(user.age, 21)
        self.assertTrue(user.fitness_profile.onboarding_required)
        self.assertFalse(user.fitness_profile.onboarding_completed)

    def test_registration_rejects_invalid_age(self):
        response = APIClient().post('/api/users/register/', {
            'username': 'invalid-age-user',
            'first_name': 'Invalid',
            'last_name': 'Age',
            'age': '121',
            'password': 'password123',
            'confirm_password': 'password123',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(username='invalid-age-user').exists())

    def test_registration_rejects_decimal_age(self):
        response = APIClient().post('/api/users/register/', {
            'username': 'decimal-age-user',
            'first_name': 'Decimal',
            'last_name': 'Age',
            'age': 21.5,
            'password': 'password123',
            'confirm_password': 'password123',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(CustomUser.objects.filter(username='decimal-age-user').exists())
