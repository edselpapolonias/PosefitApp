from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login_view),
    path('logout/', views.logout_view),
    path('exercise-coach-feedback/', views.exercise_coach_feedback),
    path('squat-coach-feedback/', views.squat_coach_feedback),
]
