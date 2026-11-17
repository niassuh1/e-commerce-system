from .settings import *
SERVICE_NAME = 'store_service'
INSTALLED_APPS = INSTALLED_APPS + ["store_service"]

ROOT_URLCONF = 'app.urls_store_service'

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["store_service.permissions.HasStore"],
}

MIDDLEWARE = MIDDLEWARE + ['store_service.middleware.StoreMiddleware']

