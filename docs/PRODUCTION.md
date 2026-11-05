# Demo mode vs. production

The app ships in **demo mode**: a static site (GitHub Pages) with no server. It is
fully usable by a small restaurant that takes orders on WhatsApp, but it has hard
limits you should understand before relying on it.

## What demo mode does and does not do

| Area | Demo mode (today, free) | Why it matters |
|---|---|---|
| Customer ordering | ✅ Fully working. Cart, pricing, promotions, checkout and WhatsApp hand-off all run in the browser. | Orders arrive as WhatsApp messages, which is the real source of truth. |
| Prices | Calculated in the customer's browser from the published menu. | A technical customer could edit the message before sending. **Always check the total** (or tap the staff link, which re-prices the order from *your* menu). |
| Orders in the dashboard | Stored in IndexedDB in **one browser**. Orders appear if placed on that device, or if staff tap the "Staff: tap to add to dashboard" link in the WhatsApp message. | Customer phones never sync to your tablet. Two staff tablets don't share orders. Clearing browser data deletes them. |
| Menu / settings edits | Saved in the admin's browser until you **publish** `catalog.json` (Admin → Settings → Export, then upload to `public/` in GitHub). | Edits are invisible to customers until published. |
| Admin login | A PIN compared against a SHA-256 hash in the published config. | **Not security.** Anyone can read the site's JavaScript or skip the check. It only keeps casual visitors out. Never store anything secret in demo mode. |
| Payments | Instructions only (cash, Mobile Money, bank). Never marked "paid". | A payment is only real when *you* see it in your MoMo/bank account. |

**Verdict:** demo mode is fine for launch if WhatsApp is your order book and one
device runs the dashboard. Move to production when you need shared order
history, several staff devices, real logins or online payments.

## Production architecture (Supabase free tier)

[Supabase](https://supabase.com) gives you Postgres, authentication, row-level
security (RLS) and edge functions with a free tier (500 MB database, 50k monthly
active users, paused after 1 week of inactivity on the free plan). Hosting can stay on
GitHub Pages.

```
Customer browser ──(anon key, insert only via function)──▶ Edge Function "place-order"
                                                            │  re-prices from DB, validates,
                                                            ▼  writes order (service role, server-side only)
Staff browser ──(email login, JWT)──▶ Postgres with RLS ◀────┘
                                       products, toppings, zones, promotions, orders
```

### 1. Keys: what goes where

* **`anon` (public) key**: safe in the frontend. It can only do what RLS policies allow.
* **`service_role` key**: bypasses RLS. **Never** put it in `src/`, `.env` files
  committed to git, or GitHub Pages. It lives only in Supabase Edge Function secrets.

### 2. Schema + row-level security

Run in the Supabase SQL editor:

```sql
create table public.catalog (id int primary key default 1, data jsonb not null, updated_at timestamptz default now(),
  constraint single_row check (id = 1));

create table public.orders (
  ref text primary key,
  created_at timestamptz not null default now(),
  status text not null default 'new'
    check (status in ('new','accepted','preparing','ready','out_for_delivery','completed','cancelled')),
  customer jsonb not null,
  lines jsonb not null,
  totals jsonb not null,           -- written ONLY by the edge function, from server-side prices
  status_history jsonb not null default '[]'
);

create table public.staff (user_id uuid primary key references auth.users on delete cascade, role text not null default 'staff');

alter table public.catalog enable row level security;
alter table public.orders  enable row level security;
alter table public.staff   enable row level security;

create function public.is_staff() returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from staff where user_id = auth.uid()) $$;

-- Everyone may read the menu; only staff may change it.
create policy "menu readable" on public.catalog for select using (true);
create policy "menu staff write" on public.catalog for all using (is_staff()) with check (is_staff());

-- Customers never touch orders directly (the edge function inserts with the service role).
create policy "orders staff read" on public.orders for select using (is_staff());
create policy "orders staff update" on public.orders for update using (is_staff()) with check (is_staff());

create policy "staff see self" on public.staff for select using (user_id = auth.uid());
```

Add staff in Authentication → Users, then `insert into staff (user_id) values ('<their uuid>');`.

### 3. Server-side order validation (Edge Function)

The browser sends **only ids and choices**, never prices, exactly like the
`encodeOrderPayload` staff link. The function re-runs the same pricing code
(`src/lib/pricing.ts`, `cart.ts`, `promotions.ts`, `validation.ts`, which are
dependency-free TypeScript and run unchanged in Deno):

```ts
// supabase/functions/place-order/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildOrder } from '../_shared/orders-core.ts'      // copy of src/lib pricing/cart/promotions/validation
import { validateCheckout } from '../_shared/validation.ts'

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { lines, customer } = await req.json()
  const { data: row } = await db.from('catalog').select('data').single()
  const catalog = row!.data
  const fieldErrors = validateCheckout(catalog, customer)
  if (Object.keys(fieldErrors).length) return Response.json({ fieldErrors }, { status: 422 })
  const ref = crypto.randomUUID().slice(0, 8).toUpperCase()
  const { order, errors } = buildOrder(catalog, lines, customer, ref, new Date())   // trusted prices
  if (errors.length) return Response.json({ errors }, { status: 422 })
  // idempotency: reject the same phone + fingerprint within 10 minutes here as well
  await db.from('orders').insert({ ref, customer: order.customer, lines: order.lines, totals: order.totals })
  return Response.json({ ref, totals: order.totals })
})
```

Then in `Checkout.tsx` call the function first and build the WhatsApp message from
the **server's** totals. Add rate limiting (e.g. one order per phone per minute) in
the function.

### 4. Payments later

Mobile Money gateways (Paystack, Hubtel, Flutterwave) and Stripe charge per
transaction (no monthly fee on their basic plans). Integrate them **only** through an
edge function plus a verified webhook that marks `orders.payment_status = 'paid'`.
Never mark an order paid from the browser.

## Production-readiness checklist

- [ ] Replace every `[INSERT …]` value in `src/config/restaurant.ts`
- [ ] Real WhatsApp Business number set and tested end-to-end from a phone
- [ ] `siteUrl` set to the live URL (SEO tags, sitemap)
- [ ] Real menu, prices and your own photos (the bundled Unsplash photos are free to use but are not your food)
- [ ] Admin PIN changed from 1234 and `catalog.json` published
- [ ] Opening hours, delivery zones, fees and minimums confirmed
- [ ] Mobile Money / bank details double-checked
- [ ] Test order placed from an iPhone (Safari) and an Android (Chrome); app installed on both
- [ ] Staff know to verify totals and payments before accepting orders
- [ ] Privacy notice added if required in your country (customer names, phones and addresses are processed)
- [ ] For multi-device admin / online payments: Supabase setup above, service-role key only in function secrets
