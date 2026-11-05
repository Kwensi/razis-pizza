/**
 * Promotion rules. One promotion applies per order: the best automatic
 * promotion, or the customer's promo code if it saves more. All amounts are
 * minor units.
 */
import { formatMoney, toMinor, type PricedLine } from './pricing'
import type { Catalog, Promotion } from './types'

export type PromotionState = 'live' | 'scheduled' | 'expired' | 'inactive'

export function promotionStatus(p: Promotion, now: Date): PromotionState {
  if (!p.active) return 'inactive'
  if (p.startsAt && now < new Date(p.startsAt)) return 'scheduled'
  if (p.endsAt && now > new Date(p.endsAt)) return 'expired'
  return 'live'
}

export const isPromotionLive = (p: Promotion, now: Date) => promotionStatus(p, now) === 'live'

export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '')

export interface Evaluation {
  discount: number
  /** why the promotion gave no discount */
  reason?: string
}

/** Expand priced lines into one unit price per item, only for valid lines in the given categories. */
function unitsIn(lines: PricedLine[], categoryIds: string[]): number[] {
  const units: number[] = []
  for (const l of lines) {
    if (l.errors.length || !categoryIds.includes(l.categoryId)) continue
    for (let i = 0; i < l.line.quantity; i++) units.push(l.unitPrice)
  }
  return units
}

export function evaluatePromotion(catalog: Catalog, p: Promotion, lines: PricedLine[], subtotal: number): Evaluation {
  const cur = catalog.settings.currency
  const min = toMinor(p.minSubtotal ?? 0)
  if (subtotal <= 0) return { discount: 0, reason: 'Add items to your cart first.' }
  if (min > 0 && subtotal < min)
    return { discount: 0, reason: `Add ${formatMoney(min - subtotal, cur)} more to use this offer (minimum ${formatMoney(min, cur)}).` }

  let discount = 0
  switch (p.type) {
    case 'percent': {
      const pct = Math.min(Math.max(p.value, 0), 100)
      discount = Math.round((subtotal * pct) / 100)
      if (p.maxDiscount && p.maxDiscount > 0) discount = Math.min(discount, toMinor(p.maxDiscount))
      break
    }
    case 'fixed':
      discount = toMinor(Math.max(p.value, 0))
      break
    case 'bogo': {
      const cats = p.categoryIds?.length
        ? p.categoryIds
        : catalog.categories.filter((c) => c.kind === 'pizza').map((c) => c.id)
      const units = unitsIn(lines, cats).sort((a, b) => b - a)
      if (units.length < 2) return { discount: 0, reason: 'Add two eligible pizzas to get one free.' }
      // pair the most expensive items together; the cheaper of each pair is free
      for (let i = 1; i < units.length; i += 2) discount += units[i]
      break
    }
    case 'combo': {
      const reqs = p.combo ?? []
      if (!reqs.length) return { discount: 0, reason: 'This combo is not configured.' }
      const times = Math.min(...reqs.map((r) => Math.floor(unitsIn(lines, r.categoryIds).length / Math.max(r.quantity, 1))))
      if (times < 1) {
        const missing = reqs.filter((r) => unitsIn(lines, r.categoryIds).length < r.quantity).map((r) => r.label)
        return { discount: 0, reason: `Add a ${missing.join(' and a ')} to complete the combo.` }
      }
      discount = times * toMinor(Math.max(p.value, 0))
      break
    }
  }
  return { discount: Math.min(discount, subtotal) }
}

export interface PromotionResult {
  applied?: { promotion: Promotion; discount: number }
  /** message about the entered code (error or info) */
  codeMessage?: string
  codeValid: boolean
}

export function selectPromotion(
  catalog: Catalog,
  lines: PricedLine[],
  subtotal: number,
  code: string,
  now: Date,
): PromotionResult {
  let best: PromotionResult['applied']
  const consider = (promotion: Promotion, discount: number) => {
    if (discount > 0 && (!best || discount > best.discount)) best = { promotion, discount }
  }

  for (const p of catalog.promotions) {
    if (p.code || !isPromotionLive(p, now)) continue
    consider(p, evaluatePromotion(catalog, p, lines, subtotal).discount)
  }

  const entered = normaliseCode(code)
  if (!entered) return { applied: best, codeValid: false }

  const promo = catalog.promotions.find((p) => p.code && normaliseCode(p.code) === entered)
  if (!promo) return { applied: best, codeValid: false, codeMessage: 'That promo code is not recognised.' }
  const state = promotionStatus(promo, now)
  if (state === 'expired') return { applied: best, codeValid: false, codeMessage: 'That promo code has expired.' }
  if (state === 'scheduled') return { applied: best, codeValid: false, codeMessage: 'That promo code is not active yet.' }
  if (state === 'inactive') return { applied: best, codeValid: false, codeMessage: 'That promo code is no longer available.' }

  const evaluation = evaluatePromotion(catalog, promo, lines, subtotal)
  if (evaluation.discount <= 0) return { applied: best, codeValid: false, codeMessage: evaluation.reason }
  if (best && best.discount >= evaluation.discount) {
    return {
      applied: best,
      codeValid: true,
      codeMessage: `Code accepted, but "${best.promotion.name}" saves you more, so we applied that instead.`,
    }
  }
  return { applied: { promotion: promo, discount: evaluation.discount }, codeValid: true }
}
