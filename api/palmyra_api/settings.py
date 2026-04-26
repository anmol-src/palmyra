from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'DW1oav-OY6m-CajIhxJ9mXufc1_RHsAu-IdpBk4iOZ6h-wyFhPyMkSGKY0wslxV-0rw'

DEBUG = False

ALLOWED_HOSTS = ['palmyra.anmol.be', 'localhost', '127.0.0.1', '45.76.29.209']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'leaderboard',
]

MIDDLEWARE = [
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'palmyra_api.urls'

WSGI_APPLICATION = 'palmyra_api.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'palmyra-rate-limit',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

USE_TZ = True
TIME_ZONE = 'UTC'
LANGUAGE_CODE = 'en-us'
