# Razi's Pizza — pizza ordering PWA

**Live site:** https://kwensi.github.io/razis-pizza/ (open on your phone, then Share → Add to Home Screen)

A mobile-first pizza ordering web app that customers can install on iPhone, Android,
Windows and Mac. Customers build their order (sizes, crusts, cheese, toppings, sides,
drinks, desserts), choose pickup or delivery, and send the complete order to the
restaurant on **WhatsApp**. Includes a staff dashboard for orders, menu, prices,
promotions and settings.

**Cost to run: GH₵0 / $0.** React + TypeScript + Vite + Tailwind, hosted free on GitHub Pages.
No paid APIs, no payment gateway, no customer accounts.

> Menu items, prices, reviews and promotions are **editable demonstration data**.
> Product photos are free-licence images from Unsplash. Replace them with photos of your own food.

---

## Quick start (on a computer)

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 71 automated tests
npm run build      # production build in dist/
npm run preview    # serve the production build (PWA + offline work here)
```

Staff dashboard: open `/#/admin` (or "Staff login" in the footer). Default PIN **1234**.

## How ordering works

1. Customer browses the menu → taps a pizza → picks size, crust, cheese, toppings and quantity. The price updates instantly.
2. Cart: edit, change quantity, remove, pick pickup/delivery and area, enter a promo code.
3. Checkout: name, phone, address/landmark (delivery), instructions and payment method. Everything is validated.
4. **Place order** generates a reference (e.g. `RP-261105-7KQ2M`) and opens WhatsApp with a formatted order message to your number. The customer presses Send.
5. The order page says **"awaiting restaurant confirmation"**. The app never claims an order is confirmed or paid. You confirm by replying on WhatsApp.
6. The message ends with a **staff link**. Tap it on the dashboard device to add the order to your dashboard. Prices are recalculated from *your* menu, so an edited message can't change the total.

## Changing the branding

| What | Where |
|---|---|
| Name, tagline, description, address, phone, email, hours, delivery zones, tax, payment details, reviews | `src/config/restaurant.ts` (or Admin → Settings, then publish) |
| Colours and fonts | `src/index.css` → the `@theme` block (`--color-brand` = red, `--color-ink` = charcoal, `--color-cream` = background) |
| Logo / app icon | Replace `public/logo.svg`, then run `npm run icons` to regenerate the favicon, Apple touch icon and PWA icons |
| Homepage photos | `public/images/hero-960.webp`, `hero-1600.webp`, `story-*.webp` |
| Currency | `currency` in `restaurant.ts`, e.g. `{ code: 'USD', symbol: '$', locale: 'en-US' }`, plus `phoneCountryCode: '1'`, `phoneNationalLength: 10` |

The page title, meta description, Open Graph tags, Restaurant JSON-LD, sitemap and
PWA manifest are all generated from `restaurant.ts` at build time.

## Changing the WhatsApp number

Use your country code + number, **digits only** (no `+`, spaces or leading 0):
Ghana `024 123 4567` → `233241234567`.

* **In code:** `whatsappNumber` in `src/config/restaurant.ts`, then commit.
* **Without code:** Admin → Settings → "WhatsApp number for orders" → Save → Export `catalog.json` → upload it (see below).

Test it: place an order from your phone and confirm the message arrives.

## Updating menu prices

**Option A: from the dashboard (no coding)**
1. Admin → Menu → edit products, sizes, toppings, crusts (or Admin → Promotions / Settings).
2. Admin → Settings → **Export catalog.json**.
3. On GitHub, open your repository → `public` folder → **Add file → Upload files** → upload `catalog.json` → **Commit**.
4. About a minute later the live site uses the new menu for every customer.

Until step 3, edits exist only in the browser where you made them (shown as "unpublished edits").

**Option B: in code:** edit `src/data/menu.ts` (prices are in normal currency units, e.g. `85` = GH₵85) and promotions in `src/data/catalog.ts`. If a `public/catalog.json` exists, it overrides these files, so delete it or re-export it.

Photos: Admin → Menu → product → **Upload photo** (auto-resized to 800×600), or put
`name-400.webp` / `name-800.webp` in `public/images/` and set `image: 'images/name'`.

## Deploying free on GitHub Pages

