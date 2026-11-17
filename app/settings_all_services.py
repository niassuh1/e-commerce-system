"""Settings with every service app installed.

Used for project-wide commands (migrate, makemigrations, ...) since all services share one database.
"""
from .settings import *

SERVICE_NAME = 'all_services'
INSTALLED_APPS = INSTALLED_APPS + [
    'auth_service',
    'store_service',
    'product_service',
    'cart_service',
    'order_service',
]
