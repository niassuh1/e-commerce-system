#!/usr/bin/env python
"""
Fill the database with dummy data for local development.

Usage (from the project root, with Postgres running):
    python seed.py

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

# product_service settings install auth, store_service and product_service,
# which is everything this script needs.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings_product_service")

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
    "layers": f"{LOGO_BASE}/6987f806523996bf16ec8dff_Layers.svg",
    "lightspeed": f"{LOGO_BASE}/6987f808a412a0902b3803eb_Lightspeed.svg",
    "luminary": f"{LOGO_BASE}/6987f8089d40df4648ec1a81_Luminary.svg",
    "magnolia": f"{LOGO_BASE}/6987f809973894450723ffa1_Magnolia.svg",
    "catalog": f"{LOGO_BASE}/6987f7f7465b61765c39d70c_Catalog.svg",
    "capsule": f"{LOGO_BASE}/6987f7f7c4d3002b8b26bd03_Capsule.svg",
}


def img(path: str) -> str:
    """Product photo from DummyJSON, e.g. img('laptops/lenovo-yoga-920')."""
    return f"https://cdn.dummyjson.com/product-images/{path}/thumbnail.webp"


# products: (name, DummyJSON image path, quantity in stock)
MERCHANTS = {
    "john": {
        "first_name": "John",
        "last_name": "Miller",
        "email": "john@example.com",
        "stores": {
            "Best Buy": {
                "logo_url": LOGOS["lightspeed"],
                "products": [
                    ("Apple MacBook Pro 14\" Space Grey", "laptops/apple-macbook-pro-14-inch-space-grey", 14),
                    ("Dell XPS 13 9300 Laptop", "laptops/new-dell-xps-13-9300-laptop", 11),
                    ("Apple iPad Mini 2021 Starlight", "tablets/ipad-mini-2021-starlight", 25),
                    ("Samsung Galaxy Tab S8 Plus", "tablets/samsung-galaxy-tab-s8-plus-grey", 16),
                    ("Apple iPhone 13 Pro", "smartphones/iphone-13-pro", 19),
                    ("Apple AirPods Max Silver", "mobile-accessories/apple-airpods-max-silver", 22),
                    ("Beats Flex Wireless Earphones", "mobile-accessories/beats-flex-wireless-earphones", 0),  # out of stock on purpose
                ],
            },
            "Dick's Sporting Goods": {
                "logo_url": LOGOS["magnolia"],
                "products": [
                    ("Spalding Basketball", "sports-accessories/basketball", 60),
                    ("Official Football", "sports-accessories/football", 45),
                    ("Tennis Racket", "sports-accessories/tennis-racket", 28),
                    ("Baseball Glove", "sports-accessories/baseball-glove", 33),
                    ("Metal Baseball Bat", "sports-accessories/metal-baseball-bat", 21),
                    ("Volleyball", "sports-accessories/volleyball", 40),
                    ("Golf Balls", "sports-accessories/golf-ball", 150),
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
                "logo_url": LOGOS["layers"],
                "products": [
                    ("Organic Whole Milk", "groceries/milk", 80),
                    ("Free-Range Eggs", "groceries/eggs", 120),
                    ("Fresh Fish Steak", "groceries/fish-steak", 25),
                    ("Organic Honey Jar", "groceries/honey-jar", 70),
                    ("Strawberries", "groceries/strawberry", 90),
                    ("Nescafe Coffee", "groceries/nescafe-coffee", 55),
                    ("Fresh Juice", "groceries/juice", 100),
                ],
            },
            "Sephora": {
                "logo_url": LOGOS["catalog"],
                "products": [
                    ("Essence Mascara Lash Princess", "beauty/essence-mascara-lash-princess", 85),
                    ("Eyeshadow Palette with Mirror", "beauty/eyeshadow-palette-with-mirror", 40),
                    ("Red Lipstick", "beauty/red-lipstick", 75),
                    ("Calvin Klein CK One", "fragrances/calvin-klein-ck-one", 30),
                    ("Chanel Coco Noir Eau de Parfum", "fragrances/chanel-coco-noir-eau-de", 12),
                    ("Dior J'adore", "fragrances/dior-j'adore", 0),  # out of stock on purpose
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
                "logo_url": LOGOS["luminary"],
                "products": [
                    ("Bedside Table (African Cherry)", "furniture/bedside-table-african-cherry", 18),
                    ("Executive Conference Chair", "furniture/knoll-saarinen-executive-conference-chair", 9),
                    ("Table Lamp", "home-decoration/table-lamp", 64),
                    ("Plant Pot", "home-decoration/plant-pot", 90),
                    ("Family Tree Photo Frame", "home-decoration/family-tree-photo-frame", 52),
                    ("Spice Rack", "kitchen-accessories/spice-rack", 38),
                ],
            },
            "Foot Locker": {
                "logo_url": LOGOS["capsule"],
                "products": [
                    ("Nike Air Jordan 1 Red and Black", "mens-shoes/nike-air-jordan-1-red-and-black", 30),
                    ("Nike Baseball Cleats", "mens-shoes/nike-baseball-cleats", 22),
                    ("Puma Future Rider Trainers", "mens-shoes/puma-future-rider-trainers", 26),
                    ("Sports Sneakers Off White Red", "mens-shoes/sports-sneakers-off-white-red", 0),  # out of stock on purpose
                    ("Men's Check Shirt", "mens-shirts/men-check-shirt", 48),
                    ("Men's Plaid Shirt", "mens-shirts/man-plaid-shirt", 35),
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
        for name, image_path, quantity in store_data["products"]:
            Product.objects.update_or_create(
                store=store,
                name=name,
                defaults={"image_url": img(image_path), "quantity": quantity},
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
