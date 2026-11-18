from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0009_fitnessprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='fitnessprofile',
            name='workout_focus',
            field=models.CharField(
                blank=True,
                choices=[
                    ('full_body', 'General fitness / Full body'),
                    ('lower_body', 'Lower body / Legs and glutes'),
                    ('core_upper_body', 'Core and upper body'),
                ],
                default='',
                max_length=20,
            ),
        ),
    ]
