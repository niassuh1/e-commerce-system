from .settings import *
SERVICE_NAME = 'auth_service'
INSTALLED_APPS = INSTALLED_APPS + ["auth_service"]

ROOT_URLCONF = 'app.urls_auth_service'

MIDDLEWARE = MIDDLEWARE