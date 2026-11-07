D'VAAW PERFUME — STOREFRONT
================================

A dependency-free, multi-page storefront deployed with Firebase Hosting. The visual system is
warm editorial luxury: parchment, black, charcoal and gold, with D'Vaaw's Sarawak and
Gula Apong identity at the centre.


ARCHITECTURE
------------

Static shell
  - Each route is a standalone HTML file.
  - styles.css contains shared design tokens, navigation, footer and utilities.
  - app.js injects shared navigation/footer UI and owns catalog/cart state.
  - app.js also provides the shared, original solid SVG icon set.
  - experience.js/css provide favourites, product dialogs and a scent finder.
  - shop.js handles search, sorting, filters and product-card interactions.

Commerce state
  - The built-in 33-product catalog lives in app.js.
  - Firebase product records can add, hide or override built-in products.
  - Size pricing and the active discount are fetched from Firebase in parallel.
  - Cart, saved scents, recently viewed products and the last request use localStorage.
  - The scent finder ranks available products using listed notes; no AI service,
    tracking service or account is required. Quiz answers remain in page memory.
  - Checkout first shows an editable review. Continuing prepares a WhatsApp order
    message and attempts to log the request. Cancelling does not create an order.
  - The bag remains available after handoff. Sending the message, stock, payment
    and fulfilment are confirmed personally; the site does not verify payment.

Accounts and admin
  - firebase.js owns Firebase Authentication and Firestore access.
  - account.html handles registration, login, preferences and delivery details.
  - admin.html manages products, stock, prices and the sitewide discount.
  - Firebase security rules are the real security boundary. The client-side
    admin screen must never be treated as authorization by itself.


ROUTES
------

  index.html          Home
  shop.html           Searchable catalog, saved scents, filters and quick views
  cart.html           Cart, delivery details and WhatsApp checkout
  confirmation.html   Saved request summary (not a payment receipt)
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

Product composition images use image/<product-id>.webp. To change a photo,
replace that asset or update its catalog path. Existing brand images are retained.


LOCAL PREVIEW
-------------

Run any static file server from the repository root. Example:

  python -m http.server 4174

Then open http://127.0.0.1:4174/.


DEPLOYMENT
----------

Run `node scripts/build.mjs` to prepare the static site in dist/, then deploy with:

  firebase deploy --only hosting --project dvaaw-fragrance-my

firebase.json publishes only dist/. A hosting-only release does not deploy
Firestore rules/indexes or alter stored customer, administrator or product records.

The first administrator is created by registering a normal site account, then
creating admins/<their-auth-uid> in Firestore with the field `active: true` from
the Firebase console. Client code cannot create or modify administrator records.

The footer and Contact page identify the official TikTok account as D'VAAW PERFUME
and the Facebook page as D'VAAW PERFUME HQ. The current links open each platform's
search results; replace them with the exact profile URLs when those are available.


STORE SETTINGS
--------------

  WhatsApp number   app.js (WHATSAPP)
  Built-in products app.js (CATALOG)
  Default prices    app.js (SIZES)
  Shipping rates    cart.html and shipping.html
  Firebase project  firebase.js


REGRESSION CHECKS
-----------------

Install development dependencies with npm install, then install a test browser
with npx playwright install chromium. Run a static server on port 4176 and run
npm run test:smoke. TEST_URL can point to another local preview address.
PLAYWRIGHT_PATH can identify an existing Playwright module and BROWSER_PATH can
identify an existing Chromium-compatible executable instead of downloading one.

The smoke check uses an isolated browser. Firebase is stubbed and WhatsApp is
intercepted, so it creates no real accounts, orders or messages. It covers search,
sorting, favourites, dialogs, scent matching, cart pricing, review/cancel,
validation, mobile routes, image loading and solid icon rendering.
