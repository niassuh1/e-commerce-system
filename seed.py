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
    - merchants  john, emily, michael  (password: password123),
      all in the default 'merchant' group
    - six stores modelled on well-known Western retailers, each with products

Store names are only used as realistic dummy data. Logos are sample logos from
untitledui.com/logos and product images are real product photos from DummyJSON
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

LOGO_BASE = "https://cdn.prod.website-files.com/6365d860c7b7a7191055eb8a"
LOGOS = {
    "boltshift": f"{LOGO_BASE}/6987f7f7eafb5b3982438a1a_Boltshift.svg",
    "capsule": f"{LOGO_BASE}/6987f7f7c4d3002b8b26bd0c_Capsule.svg",
    "calescence": f"{LOGO_BASE}/6987f7f78a397a610604d575_Calescence.svg",
    "chromatools": f"{LOGO_BASE}/6987f7f7973894450723fefe_Chromatools.svg",
    "catalog": f"{LOGO_BASE}/6987f7f7465b61765c39d712_Catalog.svg",
    "clandestine": f"{LOGO_BASE}/6987f7f99ab5c37f533b03eb_Clandestine.svg",
}


def img(path: str) -> str:
    """Product photo from DummyJSON, e.g. img('laptops/lenovo-yoga-920')."""
    return f"https://cdn.dummyjson.com/product-images/{path}/thumbnail.webp"


# products: (name, DummyJSON image path, price, quantity in stock)
MERCHANTS = {
    "john": {
        "first_name": "John",
        "last_name": "Miller",
        "email": "john@example.com",
        "stores": {
            "Best Buy": {
                "logo_url": LOGOS["boltshift"],
                "products": [
                    ("Apple MacBook Pro 14\" Space Grey", "laptops/apple-macbook-pro-14-inch-space-grey", "1999.00", 14),
                    ("Dell XPS 13 9300 Laptop", "laptops/new-dell-xps-13-9300-laptop", "1299.99", 11),
                    ("Apple iPad Mini 2021 Starlight", "tablets/ipad-mini-2021-starlight", "499.00", 25),
                    ("Samsung Galaxy Tab S8 Plus", "tablets/samsung-galaxy-tab-s8-plus-grey", "899.99", 16),
                    ("Apple iPhone 13 Pro", "smartphones/iphone-13-pro", "999.00", 19),
                    ("Apple AirPods Max Silver", "mobile-accessories/apple-airpods-max-silver", "549.00", 22),
                    ("Beats Flex Wireless Earphones", "mobile-accessories/beats-flex-wireless-earphones", "49.95", 0),  # out of stock on purpose
                ],
            },
            "Dick's Sporting Goods": {
                "logo_url": LOGOS["capsule"],
                "products": [
                    ("Spalding Basketball", "sports-accessories/basketball", "29.99", 60),
                    ("Official Football", "sports-accessories/football", "34.99", 45),
                    ("Tennis Racket", "sports-accessories/tennis-racket", "89.00", 28),
                    ("Baseball Glove", "sports-accessories/baseball-glove", "59.99", 33),
                    ("Metal Baseball Bat", "sports-accessories/metal-baseball-bat", "74.50", 21),
                    ("Volleyball", "sports-accessories/volleyball", "24.99", 40),
                    ("Golf Balls", "sports-accessories/golf-ball", "19.99", 150),
                ],
            },
        },
    },
    "emily": {
        "first_name": "Emily",
        "last_name": "Carter",
        "email": "emily@example.com",
        "stores": {
            "Whole Foods Market": {
                "logo_url": LOGOS["calescence"],
                "products": [
                    ("Organic Whole Milk", "groceries/milk", "4.99", 80),
                    ("Free-Range Eggs", "groceries/eggs", "5.49", 120),
                    ("Fresh Fish Steak", "groceries/fish-steak", "14.99", 25),
                    ("Organic Honey Jar", "groceries/honey-jar", "8.99", 70),
                    ("Strawberries", "groceries/strawberry", "3.99", 90),
                    ("Nescafe Coffee", "groceries/nescafe-coffee", "9.99", 55),
                    ("Fresh Juice", "groceries/juice", "3.49", 100),
                ],
            },
            "Sephora": {
                "logo_url": LOGOS["chromatools"],
                "products": [
                    ("Essence Mascara Lash Princess", "beauty/essence-mascara-lash-princess", "9.99", 85),
                    ("Eyeshadow Palette with Mirror", "beauty/eyeshadow-palette-with-mirror", "24.99", 40),
                    ("Red Lipstick", "beauty/red-lipstick", "19.99", 75),
                    ("Calvin Klein CK One", "fragrances/calvin-klein-ck-one", "59.99", 30),
                    ("Chanel Coco Noir Eau de Parfum", "fragrances/chanel-coco-noir-eau-de", "129.99", 12),
                    ("Dior J'adore", "fragrances/dior-j'adore", "119.00", 0),  # out of stock on purpose
                ],
            },
        },
    },
    "michael": {
        "first_name": "Michael",
        "last_name": "Thompson",
        "email": "michael@example.com",
        "stores": {
            "IKEA": {
                "logo_url": LOGOS["catalog"],
                "products": [
                    ("Bedside Table (African Cherry)", "furniture/bedside-table-african-cherry", "79.00", 18),
                    ("Executive Conference Chair", "furniture/knoll-saarinen-executive-conference-chair", "249.00", 9),
                    ("Table Lamp", "home-decoration/table-lamp", "24.99", 64),
                    ("Plant Pot", "home-decoration/plant-pot", "12.99", 90),
                    ("Family Tree Photo Frame", "home-decoration/family-tree-photo-frame", "17.99", 52),
                    ("Spice Rack", "kitchen-accessories/spice-rack", "21.50", 38),
                ],
            },
            "Foot Locker": {
                "logo_url": LOGOS["clandestine"],
                "products": [
                    ("Nike Air Jordan 1 Red and Black", "mens-shoes/nike-air-jordan-1-red-and-black", "179.99", 30),
                    ("Nike Baseball Cleats", "mens-shoes/nike-baseball-cleats", "89.99", 22),
                    ("Puma Future Rider Trainers", "mens-shoes/puma-future-rider-trainers", "84.99", 26),
                    ("Sports Sneakers Off White Red", "mens-shoes/sports-sneakers-off-white-red", "99.00", 0),  # out of stock on purpose
                    ("Men's Check Shirt", "mens-shirts/men-check-shirt", "34.99", 48),
                    ("Men's Plaid Shirt", "mens-shirts/man-plaid-shirt", "39.99", 35),
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
