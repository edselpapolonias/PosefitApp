from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('users', '0008_workoutsession_accuracy_nullable'),
    ]

    operations = [
        migrations.CreateModel(
            name='FitnessProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fitness_level', models.CharField(blank=True, choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')], default='', max_length=20)),
                ('exercise_experience', models.CharField(blank=True, choices=[('less_than_6_months', 'Less than 6 months'), ('6_to_12_months', '6-12 months'), ('1_to_2_years', '1-2 years'), ('more_than_2_years', 'More than 2 years')], default='', max_length=24)),
                ('physical_limitations', models.CharField(blank=True, choices=[('yes', 'Yes'), ('no', 'No'), ('prefer_not_to_say', 'Prefer not to say')], default='', max_length=24)),
                ('affected_areas', models.JSONField(blank=True, default=list)),
                ('onboarding_completed', models.BooleanField(default=False)),
                ('onboarding_required', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='fitness_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
