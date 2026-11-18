# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Shoppers (individuals):** sign in, browse stores, add products to a per-store cart, check out, and track their orders.
- **Merchants (store owners):** any registered account can create one or more stores, list products, and fulfil incoming orders from a store dashboard.
- **Businesses buying as a store:** a merchant can check out *as one of their own stores* (B2B purchase), so the order belongs to that store rather than to the person. A store cannot buy from itself.

Most users are both: the same account shops, sells, and buys on behalf of its stores.

## Product Purpose

Horizon is a multi-store marketplace. Anyone can open a store, list products, and sell. Anyone signed in can buy from any store, either as themselves or as one of their stores. Success means a shopper can go from browsing to a placed order without friction, and a merchant can see and move every incoming order through fulfilment from one dashboard.

## Positioning

A marketplace where stores are both sellers and buyers. Business-to-business purchasing (checking out as a store) is a first-class path, not an afterthought.

## Operating Context

- Backend: a Django/DRF microservice system at `G:\Projects\Python\zid-task-ii` (store :8000, auth :8001, product :8002, cart :8003, order :8004). PostgreSQL holds the data, Redis holds carts, and RabbitMQ carries the `order.created` events that reserve stock.
- Auth is Django's: SimpleJWT access/refresh tokens. The frontend keeps tokens server-side in httpOnly cookies and calls Django from TanStack Start server functions.
- Carts are **per store** (`cart:{user}:{store}`). A shopper can hold several open carts at once, one per store, and checks each out separately. One order = one seller store.
- Stock is reserved asynchronously after checkout. If stock runs out between checkout and reservation, the order is cancelled automatically.

## Capabilities and Constraints

- Register, log in, log out (Django JWT).
- Create a store (name, logo URL); browse all stores; browse a store's products.
- Create and edit products (name, image URL, price, stock quantity). The data has no product descriptions, categories, or store descriptions, and the user decided to keep the models as they are.
- Add to cart, change quantity, remove, clear; view all carts across stores.
- Checkout as yourself or as one of your stores.
- Orders: buyer view (orders placed personally and by owned stores) and seller view (orders received by a store).
- Order status follows a forward flow: `pending → confirmed → shipped → delivered`. `cancelled` is allowed only before shipping. The buyer may only cancel; the seller moves the order forward. Cancelling returns stock.
- Store dashboard: products (create/edit/stock), incoming orders and status changes, and a store overview.
- Images are URLs only (pasted, with a live preview). There is no upload or media storage.
- No payment provider: checkout places the order directly.
- Currency is **SAR** for all prices.

## Brand Commitments

- Name: **Horizon**.
- Bilingual: **Arabic and English**, with full right-to-left layout in Arabic.

## Evidence on Hand

- Seed data from `seed.py`: merchants `john`, `emily`, `michael` (password `password123`), superuser `admin`/`admin`, and seeded stores with priced, stocked products and logo URLs.
- No testimonials, reviews, ratings, sales figures, or customer counts exist. Do not fabricate them.

## Product Principles

1. **Every store is also a customer.** Buying as a store sits right beside buying as yourself, everywhere checkout appears.
2. **Per-store carts are a feature, not a quirk.** Make it obvious which store a cart belongs to and that each one checks out separately.
3. **Order state is the truth.** Always show where an order is in its flow and what the viewer is allowed to do next.
4. **Never invent data.** Show only what the backend returns: no fake ratings, reviews, or counts.
5. **Arabic is a first-class language**, not a translation layer: layout, numerals, and currency formatting follow the active locale.

## Accessibility & Inclusion

- Full RTL support for Arabic (mirrored layout and direction-aware icons).
- WCAG 2.2 AA as the baseline: keyboard-operable flows, visible focus, and AA contrast in both languages.
