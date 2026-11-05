/**
 * Cart maths: line merging, delivery fees, tax and order totals.
 * Every number here is integer minor units.
 */
import { configKey, priceLine, toMinor, formatMoney, type PricedLine } from './pricing'
import { selectPromotion } from './promotions'
import type { CartLine, Catalog, DeliveryZone, OrderType, Promotion } from './types'

export function newLineId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `l_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Add a line, merging into an identical existing line (same product + customisation). */
export function addOrMergeLine(lines: CartLine[], incoming: Omit<CartLine, 'lineId'>, maxQty: number): CartLine[] {
  const key = configKey(incoming)
  const existing = lines.find((l) => configKey(l) === key)
  if (existing) {
    return lines.map((l) =>
      l.lineId === existing.lineId ? { ...l, quantity: Math.min(l.quantity + incoming.quantity, maxQty) } : l,
    )
  }
  return [...lines, { ...incoming, lineId: newLineId() }]
}

/** Replace a line (used by "edit customisation"), merging if it now matches another line. */
export function replaceLine(lines: CartLine[], lineId: string, next: Omit<CartLine, 'lineId'>, maxQty: number): CartLine[] {
  const without = lines.filter((l) => l.lineId !== lineId)
  const key = configKey(next)
  const dup = without.find((l) => configKey(l) === key)
  if (dup) return without.map((l) => (l === dup ? { ...l, quantity: Math.min(l.quantity + next.quantity, maxQty) } : l))
  const index = lines.findIndex((l) => l.lineId === lineId)
  const copy = [...without]
  copy.splice(index < 0 ? copy.length : index, 0, { ...next, lineId })
  return copy
}

export function updateQuantity(lines: CartLine[], lineId: string, quantity: number, maxQty: number): CartLine[] {
  if (!Number.isFinite(quantity) || quantity < 1) return lines.filter((l) => l.lineId !== lineId)
  const q = Math.min(Math.floor(quantity), maxQty)
  return lines.map((l) => (l.lineId === lineId ? { ...l, quantity: q } : l))
}

export interface DeliveryQuote {
  fee: number
  zone?: DeliveryZone
  freeApplied: boolean
  error?: string
}

/** Delivery fee for a zone. `itemsTotal` = subtotal after discount, used for free-delivery and zone minimums. */
export function deliveryFee(catalog: Catalog, orderType: OrderType, zoneId: string, itemsTotal: number): DeliveryQuote {
  if (orderType === 'pickup') return { fee: 0, freeApplied: false }
  const cur = catalog.settings.currency
  const zone = catalog.settings.deliveryZones.find((z) => z.id === zoneId)
  if (!zone) return { fee: 0, freeApplied: false, error: 'Choose your delivery area.' }
  if (!zone.active) return { fee: 0, zone, freeApplied: false, error: `Sorry, we are not delivering to ${zone.name} right now.` }
  if (zone.minOrder && itemsTotal < toMinor(zone.minOrder))
    return {
      fee: toMinor(zone.fee),
      zone,
      freeApplied: false,
      error: `Minimum order for delivery to ${zone.name} is ${formatMoney(toMinor(zone.minOrder), cur)}.`,
    }
  const freeOver = catalog.settings.freeDeliveryOver
  if (freeOver && freeOver > 0 && itemsTotal >= toMinor(freeOver)) return { fee: 0, zone, freeApplied: true }
  return { fee: toMinor(zone.fee), zone, freeApplied: false }
}

export interface CartTotals {
  priced: PricedLine[]
  itemCount: number
  subtotal: number
  discount: number
  promotion?: Promotion
  promoMessage?: string
  promoCodeValid: boolean
  delivery: DeliveryQuote
  tax: number
  taxIncluded: boolean
  total: number
  /** blocking problems — checkout is not allowed while this is non-empty */
  errors: string[]
}

export interface TotalsOptions {
  orderType: OrderType
  zoneId: string
  promoCode: string
  now?: Date
}

export function computeTotals(catalog: Catalog, lines: CartLine[], opts: TotalsOptions): CartTotals {
  const now = opts.now ?? new Date()
  const { settings } = catalog
  const priced = lines.map((l) => priceLine(catalog, l))
  const errors: string[] = []
  if (!lines.length) errors.push('Your cart is empty.')
  if (priced.some((p) => p.errors.length)) errors.push('Some items in your cart need attention.')

  const subtotal = priced.reduce((s, p) => s + p.lineTotal, 0)
  const promo = selectPromotion(catalog, priced, subtotal, opts.promoCode, now)
  const discount = Math.min(promo.applied?.discount ?? 0, subtotal)
  const itemsTotal = subtotal - discount

  const delivery = deliveryFee(catalog, opts.orderType, opts.zoneId, itemsTotal)
  if (delivery.error && opts.orderType === 'delivery') errors.push(delivery.error)

  if (lines.length && settings.minOrder > 0 && subtotal < toMinor(settings.minOrder))
    errors.push(`Minimum order is ${formatMoney(toMinor(settings.minOrder), settings.currency)}.`)

  let tax = 0
  const { tax: t } = settings
  if (t.enabled && t.ratePercent > 0) {
    tax = t.inclusive
      ? Math.round((itemsTotal * t.ratePercent) / (100 + t.ratePercent))
      : Math.round((itemsTotal * t.ratePercent) / 100)
  }
  const taxIncluded = t.inclusive
  const total = itemsTotal + delivery.fee + (t.enabled && !taxIncluded ? tax : 0)

  return {
    priced,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    discount,
    promotion: promo.applied?.promotion,
    promoMessage: promo.codeMessage,
    promoCodeValid: promo.codeValid,
    delivery,
    tax,
    taxIncluded,
    total,
    errors: [...new Set(errors)],
  }
}