1. Create a free account at github.com and a **new repository**, e.g. `pizza-pwa` (public; Pages is free for public repos).
2. Set `siteUrl` in `src/config/restaurant.ts` to `https://<your-username>.github.io/pizza-pwa/`.
3. Push the code:
   ```bash
   git remote add origin https://github.com/<your-username>/pizza-pwa.git
   git push -u origin main
   ```
4. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Open the **Actions** tab. The "Deploy to GitHub Pages" workflow runs the tests, builds, and publishes. When it's green your site is live at the URL above, over HTTPS (required for install and offline mode).

Every later push to `main` redeploys automatically.

The app uses hash URLs (`/#/menu`), so deep links and refreshes work on GitHub Pages
without server configuration.

### Custom domain (optional, ~$10–15/year from any registrar)

1. GitHub → Settings → Pages → **Custom domain** → enter `order.yourpizza.com` → Save.
2. At your registrar add a DNS record: subdomain → `CNAME` to `<your-username>.github.io`;
   apex domain (`yourpizza.com`) → `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
3. Wait for DNS (minutes to hours), then tick **Enforce HTTPS**.
4. Update `siteUrl` in `restaurant.ts` to the new domain and push.

## Installing the app (PWA)

* **iPhone/iPad:** open the site in **Safari** → Share button → **Add to Home Screen** → Add.
* **Android:** Chrome shows **Install app**, or ⋮ menu → Install app.
* **Windows/Mac:** Chrome/Edge install icon in the address bar; Safari 17+ → File → Add to Dock.

The in-app page `/#/install` shows these steps with a one-tap install button where supported.
After the first visit the menu, photos and app shell are cached, so customers can browse and build an
order offline. Sending it needs a connection.

## Project structure

```
src/
  config/restaurant.ts     ← business settings (edit me)
  data/menu.ts             ← demo menu: sizes, crusts, toppings, categories, products
  data/catalog.ts          ← demo promotions + assembled default catalog
  lib/                     ← framework-free logic (fully unit-tested)
    pricing.ts             ← pizza pricing + selection validation (integer minor units)
    cart.ts                ← line merging, delivery fees, tax, totals
    promotions.ts          ← percent / fixed / BOGO / combo, codes, dates, minimums
    validation.ts          ← phone + checkout validation, input sanitising
    whatsapp.ts            ← order refs, message, wa.me URL, staff payload, duplicate guard
    orders.ts              ← order snapshots, IndexedDB storage, dashboard stats
    hours.ts               ← open/closed in the restaurant's timezone
  state/                   ← catalog (built-in → catalog.json → local edits) + cart (localStorage)
  components/              ← layout, product card, customisation sheet
  pages/                   ← Home, Menu, Cart, Checkout, Order, My orders, Install
  admin/                   ← dashboard, orders, menu, promotions, settings (code-split)
docs/PRODUCTION.md         ← demo vs production, Supabase setup, readiness checklist
.github/workflows/deploy.yml
```

## Testing

`npm test` runs 71 tests (Vitest + Testing Library):

* pizza price calculation, crust surcharges per size, invalid size/crust combinations
* topping charges, extra/double cheese, removing included toppings, max-topping limit
* cart merging, quantity caps, edit-in-place, subtotal/delivery/total, minimum order, tax (inclusive & exclusive), tampered lines
* discounts: percentage + cap, fixed, BOGO, combo, best-offer selection, scheduled/expired/unknown codes
* delivery fees: zones, inactive zones, zone minimums, free-delivery threshold
* checkout validation: Ghana and international phone numbers, required fields, payment/order-type rules, sanitising
* WhatsApp message content, URL encoding, order references, staff payload round-trip and tamper rejection
* duplicate submissions (double-tap, resend window, retry after failure)
* IndexedDB order storage, dashboard statistics, opening hours incl. past midnight
* UI flow: customise a pizza with live price updates → cart → quantity change → remove; mobile-first grid classes

Manual browser checks (headless Chromium at 390×844 and 1280×800): homepage, menu,
customiser, cart, checkout validation, order placement, WhatsApp message, duplicate
warning, staff import, all admin pages. No console errors and no horizontal overflow.

## Security notes

* No secrets in the frontend. There are none to leak in demo mode.
* All customer text is rendered by React (escaped). No `dangerouslySetInnerHTML`.
* Prices are always recomputed from the catalog. Cart lines never store prices.
* For real multi-device admin, authentication and server-side price checks, follow `docs/PRODUCTION.md`.
