# E Commerce Backend

A small e-commerce backend built with Django and Django REST Framework, split into services:

| Service | Port | Base path | What it does |
|---|---|---|---|
| store | 8000 | `/api/store/v1/` | Stores and their owners |
| auth | 8001 | `/api/auth/v1/` | Registration, JWT tokens, current user |
| product | 8002 | `/api/product/v1/` | Products per store. Its event consumer updates stock |
| cart | 8003 | `/api/cart/v1/` | Shopping cart, stored in Redis |
| order | 8004 | `/api/order/v1/` | Checkout and orders. Publishes `order.created` |

All services share one PostgreSQL database and one Django project. Each service has its own settings module (`app/settings_<name>_service.py`) and URL config (`app/urls_<name>_service.py`).

Infrastructure:

| Compose service | Host port | Port inside Docker | Used for |
|---|---|---|---|
| `db` (PostgreSQL 18) | 5432 | 5432 | Database |
| `redis` | 16379 | 6379 | Carts |
| `rabbitmq` | 5672 (AMQP), 15672 (management UI) | 5672 | Events between services |

There are two ways to run the project:

- **[Option A: everything in Docker](#option-a-run-everything-with-docker-recommended)** (recommended). Only Docker is needed.
- **[Option B: services on your machine](#option-b-run-the-services-on-your-machine)**, with only the infrastructure in Docker. Best while developing (auto-reload).

---

## Configuration (`.env`)

Both options start with:

```bash
cp .env.example .env
```

Django, `runserver.py` and `docker-compose.yml` all read this file. The defaults are for **Option A**: hosts are the Docker Compose service names (`db`, `redis`, `rabbitmq`), which resolve inside the `ecommerce_network` network.

| Variable | Default | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | `django-insecure-change-me` | Change it outside local development |
| `DJANGO_DEBUG` | `True` | |
| `DJANGO_ALLOWED_HOSTS` | *(empty)* | Comma-separated |
| `SERVICE_HOST` | `0.0.0.0` | Interface the services bind to |
| `STORE_SERVICE_PORT` … `ORDER_SERVICE_PORT` | `8000` … `8004` | Service ports, also published on your machine |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `postgres` / `postgres` / `password` | |
| `POSTGRES_HOST` / `POSTGRES_PORT` | `db` / `5432` | Where the app connects |
| `POSTGRES_HOST_PORT` | `5432` | Port published on your machine |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | Where the app connects |
| `REDIS_HOST_PORT` | `16379` | Port published on your machine (avoids a local Redis on 6379) |
| `RABBITMQ_HOST` / `RABBITMQ_PORT` | `rabbitmq` / `5672` | Where the app connects |
| `RABBITMQ_HOST_PORT` / `RABBITMQ_MANAGEMENT_PORT` | `5672` / `15672` | Ports published on your machine |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | `admin` / `secretpassword` | |
| `EVENTS_EXCHANGE` | `events` | RabbitMQ topic exchange for all events |

> PostgreSQL and RabbitMQ only apply the user and password the **first** time their data volume is created (`./volumes/`). To change them later, update `.env` and delete the matching folder in `./volumes/`. This erases that data.

---

## Option A: Run everything with Docker (recommended)

**Prerequisite:** Docker with Docker Compose v2.

### 1. Configure

```bash
cp .env.example .env
```

The defaults work as-is.

### 2. Build and start

```bash
docker compose up -d --build
```

This builds one image (`ecommerce-app`, from the `Dockerfile`) and starts, on the `ecommerce_network` network:

1. `db`, `redis` and `rabbitmq`. The app waits until all three report healthy.
2. `migrate`, a one-off container that runs `python runserver.py migrate` and exits.
3. `store`, `auth`, `product`, `cart` and `order`, on ports 8000 to 8004.
4. `product-consumer`, which consumes `order.created` and updates stock.

Check that everything is up:

```bash
docker compose ps
```

`migrate` should show `Exited (0)`. Everything else should be `running` or `healthy`.

### 3. (Optional) Load dummy data

```bash
docker compose exec store python seed.py
```

See [Dummy data](#dummy-data).

### Useful commands

```bash
docker compose logs -f                      # all logs
docker compose logs -f order product-consumer
docker compose exec order python manage.py shell --settings=app.settings_order_service
docker compose run --rm migrate             # run migrations again
docker compose up -d --build                # rebuild after code changes
docker compose down                         # stop (data in ./volumes is kept)
```

The services run with `--noreload`, so code changes need a rebuild (`docker compose up -d --build`).

---

## Option B: Run the services on your machine

**Prerequisites:** Python 3.13+ (developed on 3.15) and Docker with Docker Compose v2.

### 1. Install dependencies

```bash
python -m venv .venv

# Windows (PowerShell)
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure for localhost

```bash
cp .env.example .env
```

Then, in `.env`, point the app at the ports Docker publishes on your machine:

```dotenv
SERVICE_HOST=127.0.0.1
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
REDIS_HOST=127.0.0.1
REDIS_PORT=16379
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
```

### 3. Start only the infrastructure

```bash
docker compose up -d db redis rabbitmq
```

Wait until all three are healthy (`docker compose ps`).

### 4. Create the database tables

```bash
python runserver.py migrate
```

All services share one database, so this runs once with every app installed. `makemigrations`, `showmigrations` and `createsuperuser` work the same way.

### 5. (Optional) Load dummy data

```bash
python seed.py
```

### 6. Run

```bash
python runserver.py all
```

This starts all five services, plus the product service's event consumer (`consume_events`), with colored, prefixed output. Press `Ctrl+C` to stop everything.

Other ways to run:

```bash
python runserver.py                        # interactive menu
python runserver.py product                # one service (and its consumer)
python runserver.py store auth             # several services
python runserver.py product consume_events # only the consumer
python runserver.py <service> <command>    # any manage.py command, e.g. "order shell"
python runserver.py --list                 # services and ports
```

> The consumer does not auto-reload. Restart it after changing an event handler.

---

## Dummy data

`seed.py` creates:

- **Superuser:** `admin` / `admin`
- **Merchants:** `john`, `emily`, `michael`, all with password `password123`
- **Six stores** (Best Buy, Dick's Sporting Goods, Whole Foods Market, Sephora, IKEA, Foot Locker), each with priced products and stock.

The script is safe to run more than once. It's for local development only.

---

## Using the API

Most endpoints need a JWT:

```bash
curl -X POST http://127.0.0.1:8001/api/auth/v1/token \
     -H "Content-Type: application/json" \
     -d '{"username": "john", "password": "password123"}'
```

Send the returned `access` token as `Authorization: Bearer <token>`.

Store-scoped endpoints (products, cart, checkout, store orders) also need the store's id in an `x-store-id: <store uuid>` header. Get store ids from `GET /api/store/v1/all/`.

### Endpoints

**Auth** (`:8001/api/auth/v1/`)

| Method | Path | Description |
|---|---|---|
| POST | `register` | Create an account (gets permission to create stores and products) |
| POST | `token` | Get access and refresh tokens |
| POST | `token/refresh` | Refresh the access token |
| GET | `me` | Current user, including owned stores |

**Store** (`:8000/api/store/v1/`)

| Method | Path | Description |
|---|---|---|
| GET | `all/` | List all stores |
| GET | `info/` | Store from `x-store-id` |
| PATCH | `info/` | Rename the store or change its `logo_url` (owner only) |
| POST | `create/` | Create a store owned by the caller |

**Product** (`:8002/api/product/v1/`, needs `x-store-id`)

| Method | Path | Description |
|---|---|---|
| GET | `list/` | Products of the store |
| POST | `create/` | Create a product (store owner only) |
| GET | `<product_id>/` | One product |
| PUT / PATCH | `<product_id>/` | Update a product (store owner only) |
| DELETE | `<product_id>/` | Delete a product (store owner only) |

**Cart** (`:8003/api/cart/v1/`, needs `x-store-id` except `all/`)

Carts are per store: a user has one cart for each store they add to, and each one checks out as its own order.

| Method | Path | Description |
|---|---|---|
| GET | `all/` | Every non-empty cart the user holds, one per store, with prices and subtotals |
| GET | `list/` | Cart items with product details, prices, line totals and subtotal |
| POST | `add/` | Add `{product_id, quantity}` |
| PATCH | `edit/<product_id>/` | Set `{quantity}` (`0` removes the item) |
| DELETE | `edit/<product_id>/` | Remove an item |
| DELETE | `clear/` | Empty the cart |

**Order** (`:8004/api/order/v1/`)

| Method | Path | Description |
|---|---|---|
| POST | `checkout/` | Turn the cart into an order (needs `x-store-id`). Optional body `{"buyer_store": "<uuid>"}` to buy as one of your stores |
| GET | `list/` | Orders you placed |
| GET | `store/` | Orders received by the store in `x-store-id` (owner only) |
| GET | `<order_id>/` | One order (buyer or seller) |
| PATCH | `<order_id>/status/` | Set `{status}`. Orders only move forward: `pending → confirmed → shipped → delivered`. Cancelling is allowed while `pending` or `confirmed`. The seller moves orders forward; the buyer can only cancel. Cancelling publishes `order.cancelled`, which returns any reserved stock |

Order responses include `store_name`, `store_logo_url`, `buyer_username`, `buyer_store_name` and `cancel_reason` so clients don't need extra lookups.

---

## Events

Services communicate through RabbitMQ using the shared `events` app:

```
order service                 RabbitMQ                       product service
checkout ──► publish("order.created") ──► exchange "events" ──► queue "product_service.events"
                                                                  └─► reserve_stock(): decrements stock and records
                                                                      a StockReservation, or publishes "inventory.rejected"
cancel   ──► publish("order.cancelled") ─────────────────────────► release_stock(): returns reserved stock once

product service ──► publish("inventory.rejected") ──► queue "order_service.events"
                                                       └─► cancel_rejected_order(): pending order → cancelled
```

- **Publish:** `from events import publish` then `publish("order.created", {...})`, usually inside `transaction.on_commit(...)`.
- **Subscribe:** add `<SERVICE_NAME>/event_handlers.py` and decorate functions with `@subscribe("order.created")`. `python manage.py consume_events` loads only that service's own handlers (services install each other's apps for their models, so autodiscovery would run the wrong handlers). Its queue is `<SERVICE_NAME>.events`.
- **Consumers:** `product` and `order` both run one. `python runserver.py all` starts them; in Docker they are `product-consumer` and `order-consumer`.
- **Delivery guarantees:**
  - Duplicate deliveries are skipped (the `ProcessedEvent` table).
  - A failing message is retried once, then moved to the dead-letter queue `<queue>.dead`.
- **Management UI:** http://localhost:15672 (`admin` / `secretpassword`).

> A consumer must have started once before events are published. Starting it creates and binds its queue, and the exchange drops messages that have no queue. After that, the durable queue keeps messages while the consumer is stopped.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `relation "..." does not exist` | Option A: `docker compose run --rm migrate`. Option B: `python runserver.py migrate` |
| `could not translate host name "db"` (Option B) | Your `.env` still has the Docker hostnames. Use the localhost values from Option B, step 2 |
| `Conflict. The container name "/e_store_db" is already in use` | An older compose project owns these containers. Remove it with `docker rm -f e_store_db redis broker` (data in `./volumes` is kept), then run `docker compose up -d` again |
| Port already allocated | Something on your machine uses that port. Change the matching `*_PORT` / `*_HOST_PORT` in `.env` |
| Consumer: `ACCESS_REFUSED` / login failed | Check that `RABBITMQ_USER` and `RABBITMQ_PASSWORD` in `.env` match the broker. See the volume note under [Configuration](#configuration-env) |
| Cart is always empty / Redis has no keys | Another Redis may be listening locally. Docker publishes Redis on `16379` to avoid that. In Option B, make sure `REDIS_PORT=16379` |
| `ModuleNotFoundError: No module named 'django'` | Option B: activate the virtual environment first |
| A message ended up in `<queue>.dead` | Fix the cause, then move it back to the `events` exchange from the management UI |
