#!/usr/bin/env python
"""
Fill the database with dummy data for local development.

Usage (from the project root, with Postgres running):
    python seed.py                                 # on your machine; also works while the stack runs in Docker
    docker compose exec store python seed.py       # inside a container
    bash scripts/docker.sh seed                    # same, via the helper script

Where it connects:
    - inside a container: the settings from .env (Docker hostnames: db, redis, rabbitmq)
    - on your machine: .env.local, i.e. localhost and the ports Docker publishes
    Variables already set in your shell win in both cases. Both modes write to the same Postgres.

Safe to run more than once: existing rows are updated instead of duplicated.

Creates:
    - superuser  admin / admin   (password validators are bypassed on purpose)
    - merchants  ahmed, fatimah, khalid, noura  (password: password123),
      all in the default 'merchant' group
    - eight stores named after well-known Western brands (Apple, Samsung, Sephora,
      ASOS, Adidas, Foot Locker, IKEA, NEXT), each with matching products

Store names are only used as realistic dummy data. Logos are hotlinked brand icons
and product images are real product photos from DummyJSON
(https://dummyjson.com/products).

LOCAL DEVELOPMENT ONLY. Never run this against a real environment.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

# Docker service name -> where the same service is reachable from the host machine
DOCKER_HOSTS = {"POSTGRES_HOST": "db", "REDIS_HOST": "redis", "RABBITMQ_HOST": "rabbitmq"}
PUBLISHED_PORTS = {
    "POSTGRES_PORT": ("POSTGRES_HOST_PORT", "5432"),
    "REDIS_PORT": ("REDIS_HOST_PORT", "16379"),
    "RABBITMQ_PORT": ("RABBITMQ_HOST_PORT", "5672"),
}


def running_in_container() -> bool:
    return Path("/.dockerenv").exists() or Path("/run/.containerenv").exists()


def configure_environment() -> None:
    """Point the script at the right services, whether it runs on the host or inside a container."""
    if running_in_container():
        return  # the container already got .env (Docker hostnames and in-network ports)

    # On the host the Docker hostnames don't resolve: use .env.local (localhost + published ports).
    # load_dotenv never overrides variables that are already set, so an exported value always wins.
    load_dotenv(BASE_DIR / ".env.local")
    load_dotenv(BASE_DIR / ".env")  # fills in anything .env.local doesn't define

    for name, docker_host in DOCKER_HOSTS.items():
        if os.environ.get(name, docker_host) == docker_host:
            os.environ[name] = "localhost"
    for name, (published, default) in PUBLISHED_PORTS.items():
        os.environ[name] = os.environ.get(published, default)


configure_environment()

# All service apps installed, so a fresh database gets every table, not only the ones seeded here
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings_all_services")

import django

django.setup()

from django.contrib.auth.models import User
from django.core.management import call_command

from auth_service.permissions import grant_default_permissions
from product_service.models import Product
from store_service.models import Store

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"
MERCHANT_PASSWORD = "password123"

def favicon(domain: str) -> str:
    """The site's own icon, via Google's favicon service."""
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=256"


# Brand icons only (no wordmark) wherever the brand has one.
# IKEA and NEXT have no text-free mark, so their site icon is the wordmark itself.
LOGOS = {
    "apple": "https://cdn.simpleicons.org/apple/000000",
    "samsung": "https://resources.samsung.com/etc.clientlibs/samsung/clientlibs/consumer/global/clientlib-common/resources/images/app_ico.png",
    "sephora": "https://www.sephora.com/img/ufe/favicon.ico",
    "asos": favicon("asos.com"),
    "adidas": "https://cdn.simpleicons.org/adidas/000000",
    "footlocker": favicon("footlocker.com"),
    "ikea": favicon("ikea.com"),
    "next": favicon("next.co.uk"),
}


def img(path: str) -> str:
    """Product photo from DummyJSON, e.g. img('laptops/lenovo-yoga-920')."""
    return f"https://cdn.dummyjson.com/product-images/{path}/thumbnail.webp"


# products: (name, DummyJSON image path, price, quantity in stock)
MERCHANTS = {
    "ahmed": {
        "first_name": "Ahmed",
        "last_name": "Al-Qahtani",
        "email": "ahmed@example.com",
        "stores": {
            "Apple": {
                "logo_url": LOGOS["apple"],
                "products": [
                    ("iPhone 13 Pro", "smartphones/iphone-13-pro", "999.00", 19),
                    ("iPhone X", "smartphones/iphone-x", "699.00", 12),
                    ("MacBook Pro 14\" Space Grey", "laptops/apple-macbook-pro-14-inch-space-grey", "1999.00", 14),
                    ("iPad mini 2021 Starlight", "tablets/ipad-mini-2021-starlight", "499.00", 25),
                    ("Apple Watch Series 4 Gold", "mobile-accessories/apple-watch-series-4-gold", "399.00", 17),
                    ("AirPods", "mobile-accessories/apple-airpods", "129.00", 40),
                    ("AirPods Max Silver", "mobile-accessories/apple-airpods-max-silver", "549.00", 22),
                    ("HomePod mini Cosmic Grey", "mobile-accessories/apple-homepod-mini-cosmic-grey", "99.00", 30),
                    ("MagSafe Battery Pack", "mobile-accessories/apple-magsafe-battery-pack", "99.00", 0),  # out of stock on purpose
                    ("iPhone 12 Silicone Case with MagSafe Plum", "mobile-accessories/iphone-12-silicone-case-with-magsafe-plum", "49.00", 60),
                ],
            },
            "Samsung": {
                "logo_url": LOGOS["samsung"],
                "products": [
                    ("Galaxy S10", "smartphones/samsung-galaxy-s10", "749.99", 18),
                    ("Galaxy S8", "smartphones/samsung-galaxy-s8", "499.99", 10),
                    ("Galaxy S7", "smartphones/samsung-galaxy-s7", "299.99", 0),  # out of stock on purpose
                    ("Galaxy Tab S8+ Grey", "tablets/samsung-galaxy-tab-s8-plus-grey", "899.99", 16),
                    ("Galaxy Tab White", "tablets/samsung-galaxy-tab-white", "349.99", 24),
                ],
            },
        },
    },
    "fatimah": {
        "first_name": "Fatimah",
        "last_name": "Al-Harbi",
        "email": "fatimah@example.com",
        "stores": {
            "Sephora": {
                "logo_url": LOGOS["sephora"],
                "products": [
                    ("Essence Lash Princess Mascara", "beauty/essence-mascara-lash-princess", "9.99", 85),
                    ("Eyeshadow Palette with Mirror", "beauty/eyeshadow-palette-with-mirror", "24.99", 40),
                    ("Velvet Touch Powder Canister", "beauty/powder-canister", "18.00", 55),
                    ("Red Lipstick", "beauty/red-lipstick", "19.99", 75),
                    ("Red Nail Polish", "beauty/red-nail-polish", "12.00", 90),
                    ("Calvin Klein CK One", "fragrances/calvin-klein-ck-one", "59.99", 30),
                    ("Chanel Coco Noir Eau de Parfum", "fragrances/chanel-coco-noir-eau-de", "129.99", 12),
                    ("Dior J'adore", "fragrances/dior-j'adore", "119.00", 0),  # out of stock on purpose
                    ("Gucci Bloom Eau de Parfum", "fragrances/gucci-bloom-eau-de", "112.00", 20),
                    ("Olay Ultra Moisture Body Wash", "skin-care/olay-ultra-moisture-shea-butter-body-wash", "11.99", 65),
                ],
            },
            "ASOS": {
                "logo_url": LOGOS["asos"],
                "products": [
                    ("Black Women's Gown", "womens-dresses/black-women's-gown", "89.00", 15),
                    ("Corset with Black Skirt", "womens-dresses/corset-with-black-skirt", "64.00", 22),
                    ("Tartan Dress", "tops/tartan-dress", "42.00", 30),
                    ("Blue Women's Handbag", "womens-bags/blue-women's-handbag", "38.00", 27),
                    ("White Faux Leather Backpack", "womens-bags/white-faux-leather-backpack", "45.00", 0),  # out of stock on purpose
                    ("Classic Sunglasses", "sunglasses/classic-sun-glasses", "22.00", 70),
                    ("Green Crystal Earrings", "womens-jewellery/green-crystal-earring", "16.00", 48),
                ],
            },
        },
    },
    "khalid": {
        "first_name": "Khalid",
        "last_name": "Al-Otaibi",
        "email": "khalid@example.com",
        "stores": {
            "Adidas": {
                "logo_url": LOGOS["adidas"],
                "products": [
                    ("Match Football", "sports-accessories/football", "34.99", 45),
                    ("Basketball", "sports-accessories/basketball", "29.99", 60),
                    ("Volleyball", "sports-accessories/volleyball", "24.99", 40),
                    ("Tennis Racket", "sports-accessories/tennis-racket", "89.00", 28),
                    ("Tennis Balls", "sports-accessories/tennis-ball", "9.99", 120),
                    ("Cricket Bat", "sports-accessories/cricket-bat", "79.00", 0),  # out of stock on purpose
                ],
            },
            "Foot Locker": {
                "logo_url": LOGOS["footlocker"],
                "products": [
                    ("Nike Air Jordan 1 Red and Black", "mens-shoes/nike-air-jordan-1-red-and-black", "179.99", 30),
                    ("Nike Baseball Cleats", "mens-shoes/nike-baseball-cleats", "89.99", 22),
                    ("Puma Future Rider Trainers", "mens-shoes/puma-future-rider-trainers", "84.99", 26),
                    ("Off-White Sports Sneakers Red", "mens-shoes/sports-sneakers-off-white-red", "99.00", 0),  # out of stock on purpose
                    ("Calvin Klein Heel Shoes", "womens-shoes/calvin-klein-heel-shoes", "119.00", 14),
                    ("Red Shoes", "womens-shoes/red-shoes", "69.99", 33),
                ],
            },
        },
    },
    "noura": {
        "first_name": "Noura",
        "last_name": "Al-Shehri",
        "email": "noura@example.com",
        "stores": {
            "IKEA": {
                "logo_url": LOGOS["ikea"],
                "products": [
                    ("Bedside Table (African Cherry)", "furniture/bedside-table-african-cherry", "79.00", 18),
                    ("Wooden Bathroom Sink with Mirror", "furniture/wooden-bathroom-sink-with-mirror", "349.00", 6),
                    ("Table Lamp", "home-decoration/table-lamp", "24.99", 64),
                    ("Plant Pot", "home-decoration/plant-pot", "12.99", 90),
                    ("Family Tree Photo Frame", "home-decoration/family-tree-photo-frame", "17.99", 52),
                    ("Spice Rack", "kitchen-accessories/spice-rack", "21.50", 38),
                    ("Chopping Board", "kitchen-accessories/chopping-board", "9.99", 0),  # out of stock on purpose
                    ("Mug Tree Stand", "kitchen-accessories/mug-tree-stand", "14.99", 45),
                ],
            },
            "NEXT": {
                "logo_url": LOGOS["next"],
                "products": [
                    ("Men's Check Shirt", "mens-shirts/men-check-shirt", "34.99", 48),
                    ("Men's Plaid Shirt", "mens-shirts/man-plaid-shirt", "39.99", 35),
                    ("Men's Short Sleeve Shirt", "mens-shirts/man-short-sleeve-shirt", "29.99", 52),
                    ("Girls' Summer Dress", "tops/girl-summer-dress", "27.00", 40),
                    ("Gray Dress", "tops/gray-dress", "45.00", 0),  # out of stock on purpose
                    ("Black & Brown Slippers", "womens-shoes/black-&-brown-slipper", "19.99", 75),
                ],
            },
        },
    },
}


def create_admin() -> None:
    admin, created = User.objects.get_or_create(
        username=ADMIN_USERNAME,
        defaults={"email": "admin@example.com", "is_staff": True, "is_superuser": True},
    )
    # set_password / create_superuser do not run AUTH_PASSWORD_VALIDATORS,
    # so a weak password like "admin" is accepted here.
    admin.is_staff = True
    admin.is_superuser = True
    admin.set_password(ADMIN_PASSWORD)
    admin.save()
    print(f"{'Created' if created else 'Updated'} superuser '{ADMIN_USERNAME}'")


def create_merchant(username: str, data: dict) -> User:
    user, created = User.objects.get_or_create(
        username=username,
        defaults={k: data[k] for k in ("first_name", "last_name", "email")},
    )
    user.set_password(MERCHANT_PASSWORD)
    user.save()
    grant_default_permissions(user)
    print(f"{'Created' if created else 'Updated'} merchant '{username}'")
    return user


def create_stores(owner: User, stores: dict) -> None:
    for store_name, store_data in stores.items():
        store, _ = Store.objects.update_or_create(
            name=store_name,
            owner_user=owner,
            defaults={"logo_url": store_data["logo_url"]},
        )
        for name, image_path, price, quantity in store_data["products"]:
            Product.objects.update_or_create(
                store=store,
                name=name,
                defaults={"image_url": img(image_path), "price": price, "quantity": quantity},
            )
        print(f"  store '{store_name}' ({store.id}) with {len(store_data['products'])} products")


def main() -> None:
    # Make sure tables and permissions (add_store / add_product) exist
    call_command("migrate", interactive=False, verbosity=0)

    create_admin()
    for username, data in MERCHANTS.items():
        owner = create_merchant(username, data)
        create_stores(owner, data["stores"])

    print("\nDone.")
    print(f"  admin     {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
    print(f"  merchants {', '.join(MERCHANTS)} / {MERCHANT_PASSWORD}")


if __name__ == "__main__":
    main()
