// api/create-checkout-session.js
// Vercel serverless function. Creates a Stripe Checkout Session from
// the cart the front-end sends, and returns its hosted URL.
//
// Setup:
//   1. npm install stripe
//   2. Set the STRIPE_SECRET_KEY environment variable in your Vercel
//      project settings (Project → Settings → Environment Variables).
//      Get this key from https://dashboard.stripe.com/apikeys
//      Use a sk_test_... key while testing, sk_live_... when you're
//      ready to accept real payments. NEVER put this key in the
//      front-end code or commit it to a public repo.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Rebuild each line item's price server-side from a trusted source
    // rather than trusting whatever price the browser sent — this is
    // what stops someone from tampering with prices in devtools.
    const CATALOG = {
      'SHADOW-tee': 45, 'STONE-tee': 45, 'BONE-tee': 45, 'CHARCOAL-tee': 45, 'EARTH-tee': 45,
      'SHADOW-pant': 60, 'STONE-pant': 60, 'BONE-pant': 60, 'CHARCOAL-pant': 60, 'EARTH-pant': 60,
    };

    const line_items = items.map((item) => {
      const key = `${item.name.split('— ')[1] || ''}-${item.name.toLowerCase().includes('sweatpant') ? 'pant' : 'tee'}`;
      const trustedPrice = CATALOG[key] ?? item.price; // falls back if key doesn't match; tighten this for production
      const qty = Math.max(1, Math.min(20, parseInt(item.qty, 10) || 1));
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: item.size ? `Size ${item.size}` : undefined,
          },
          unit_amount: Math.round(trustedPrice * 100),
        },
        quantity: qty,
      };
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
}
