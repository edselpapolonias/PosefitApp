from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_workoutplandaysession'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='userworkoutplan',
            name='one_active_plan_per_user',
        ),
        migrations.AddConstraint(
            model_name='userworkoutplan',
            constraint=models.UniqueConstraint(
                condition=models.Q(status='active'),
                fields=('user', 'plan_id'),
                name='one_active_instance_per_user_plan',
            ),
        ),
    ]
