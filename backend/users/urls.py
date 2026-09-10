from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard),
    path('register/', views.register),
    path('login/', views.login_view),
    path('logout/', views.logout_view),
    path('csrf/', views.csrf_token),
    path('sessions/complete/', views.complete_workout_session),
    path('exercise-coach-feedback/', views.exercise_coach_feedback),
    path('squat-coach-feedback/', views.squat_coach_feedback),
]
