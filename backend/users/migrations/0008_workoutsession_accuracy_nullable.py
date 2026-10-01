from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0007_workoutsession_workout_plan_day_session'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workoutsession',
            name='accuracy',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
