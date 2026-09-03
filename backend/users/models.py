from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    age = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self):
        return self.username


class WorkoutSession(models.Model):
    METRIC_REPS = 'reps'
    METRIC_TIME = 'time'
    METRIC_TYPE_CHOICES = [
        (METRIC_REPS, 'Repetitions'),
        (METRIC_TIME, 'Time'),
    ]

    STATUS_COMPLETED = 'completed'
    STATUS_ENDED = 'ended'
    STATUS_CHOICES = [
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ENDED, 'Ended'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='workout_sessions',
    )
    session_id = models.CharField(max_length=120)
    exercise = models.CharField(max_length=50)
    exercise_name = models.CharField(max_length=80)
    metric_type = models.CharField(max_length=10, choices=METRIC_TYPE_CHOICES, default=METRIC_REPS)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_ENDED)
    completed_at = models.DateTimeField()
    duration = models.PositiveIntegerField(default=0)
    sets_completed = models.PositiveIntegerField(default=0)
    accuracy = models.PositiveSmallIntegerField(default=0)
    correct_reps = models.PositiveIntegerField(null=True, blank=True)
    incorrect_reps = models.PositiveIntegerField(null=True, blank=True)
    total_reps = models.PositiveIntegerField(null=True, blank=True)
    total_hold_time = models.PositiveIntegerField(null=True, blank=True)
    form_issues = models.JSONField(default=list, blank=True)
    set_results = models.JSONField(default=list, blank=True)
    configuration = models.JSONField(default=dict, blank=True)
    analysis = models.JSONField(default=dict, blank=True)
    feedback = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'session_id'],
                name='unique_workout_session_per_user',
            ),
            models.CheckConstraint(
                condition=models.Q(accuracy__gte=0, accuracy__lte=100),
                name='workout_session_accuracy_between_0_and_100',
            ),
        ]
        indexes = [
            models.Index(
                fields=['user', 'exercise', 'status', '-completed_at'],
                name='session_previous_lookup_idx',
            ),
        ]
        ordering = ['-completed_at', '-id']

    def __str__(self):
        return f'{self.user.username} - {self.exercise_name} - {self.completed_at:%Y-%m-%d}'
