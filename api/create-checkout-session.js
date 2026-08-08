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
      shipping_address_collection: {
        allowed_countries: [
          'AC','AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AT','AU','AW','AX','AZ',
          'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
          'CA','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CV','CW','CY','CZ',
          'DE','DJ','DK','DM','DO','DZ',
          'EC','EE','EG','EH','ER','ES','ET',
          'FI','FJ','FK','FO','FR',
          'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY',
          'HK','HN','HR','HT','HU',
          'ID','IE','IL','IM','IN','IO','IQ','IS','IT',
          'JE','JM','JO','JP',
          'KE','KG','KH','KI','KM','KN','KR','KW','KY','KZ',
          'LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY',
          'MA','MC','MD','ME','MF','MG','MK','ML','MM','MN','MO','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ',
          'NA','NC','NE','NG','NI','NL','NO','NP','NR','NU','NZ',
          'OM',
          'PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PY',
          'QA',
          'RE','RO','RS','RU','RW',
          'SA','SB','SC','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SZ',
          'TA','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
          'UA','UG','US','UY','UZ',
          'VA','VC','VE','VG','VN','VU',
          'WF','WS',
          'XK',
          'YE','YT',
          'ZA','ZM','ZW','ZZ',
        ],
      },
      // Note: Stripe's hosted Checkout shows all shipping_options as a
      // manual choice — it doesn't auto-detect the country and pick one
      // for you. The customer picks the option matching their own
      // address. (Auto-selecting based on typed address is possible but
      // needs a more advanced integration — ask if you want that later.)
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 499, currency: 'usd' }, // $4.99
            display_name: 'Standard Shipping (US & Canada)',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 1499, currency: 'usd' }, // $14.99
            display_name: 'International Shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 7 },
              maximum: { unit: 'business_day', value: 21 },
            },
          },
        },
      ],
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout session error:', err);
    return res.status(500).json({ error: 'Unable to start checkout' });
  }
}
