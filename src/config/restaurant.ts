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
  name: "Razi's Pizza",
  tagline: 'Your Crave, Our Creation.',
  description:
    'Pizza, shawarma and grilled chicken made with fresh ingredients, rich cheese and our signature sauce. Every bite is a burst of flavour. Order for pickup or delivery in minutes.',
  brand: {
    heroKicker: 'Fresh & Tasty',
    heroTitle: 'Pizza',
    heroStrap: 'Handcrafted. Loaded. Perfect.',
    servesLine: ['Pizza', 'Shawarma', 'Great taste'],
  },
  address: 'Kpone Hospital Junction',
  city: 'Kpone',
  country: 'Ghana',
  mapUrl: '',
  // Digits only, including country code, no "+" or spaces.
  whatsappNumber: '233200000000', // [INSERT NUMBER WITH COUNTRY CODE]
  phone: '+233 20 000 0000', // [INSERT PHONE NUMBER]
  email: 'hello@example.com',
  instagram: '',
  facebook: '',
  // Public URL where the app is hosted (used for SEO tags and sitemap).
  siteUrl: 'https://kwensi.github.io/razis-pizza/',
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
    { id: 'kpone', name: 'Kpone Township', fee: 15, etaMinutes: 25, active: true },
    { id: 'community-25', name: 'Tema Community 25', fee: 20, etaMinutes: 30, active: true },
    { id: 'michel-camp', name: 'Michel Camp', fee: 20, etaMinutes: 30, active: true },
    { id: 'ashaiman', name: 'Ashaiman', fee: 25, etaMinutes: 40, active: true },
    { id: 'tema', name: 'Tema (Communities 1–12)', fee: 35, minOrder: 100, etaMinutes: 50, active: true },
    { id: 'afienya', name: 'Afienya', fee: 35, minOrder: 100, etaMinutes: 45, active: true },
    { id: 'prampram', name: 'Prampram', fee: 50, minOrder: 200, etaMinutes: 60, active: false },
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
    { name: 'Ama K.', location: 'Community 25', rating: 5, quote: 'The crust is unreal — blistered, chewy, and it still arrived hot. Our Friday night order is now a tradition.' },
    { name: 'Daniel O.', location: 'Kpone', rating: 5, quote: 'Ordering on WhatsApp took less than a minute. The Suya Chicken pizza is the best thing in Kpone right now.' },
    { name: 'Efua M.', location: 'Tema', rating: 5, quote: 'Proper Neapolitan-style margherita and they actually let you customise everything. Delivery was right on time.' },
  ],
  // SHA-256 of "1234". Change the PIN from Admin → Settings (demo mode only — see docs/PRODUCTION.md).
  adminPinHash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
}
