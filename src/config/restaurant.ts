/**
 * ============================================================
 *  RESTAURANT CONFIGURATION — edit this file to rebrand the app
 * ============================================================
 *  Everything about the business lives here: name, contact
 *  details, WhatsApp number, currency, opening hours, delivery
 *  zones, tax and payment instructions.
 *
 *  Values marked [INSERT …] are placeholders: replace them before launch.
 *  Money values are in major units (85 = GHS 85.00).
 *
 *  This file is also imported by vite.config.ts to generate the
 *  page <title>, meta description, Open Graph tags, JSON-LD,
 *  sitemap.xml and the PWA manifest at build time.
 */
import type { RestaurantSettings } from '../lib/types.ts'

export const restaurant: RestaurantSettings = {
  name: 'Fornello Pizza Co.', // [INSERT RESTAURANT NAME]
  tagline: 'Wood-fired. Hand-stretched. Delivered hot.', // [INSERT TAGLINE]
  description:
    'Hand-stretched pizzas baked in a stone oven, made with slow-proved dough, real mozzarella and fresh local produce. Order for pickup or delivery in minutes.',
  address: '14 Oxford Street, Osu', // [INSERT LOCATION]
  city: 'Accra',
  country: 'Ghana',
  mapUrl: '',
  latitude: 5.556,
  longitude: -0.1826,
  // Digits only, including country code, no "+" or spaces.
  whatsappNumber: '233200000000', // [INSERT NUMBER WITH COUNTRY CODE]
  phone: '+233 20 000 0000', // [INSERT PHONE NUMBER]
  email: 'hello@example.com',
  instagram: '',
  facebook: '',
  // Public URL where the app is hosted (used for SEO tags and sitemap).
  siteUrl: 'https://your-username.github.io/pizza-pwa/',
  currency: { code: 'GHS', symbol: 'GH₵', locale: 'en-GH' },
  // For a US deployment use: { code: 'USD', symbol: '$', locale: 'en-US' }, phoneCountryCode '1', phoneNationalLength 10
  timezone: 'Africa/Accra',
  phoneCountryCode: '233',
  phoneNationalLength: 9,
  hours: [
    { day: 0, open: '12:00', close: '22:00', closed: false },
    { day: 1, open: '11:00', close: '22:00', closed: false },
    { day: 2, open: '11:00', close: '22:00', closed: false },
    { day: 3, open: '11:00', close: '22:00', closed: false },
    { day: 4, open: '11:00', close: '23:00', closed: false },
    { day: 5, open: '11:00', close: '00:00', closed: false },
    { day: 6, open: '11:00', close: '00:00', closed: false },
  ],
  // When false, customers cannot place orders outside opening hours.
  acceptOrdersWhenClosed: true,
  pickupPrepMinutes: 20,
  minOrder: 40,
  freeDeliveryOver: 400,
  tax: { enabled: false, label: 'VAT', ratePercent: 0, inclusive: true },
  maxToppings: 8,
  maxQuantityPerLine: 20,
  deliveryZones: [
    { id: 'osu', name: 'Osu', fee: 15, etaMinutes: 30, active: true },
    { id: 'labone', name: 'Labone', fee: 20, etaMinutes: 35, active: true },
    { id: 'cantonments', name: 'Cantonments', fee: 20, etaMinutes: 35, active: true },
    { id: 'airport', name: 'Airport Residential', fee: 25, etaMinutes: 40, active: true },
    { id: 'east-legon', name: 'East Legon', fee: 35, minOrder: 100, etaMinutes: 50, active: true },
    { id: 'tema', name: 'Tema', fee: 60, minOrder: 200, etaMinutes: 75, active: false },
  ],
  payments: {
    cash_pickup: { enabled: true, label: 'Cash on pickup' },
    cash_delivery: { enabled: true, label: 'Cash on delivery' },
    momo: {
      enabled: true,
      label: 'Mobile Money',
      accounts: [
        { network: 'MTN MoMo', number: '024 000 0000', accountName: '[INSERT ACCOUNT NAME]' },
        { network: 'Telecel Cash', number: '020 000 0000', accountName: '[INSERT ACCOUNT NAME]' },
      ],
      instructions:
        'Send the order total and use your order reference as the payment reference. Our team will confirm receipt on WhatsApp before we start baking.',
    },
    bank: {
      enabled: false,
      label: 'Bank transfer',
      bankName: '[INSERT BANK]',
      accountName: '[INSERT ACCOUNT NAME]',
      accountNumber: '[INSERT ACCOUNT NUMBER]',
      branch: '[INSERT BRANCH]',
      instructions: 'Use your order reference as the transfer description and send a screenshot on WhatsApp.',
    },
  },
  testimonials: [
    { name: 'Ama K.', location: 'Labone', rating: 5, quote: 'The crust is unreal — blistered, chewy, and it still arrived hot. Our Friday night order is now a tradition.' },
    { name: 'Daniel O.', location: 'Osu', rating: 5, quote: 'Ordering on WhatsApp took less than a minute. The Suya Chicken pizza is the best thing in Accra right now.' },
    { name: 'Efua M.', location: 'Cantonments', rating: 5, quote: 'Proper Neapolitan-style margherita and they actually let you customise everything. Delivery was right on time.' },
  ],
  // SHA-256 of "1234". Change the PIN from Admin → Settings (demo mode only — see docs/PRODUCTION.md).
  adminPinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
}
