from .settings import *
SERVICE_NAME = 'user_service'
INSTALLED_APPS = INSTALLED_APPS + ["user_service"]

ROOT_URLCONF = 'app.urls_user_service'

MIDDLEWARE = MIDDLEWARE