from django.urls import path
from . import views
from .workout_plan_views import (
    active_workout_plan,
    complete_workout_day_set,
    end_workout_plan,
    finish_workout_day_session,
    start_workout_day_session,
)

urlpatterns = [
    path('workout-plans/active/', active_workout_plan),
    path('workout-plans/end/', end_workout_plan),
    path('workout-plans/day-sessions/start/', start_workout_day_session),
    path('workout-plans/day-sessions/set-complete/', complete_workout_day_set),
    path('workout-plans/day-sessions/finish/', finish_workout_day_session),
    path('dashboard/', views.dashboard),
    path('history/', views.history),
    path('history/plans/<int:instance_id>/', views.history_plan),
    path('history/sessions/<str:session_id>/', views.history_session),
    path('register/', views.register),
    path('login/', views.login_view),
    path('logout/', views.logout_view),
    path('csrf/', views.csrf_token),
    path('sessions/complete/', views.complete_workout_session),
    path('exercise-coach-feedback/', views.exercise_coach_feedback),
    path('squat-coach-feedback/', views.squat_coach_feedback),
]
