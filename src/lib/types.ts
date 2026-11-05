// Core domain types. Money values in catalog/config data are in MAJOR units
// (e.g. 85 = GHS 85.00) so they are easy for a restaurant owner to edit.
// All arithmetic is done in MINOR units (pesewas / cents) inside lib/pricing.ts.

export type SizeId = 'S' | 'M' | 'L' | 'XL'
export const SIZE_IDS: SizeId[] = ['S', 'M', 'L', 'XL']

export type SizePrices = Partial<Record<SizeId, number>>

export interface SizeOption {
  id: SizeId
  name: string
  /** e.g. '10"' — shown under the size name */
  detail: string
  serves: string
}

export interface Crust {
  id: string
  name: string
  description: string
  /** Surcharge per pizza size. A size missing here means the crust is not available in that size. */
  prices: SizePrices
  enabled: boolean
}

export interface Topping {
  id: string
  name: string
  /** Charge per pizza size when the customer ADDS this topping. */
  prices: SizePrices
  vegetarian: boolean
  enabled: boolean
}

export type CheeseLevel = 'none' | 'light' | 'regular' | 'extra' | 'double'

export interface Category {
  id: string
  name: string
  description: string
  /** pizza categories open the customisation engine; others use simple variants */
  kind: 'pizza' | 'simple'
  enabled: boolean
  sortOrder: number
}

export interface Variant {
  id: string
  name: string
  price: number
}

interface ProductBase {
  id: string
  name: string
  description: string
  categoryId: string
  /** Image path relative to the site root (e.g. "images/margherita") or a URL / data URL */
  image: string
  enabled: boolean
  bestSeller?: boolean
  tags?: string[]
}

export interface PizzaProduct extends ProductBase {
  kind: 'pizza'
  prices: SizePrices
  /** Topping ids included in the base price (customer may remove them, no refund) */
  defaultToppings: string[]
}

export interface SimpleProduct extends ProductBase {
  kind: 'simple'
  variants: Variant[]
}

export type Product = PizzaProduct | SimpleProduct

export type PromotionType = 'percent' | 'fixed' | 'bogo' | 'combo'

export interface ComboRequirement {
  /** items from ANY of these categories satisfy the requirement */
  categoryIds: string[]
  quantity: number
  label: string
}

export interface Promotion {
  id: string
  name: string
  description: string
  type: PromotionType
  /** percent: 0-100. fixed / combo: amount off in major units. bogo: unused. */
  value: number
  /** Leave empty for an automatic promotion; set to require a promo code. */
  code?: string
  minSubtotal?: number
  /** cap for percentage discounts, major units */
  maxDiscount?: number
  /** bogo: which categories are eligible (empty = all pizza categories) */
  categoryIds?: string[]
  /** combo: requirements that make up one combo */
  combo?: ComboRequirement[]
  startsAt?: string // ISO date-time
  endsAt?: string // ISO date-time
  active: boolean
  /** show on the homepage "Special offers" section */
  featured?: boolean
}

export interface DeliveryZone {
  id: string
  name: string
  fee: number
  minOrder?: number
  etaMinutes: number
  active: boolean
}

export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number
  open: string // "HH:MM"
  close: string // "HH:MM" (may be earlier than open = closes after midnight)
  closed: boolean
}

export type PaymentMethodId = 'cash_pickup' | 'cash_delivery' | 'momo' | 'bank'

export interface PaymentSettings {
  cash_pickup: { enabled: boolean; label: string }
  cash_delivery: { enabled: boolean; label: string }
  momo: {
    enabled: boolean
    label: string
    accounts: { network: string; number: string; accountName: string }[]
    instructions: string
  }
  bank: {
    enabled: boolean
    label: string
    bankName: string
    accountName: string
    accountNumber: string
    branch: string
    instructions: string
  }
}

export interface Testimonial {
  name: string
  location: string
  quote: string
  rating: number
}

export interface CurrencySettings {
  code: 'GHS' | 'USD' | string
  symbol: string
  locale: string
}

export interface RestaurantSettings {
  name: string
  tagline: string
  description: string
  address: string
  city: string
  country: string
  /** Optional Google Maps link; generated from the address when empty */
  mapUrl: string
  latitude?: number
  longitude?: number
  /** Digits only, with country code, no + (e.g. 233201234567) */
  whatsappNumber: string
  phone: string
  email: string
  instagram: string
  facebook: string
  siteUrl: string
  currency: CurrencySettings
  timezone: string
  /** Country calling code used to normalise local phone numbers, e.g. "233" */
  phoneCountryCode: string
  /** Expected digits AFTER the country code for local numbers, e.g. 9 for Ghana. 0 = skip the length check */
  phoneNationalLength: number
  hours: DayHours[]
  acceptOrdersWhenClosed: boolean
  pickupPrepMinutes: number
  minOrder: number
  freeDeliveryOver?: number
  tax: { enabled: boolean; label: string; ratePercent: number; inclusive: boolean }
  maxToppings: number
  maxQuantityPerLine: number
  deliveryZones: DeliveryZone[]
  payments: PaymentSettings
  testimonials: Testimonial[]
  /** SHA-256 hex of the demo admin PIN. Default PIN is 1234 — change it in Admin → Settings. */
  adminPinHash: string
  /** Marketing copy used on the homepage, matching the printed flyers */
  brand: {
    heroKicker: string
    heroTitle: string
    heroStrap: string
    /** short list shown as "PIZZA • SHAWARMA • GREAT TASTE" */
    servesLine: string[]
  }
}

export interface Catalog {
  version: number
  settings: RestaurantSettings
  sizes: SizeOption[]
  crusts: Crust[]
  toppings: Topping[]
  categories: Category[]
  products: Product[]
  promotions: Promotion[]
}

// ---------- Cart & orders ----------

export interface PizzaSelection {
  sizeId: SizeId
  crustId: string
  /** extra toppings added on top of the defaults */
  addedToppings: string[]
  /** default toppings the customer removed */
  removedToppings: string[]
  cheese: CheeseLevel
}

export interface CartLine {
  lineId: string
  productId: string
  quantity: number
  notes: string
  pizza?: PizzaSelection
  variantId?: string
}

export type OrderType = 'pickup' | 'delivery'

export interface CustomerDetails {
  name: string
  phone: string
  orderType: OrderType
  zoneId: string
  address: string
  landmark: string
  instructions: string
  paymentMethod: PaymentMethodId | ''
  promoCode: string
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export interface OrderLineSnapshot {
  productId: string
  name: string
  quantity: number
  unitPrice: number // minor units
  lineTotal: number // minor units
  details: string[]
  notes: string
}

export interface OrderTotals {
  subtotal: number
  discount: number
  delivery: number
  tax: number
  total: number
  promotionName?: string
}

export interface Order {
  ref: string
  createdAt: string
  status: OrderStatus
  source: 'this-device' | 'whatsapp-import' | 'sample'
  customer: CustomerDetails
  lines: OrderLineSnapshot[]
  totals: OrderTotals
  currency: string
  message: string
  statusHistory: { status: OrderStatus; at: string }[]
}
