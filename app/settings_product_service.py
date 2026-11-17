from .settings import *
SERVICE_NAME = 'product_service'
INSTALLED_APPS = INSTALLED_APPS + ["product_service"] + ['store_service']

ROOT_URLCONF = 'app.urls_product_service'

REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = ["product_service.permissions.HasStore"]

MIDDLEWARE = MIDDLEWARE + ['product_service.middleware.StoreMiddleware']
