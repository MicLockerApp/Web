# MicLocker Stripe Connect Setup Guide

This guide will help you complete the Stripe Connect integration for MicLocker marketplace.

## Prerequisites
- Stripe account with access to the Dashboard
- Admin access to your MicLocker deployment

## Part 1: Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Settings** → **Connect** → **Get Started**
3. Complete the Connect onboarding:
   - Select **Platform or Marketplace**
   - Choose **Express** accounts (recommended for MicLocker)
   - Configure your platform profile

## Part 2: Configure Webhooks

MicLocker requires **TWO** webhook endpoints to handle all payment events:

### Webhook 1: Account Webhook (Platform Events)

1. Go to [Developers > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter URL: `https://miclockerapp.com/api/payments/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
5. Click **Add endpoint**
6. **Copy the Signing Secret** → Add to your deployment as `STRIPE_WEBHOOK_SECRET`

### Webhook 2: Connect Webhook (Seller Events)

1. Click **Add endpoint** again
2. Enter URL: `https://miclockerapp.com/api/payments/webhook/connect`
3. **IMPORTANT**: Check the box **"Events on Connected accounts"**
4. Select these events:
   - `account.updated`
   - `account.application.deauthorized`
   - `capability.updated`
   - `person.updated`
   - `transfer.created`
   - `transfer.reversed`
   - `payout.paid`
   - `payout.failed`
5. Click **Add endpoint**
6. **Copy the Signing Secret** → Add to your deployment as `STRIPE_CONNECT_WEBHOOK_SECRET`

## Part 3: Environment Variables

Add these to your production deployment:

```env
# Already configured (verify these are correct)
STRIPE_API_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Add these from webhook setup
STRIPE_WEBHOOK_SECRET=whsec_...          # From Account webhook
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...  # From Connect webhook
```

## Part 4: Test the Integration

### Test Seller Onboarding
1. Create a seller account on MicLocker
2. Go to Seller Dashboard
3. Click "Set Up Stripe Payments"
4. Complete the Express account onboarding
5. Verify the account shows as "active" in the dashboard

### Test Payment Flow
1. Create a test listing
2. As a buyer, purchase the item
3. Verify:
   - Checkout completes successfully
   - Order shows as "Paid" with funds "Held"
   - Seller receives notification
   - After delivery confirmation, funds are released

## Webhook Events Explained

### Account Webhook Events
| Event | What it does |
|-------|-------------|
| `checkout.session.completed` | Marks order as paid when buyer completes checkout |
| `checkout.session.expired` | Cancels order if checkout times out |
| `payment_intent.succeeded` | Confirms payment was processed |
| `payment_intent.payment_failed` | Updates order if payment fails |
| `charge.refunded` | Handles refunds and updates order status |
| `charge.dispute.*` | Notifies of chargebacks |

### Connect Webhook Events
| Event | What it does |
|-------|-------------|
| `account.updated` | Updates seller's payout status when they complete verification |
| `account.application.deauthorized` | Handles when seller disconnects from platform |
| `transfer.created` | Logs when funds are transferred to seller |
| `transfer.reversed` | Handles reversed transfers (refunds) |
| `payout.paid` | Confirms seller received bank deposit |
| `payout.failed` | Notifies seller of failed bank deposit |
| `capability.updated` | Tracks seller account capabilities |

## Troubleshooting

### Webhook not receiving events
1. Check webhook URL is accessible from internet
2. Verify HTTPS certificate is valid
3. Check Stripe Dashboard > Webhooks > [Your endpoint] > Logs

### Seller can't receive payouts
1. Verify seller completed Stripe onboarding
2. Check `account.updated` webhook is processing
3. Verify seller's `stripe_connect_status` is "active"

### Payment completes but order not updated
1. Check webhook logs in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

## Support
- Stripe Documentation: https://docs.stripe.com/connect
- Stripe Support: https://support.stripe.com
