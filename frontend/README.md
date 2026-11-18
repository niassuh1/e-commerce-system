# Horizon · هورايزن

A bilingual (Arabic / English) multi-store marketplace built with TanStack Start, TanStack Query, Tailwind and shadcn/ui on top of the Django microservice backend in `zid-task-ii`.

Shoppers browse stores and keep one cart per store. They check out as themselves or as one of their own stores (B2B), then follow each order through Pending → Confirmed → Shipped → Delivered. Merchants open stores, manage products and stock, and move incoming orders forward from a store dashboard.

## Running it

1. Start the backend (see its README). Every service must be up, including both event consumers:

   ```bash
   python runserver.py all
   ```

2. Install and run the frontend:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Sign in with a seeded merchant (`john`, `emily` or `michael`, password `password123`), or create an account.

## How it talks to Django

The browser never calls Django directly. Every request goes through TanStack Start server functions (`src/server/functions.ts`), which:

- keep the SimpleJWT access and refresh tokens in **httpOnly cookies** (`hz_access`, `hz_refresh`) and refresh the access token when it expires,
- add the `x-store-id` header that the store-scoped services need,
- turn DRF error payloads into readable messages (`src/server/django.ts`).

No CORS configuration is needed on the Django side.

Service URLs default to the local ports. Override them with server-only env vars:

| Variable | Default |
|---|---|
| `DJANGO_STORE_URL` | `http://127.0.0.1:8000/api/store/v1` |
| `DJANGO_AUTH_URL` | `http://127.0.0.1:8001/api/auth/v1` |
| `DJANGO_PRODUCT_URL` | `http://127.0.0.1:8002/api/product/v1` |
| `DJANGO_CART_URL` | `http://127.0.0.1:8003/api/cart/v1` |
| `DJANGO_ORDER_URL` | `http://127.0.0.1:8004/api/order/v1` |

## Language

The locale lives in the `hz_locale` cookie (`en` or `ar`). It sets `<html lang dir>`, so Arabic renders right-to-left. Copy lives in `src/i18n/messages.ts`, with full Arabic plural forms. Prices are SAR via `Intl.NumberFormat`, and Arabic uses Arabic-Indic digits.

## Layout

```
src/
  server/      django client + server functions (the only code that talks to the backend)
  lib/         query options, mutations, types, auth guard
  i18n/        messages and the I18n provider
  components/  app components (product card, order stepper, header, …) and ui/ (shadcn)
  routes/      file-based routes: stores, cart, orders, dashboard, login, register
```
