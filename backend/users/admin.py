from django.contrib import admin
from .models import WorkoutSession


@admin.register(WorkoutSession)
class WorkoutSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'exercise_name', 'status', 'accuracy', 'completed_at')
    list_filter = ('exercise', 'status', 'metric_type')
    search_fields = ('session_id', 'user__username', 'exercise_name')
