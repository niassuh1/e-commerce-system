from .settings import *

SERVICE_NAME = 'cart_service'
INSTALLED_APPS = INSTALLED_APPS + ["product_service"] + ['store_service']

ROOT_URLCONF = 'app.urls_cart_service'

MIDDLEWARE = MIDDLEWARE + ['cart_service.middleware.CartMiddleware']