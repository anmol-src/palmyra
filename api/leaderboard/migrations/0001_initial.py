from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Score',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('callsign', models.CharField(max_length=20)),
                ('score', models.PositiveIntegerField()),
                ('level', models.PositiveIntegerField()),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-score'],
            },
        ),
        migrations.AddIndex(
            model_name='score',
            index=models.Index(fields=['-score'], name='leaderboard_score_desc_idx'),
        ),
    ]
