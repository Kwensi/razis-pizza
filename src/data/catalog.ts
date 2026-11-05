/**
 * The built-in default catalog: restaurant settings + demo menu + demo promotions.
 *
 * Load order at runtime (see src/state/catalog.tsx):
 *   1. this file (compiled into the app)
 *   2. public/catalog.json, if present — the "published" catalog exported from Admin
 *   3. unpublished local edits made in Admin on THIS browser only
 */
import { restaurant } from '../config/restaurant'
import type { Catalog, Promotion } from '../lib/types'
import { categories, crusts, products, sizes, toppings } from './menu'

export const PIZZA_CATEGORY_IDS = categories.filter((c) => c.kind === 'pizza').map((c) => c.id)

// DEMONSTRATION PROMOTIONS — edit, disable or delete in Admin → Promotions.
export const promotions: Promotion[] = [
  {
    id: 'family-combo',
    name: 'Family Combo',
    description: 'Any pizza + any side + any drink — save GH₵20 automatically on every combo.',
    type: 'combo',
    value: 20,
    combo: [
      { categoryIds: PIZZA_CATEGORY_IDS, quantity: 1, label: 'pizza' },
      { categoryIds: ['sides'], quantity: 1, label: 'side' },
      { categoryIds: ['drinks'], quantity: 1, label: 'drink' },
    ],
    active: true,
    featured: true,
  },
  {
    id: 'welcome10',
    name: '10% off your first order',
    description: 'Use code WELCOME10 on orders over GH₵80 (max GH₵50 off).',
    type: 'percent',
    value: 10,
    code: 'WELCOME10',
    minSubtotal: 80,
    maxDiscount: 50,
    active: true,
    featured: true,
  },
  {
    id: 'two-for-one',
    name: 'Buy one, get one free',
    description: 'Code 2FOR1: the cheaper of every two pizzas is free.',
    type: 'bogo',
    value: 0,
    code: '2FOR1',
    categoryIds: [],
    active: true,
    featured: true,
  },
  {
    id: 'big-order',
    name: 'GH₵25 off big orders',
    description: 'Code PARTY25 on orders of GH₵250 or more. Ends 31 Dec 2026.',
    type: 'fixed',
    value: 25,
    code: 'PARTY25',
    minSubtotal: 250,
    endsAt: '2026-12-31T23:59:59Z',
    active: true,
  },
  {
    id: 'festive',
    name: 'Festive 15% off',
    description: 'Code FESTIVE15, valid 1–31 December 2026.',
    type: 'percent',
    value: 15,
    code: 'FESTIVE15',
    startsAt: '2026-12-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:59Z',
    active: true,
  },
]

export const CATALOG_VERSION = 1

export const defaultCatalog: Catalog = {
  version: CATALOG_VERSION,
  settings: restaurant,
  sizes,
  crusts,
  toppings,
  categories,
  products,
  promotions,
}
