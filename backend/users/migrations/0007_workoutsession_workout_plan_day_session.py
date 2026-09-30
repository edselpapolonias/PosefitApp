from django.db import migrations, models
import django.db.models.deletion


def mark_existing_completed_plans(apps, schema_editor):
    UserWorkoutPlan = apps.get_model('users', 'UserWorkoutPlan')
    definitions = {
        'beginner-full-body': ('week-', ('monday', 'wednesday', 'friday')),
        'lower-body-focus': ('lower-body-week-', ('tuesday', 'thursday', 'saturday')),
        'core-upper-body': ('core-upper-week-', ('monday', 'wednesday', 'friday')),
    }
    for plan in UserWorkoutPlan.objects.filter(completed_at__isnull=False):
        definition = definitions.get(plan.plan_id)
        if not definition:
            continue
        prefix, days = definition
        expected = {f'{prefix}{week}-{day}' for week in range(1, 5) for day in days}
        if (set(plan.completed_workout_ids or []) & expected) == expected:
            plan.status = 'completed'
            plan.save(update_fields=['status'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_allow_multiple_active_workout_plans'),
    ]

    operations = [
        migrations.AddField(
            model_name='workoutsession',
            name='workout_plan_day_session',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='workout_sessions',
                to='users.workoutplandaysession',
            ),
        ),
        migrations.RunPython(mark_existing_completed_plans, migrations.RunPython.noop),
    ]
