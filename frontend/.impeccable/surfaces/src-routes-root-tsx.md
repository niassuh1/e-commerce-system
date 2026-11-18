---
version: 1
slug: "src-routes-root-tsx"
primary_target: "src/routes/__root.tsx"
related_targets: ["src/routes"]
---

## Scope

Whole Horizon web app: storefront (browse stores, store, product), carts, checkout, orders, auth, and the merchant dashboard. Visitor mode: **Operate**, with an image-led storefront.

## Audience and job

Saudi shoppers and merchants, often the same account, in Arabic or English. Shoppers find a store, add to that store's cart, check out as themselves or as one of their stores, and follow the order. Merchants list and restock products and move orders forward.

## Direction contract

THESIS: A quiet, image-first boutique. Product imagery carries the colour, and the interface is monochrome, soft, and pill-shaped. It refuses dense admin chrome and decorative heritage motifs.

OWN-WORLD: Pinned by the user's reference (a "Bliss" fashion storefront shot). A soft grey canvas (#ECECEF) holds one large white sheet with a 32px radius. Ink is near-black #111113 and secondary text is #6B6B73. Controls are fully rounded pills: black for primary or active, light grey #F2F2F4 for inactive pills, white with a hairline border for secondary. Image tiles have 24px radii on a #F4F4F6 ground. Circular icon buttons: a black arrow circle beside a white price pill. No accent colour beyond black. A red heart or destructive state appears only where it carries meaning. One bilingual sans (Readex Pro) carries both scripts.

STORY: The visitor sees products first, understands which store each belongs to, and acts with one pill. Each order shows where it is in a monochrome stepper.

FIRST VIEWPORT: White sheet on grey canvas. The header has the wordmark at the inline start, pill nav in the middle (Stores / Orders / My stores, with the active one black), and at the inline end a search pill, the language toggle, a cart circle with a count badge (it opens the cart popover), and the avatar. Below it, a "Stores" heading and filter pills, then an optional one-line latest-order strip. Then tall image-led store cards with radius 24, each a collage of that store's product photos with the store name over the image. Each card has a black arrow circle and a "Visit store" pill beneath it.

FORM: seed: none (pinned). The pin is the user-supplied reference screen (a "Bliss" fashion storefront), which they sent with the words "I didnt like the … theme of the app, check this image", replacing the earlier direction outright. That screen fixes both the world (monochrome, pill controls, image-led rounded tiles on a grey canvas) and the storefront layout. Signature move: product cards as tall rounded image tiles with a black arrow circle plus price pill beneath; on hover the circle widens with an expo ease into a black pill labelled "Add to cart" (the reference says "Buy now", but checkout goes through per-store carts, so the label names what the button does).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Recorded deviations from the reference

- The header's inline end runs search, language, cart, avatar. Language sits before cart so the cart popover anchors next to the account.
- The cart is a header popover (a user request) listing every per-store cart, with a button through to /cart. The home page has no carts panel and the store page has no floating cart bar.
- Home has no breadcrumb: it is the root, and a one-item trail adds nothing. Every deeper page has one.
- An active order appears on home as one slim strip above the store cards, so imagery still leads.

## Unresolved

- No product or store descriptions exist (the user chose to keep the models as they are). Cards stand on image, name, price, and stock.
