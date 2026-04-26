from django.urls import path

from . import views

urlpatterns = [
    path('score/', views.submit_score),
    path('leaderboard/', views.get_leaderboard),
]
