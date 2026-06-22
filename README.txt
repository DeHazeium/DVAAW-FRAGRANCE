═══════════════════════════════════════════════════════
   D'VAAW PERFUME — WEBSITE (v2)
═══════════════════════════════════════════════════════

A faster, cleaner rebuild. 9 pages instead of 14, sharing
one stylesheet and one script. Modern minimal black + gold.

SETUP (GitHub Pages or any host)
--------------------------------
1. Upload every file in this folder to your repo root
   (the .nojekyll file is included — it prevents GitHub
   Pages build failures, so make sure it uploads too).
2. Add your product photos to the "image" folder
   (see IMAGE NAMES below). Missing images show a clean
   text placeholder, so the site looks finished without them.
3. In GitHub repo Settings > Pages, set Source to
   "Deploy from a branch" > main > / (root).

That's it. Static site — no build step, no server.


PAGES (9)
---------
  index.html         Home (hero, categories, featured, story)
  shop.html          All 25 products + filter tabs + recently viewed
  cart.html          Cart + WhatsApp checkout + Firebase logging
  shipping.html      Rates + address form with live zone calculator
  about.html         Brand story
  contact.html       Contact methods + WhatsApp form
  info.html          Privacy, cookies, terms, returns (combined)
  confirmation.html  Order thank-you (after checkout)
  404.html           Not-found page

SHARED (edit once, changes everywhere)
  styles.css   All design + layout
  app.js       Nav, footer, cart, catalog, toast, cookie banner


CHANGE THINGS
-------------
WhatsApp number:  In app.js, line ~9: const WHATSAPP = '601118866239';
                  (Also appears in contact.html and confirmation.html links.)

Products:         All 25 live in app.js in the CATALOG array.
                  Add/edit/remove there — every page updates.

Prices:           In app.js, the SIZES array (10ml = 18, 35ml = 79).

Shipping rates:   Sarawak RM10, Semenanjung RM15/kg.
                  Edit in shipping.html and cart.html.

Firebase:         Configured in cart.html. Orders log automatically.
                  If Firebase is ever down, orders STILL go through
                  WhatsApp — it never blocks checkout.


IMAGE NAMES (put in /image folder)
----------------------------------
Hero & sections:
  hero.png, gula-apong.png, community.png
  cat-her.png, cat-him.png, cat-unisex.png, cat-borneo.png

Products (match the id in app.js), e.g.:
  red-gorgeous.png, candy.png, the-goddess.png, hottest-guy.png,
  obsession.png, rentap-ridge.png, borneo-luxe.png ... etc.


NOTES
-----
- Cart auto-repairs bad data and updates the counter live.
- Fully responsive (desktop, tablet, phone).
- Respects "reduce motion" accessibility setting.
