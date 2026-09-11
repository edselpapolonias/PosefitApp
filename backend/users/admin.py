from django.contrib import admin
from .models import WorkoutPlanDaySession, WorkoutSession


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'exercise_name', 'status', 'accuracy', 'completed_at')
    list_filter = ('exercise', 'status', 'metric_type')
    search_fields = ('session_id', 'user__username', 'exercise_name')


@admin.register(WorkoutPlanDaySession)
class WorkoutPlanDaySessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'workout_id', 'status', 'updated_at')
    list_filter = ('status', 'week')
    search_fields = ('session_id', 'user__username', 'workout_id')
