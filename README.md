# Going live: taking real orders and real payments

This site is a static front-end (`index.html`) plus one small backend
function (`api/create-checkout-session.js`) that talks to Stripe.
Stripe hosts the actual payment page — card numbers never touch your
own server, which is both simpler and safer for you.

## Why this can't just run as one HTML file

A browser can't securely charge a card by itself — that takes a
backend holding a secret API key, which can never live in code the
browser downloads. The pieces below are the minimum needed to do this
for real.

## 1. Create a Stripe account

1. Go to https://stripe.com and sign up (free).
2. In the Dashboard, go to **Developers → API keys**.
3. Copy the **Secret key** — it starts with `sk_test_...` while
   you're in test mode. You'll use a `sk_live_...` key later, once
   you're ready to accept real money.

## 2. Deploy this project to Vercel (free tier works)

1. Create a Vercel account at https://vercel.com (you can sign up
   with GitHub).
2. Put these files in a GitHub repo:
   ```
   /index.html                        <- the site (rename depravity.html to this)
   /api/create-checkout-session.js    <- the Stripe function
   /package.json
   /vercel.json
   ```
3. In Vercel, click **New Project** and import that repo.
4. Before deploying, go to **Environment Variables** and add:
   - `STRIPE_SECRET_KEY` = the secret key you copied in step 1
5. Deploy. Vercel will give you a live URL like
   `https://depravity.vercel.app`.

## 3. Test it

1. Visit your new URL and add something to the cart.
2. Click **Checkout** — you should land on a real Stripe-hosted
   payment page.
3. Use Stripe's test card: `4242 4242 4242 4242`, any future expiry,
   any 3-digit CVC, any ZIP. It will complete a real test transaction
   (no real money moves while your key is `sk_test_...`).
4. You should be redirected back to your site with the order
   confirmation panel.
5. Check the Stripe Dashboard → Payments — the test order will be
   listed there. This is also where you'll see every real order once
   you're live — there's no separate database to manage.

## 4. Go live

1. In Stripe, finish account activation (business details, bank
   account for payouts) — Stripe will prompt you for what's needed.
2. Swap the environment variable in Vercel from your `sk_test_...`
   key to your `sk_live_...` key.
3. Redeploy. Real cards will now be charged for real.

## 5. Optional: connect your own domain

In Vercel: **Project → Settings → Domains**, add `depravity.com` (or
whatever you register), and follow the DNS instructions it gives you.
Update the `depravity.com` placeholders in the site's meta tags to
match once it's live.

## Notes

- Shipping address is collected by Stripe Checkout itself (configured
  for US/CA/GB/AU in the function — edit `allowed_countries` to add
  more).
- Stripe automatically emails a receipt to the customer.
- The serverless function re-prices each cart line from a trusted
  list server-side, so someone editing prices in their browser's
  devtools can't actually check out for less — extend the `CATALOG`
  object there if you add more products.
- If you'd rather not manage a codebase/hosting at all, an all-in-one
  platform like Shopify or Squarespace Commerce handles the store,
  hosting, and payments together with no code — worth considering if
  you want less to maintain, at the cost of less design control than
  this custom build.
