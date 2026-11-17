from .settings import *

SERVICE_NAME = 'order_service'
INSTALLED_APPS = INSTALLED_APPS + ["product_service"] + ['store_service'] + ['cart_service'] + ['order_service']

ROOT_URLCONF = 'app.urls_order_service'

MIDDLEWARE = MIDDLEWARE + ['store_service.middleware.StoreMiddleware']
