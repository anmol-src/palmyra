from django.db import models


class Score(models.Model):
    callsign = models.CharField(max_length=20)
    score = models.PositiveIntegerField()
    level = models.PositiveIntegerField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score']
        indexes = [models.Index(fields=['-score'])]

    def __str__(self):
        return f'{self.callsign}: {self.score} (L{self.level})'
