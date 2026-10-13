D'VAAW FRAGRANCE — STOREFRONT
================================

A dependency-free, multi-page storefront for GitHub Pages. The visual system is
warm editorial luxury: ivory, cocoa and terracotta, with D'Vaaw's Sarawak and
Gula Apong identity at the centre.


ARCHITECTURE
------------

Static shell
  - Each route is a standalone HTML file.
  - styles.css contains shared design tokens, navigation, footer and utilities.
  - app.js injects shared navigation/footer UI and owns catalog/cart state.

Commerce state
  - The built-in 25-product catalog lives in app.js.
  - Firebase product records can add, hide or override built-in products.
  - Size pricing and the active discount are fetched from Firebase in parallel.
  - Cart, recently viewed products and the last order use browser localStorage.
  - Checkout creates a WhatsApp order message; Firestore order logging is
    best-effort and never blocks the customer.

Accounts and admin
  - firebase.js owns Firebase Authentication and Firestore access.
  - account.html handles registration, login, preferences and delivery details.
  - admin.html manages products, stock, prices and the sitewide discount.
  - Firebase security rules are the real security boundary. The client-side
    admin screen must never be treated as authorization by itself.


ROUTES
------

  index.html          Home
  shop.html           Catalog and category filters
  cart.html           Cart, delivery details and WhatsApp checkout
  confirmation.html   Saved order summary
  shipping.html       Rates and delivery calculator
  about.html          Brand story
  contact.html        Contact form and channels
  info.html           Privacy, cookies, terms and returns
  account.html        Customer authentication and profile
  admin.html          Staff catalog/settings interface
  404.html            Not-found page


IMAGES
------

Original D'Vaaw files in /image are intentionally kept unchanged. Products with
real photography use their matching file. Products whose photo is not yet in the
repository reuse image/perfume-bottle-ai.webp as a single neutral fallback.

To add a real product photo later, save it as image/<product-id>.png. The existing
catalog path will begin using it automatically without a code change.


LOCAL PREVIEW
-------------

Run any static file server from the repository root. Example:

  python -m http.server 4174

Then open http://127.0.0.1:4174/.


DEPLOYMENT
----------

This repository needs no build step. In GitHub repository settings, enable Pages
from the main branch and the repository root. Keep .nojekyll in the root.

Before production launch, verify Firestore rules for users, products, settings,
orders and admin-only writes. Also replace the placeholder social links in app.js
with D'Vaaw's official profile URLs.


STORE SETTINGS
--------------

  WhatsApp number   app.js (WHATSAPP)
  Built-in products app.js (CATALOG)
  Default prices    app.js (SIZES)
  Shipping rates    cart.html and shipping.html
  Firebase project  firebase.js
