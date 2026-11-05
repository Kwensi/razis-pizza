import { describe, expect, it } from 'vitest'
import { defaultCatalog } from '../data/catalog'
import { addOrMergeLine, computeTotals, deliveryFee, replaceLine, updateQuantity } from './cart'
import { formatMoney, priceLine, startingPrice, toMinor, validateSelection } from './pricing'
import { selectPromotion } from './promotions'
import type { CartLine, Catalog, PizzaSelection } from './types'

const cat = defaultCatalog
const pizza = (productId: string, sel: Partial<PizzaSelection> = {}, quantity = 1, notes = ''): CartLine => ({
  lineId: Math.random().toString(36),
  productId,
  quantity,
  notes,
  pizza: { sizeId: 'M', crustId: 'regular', addedToppings: [], removedToppings: [], cheese: 'regular', ...sel },
})
const simple = (productId: string, variantId: string, quantity = 1): CartLine => ({ lineId: Math.random().toString(36), productId, variantId, quantity, notes: '' })
const NOW = new Date('2026-11-05T12:00:00Z')

describe('pizza price calculation', () => {
  it('prices a base pizza by size', () => {
    expect(priceLine(cat, pizza('pepperoni', { sizeId: 'S' })).unitPrice).toBe(7500)
    expect(priceLine(cat, pizza('pepperoni', { sizeId: 'L' })).unitPrice).toBe(13500)
    expect(priceLine(cat, pizza('pepperoni', { sizeId: 'XL' })).unitPrice).toBe(17000)
  })

  it('adds crust surcharges per size', () => {
    expect(priceLine(cat, pizza('margherita', { sizeId: 'M', crustId: 'stuffed' })).unitPrice).toBe(9000 + 1800)
    expect(priceLine(cat, pizza('margherita', { sizeId: 'XL', crustId: 'thick' })).unitPrice).toBe(15000 + 1000)
  })

  it('rejects a crust that is not offered in the chosen size', () => {
    const p = priceLine(cat, pizza('margherita', { sizeId: 'S', crustId: 'stuffed' }))
    expect(p.errors).toContain('That crust is not available in this size.')
    expect(p.lineTotal).toBe(0)
  })

  it('rejects unknown sizes and products', () => {
    expect(validateSelection(cat, pizza('pepperoni', { sizeId: 'XXL' as never }))).toContain('Please choose an available size.')
    expect(validateSelection(cat, pizza('nope'))).toEqual(['This item is no longer on the menu.'])
  })

  it('computes the full customised example correctly', () => {
    // Large pepperoni, thin crust, + mushrooms + olives, extra cheese, ×2
    const line = pizza('pepperoni', { sizeId: 'L', crustId: 'thin', addedToppings: ['mushrooms', 'olives'], cheese: 'extra' }, 2)
    const p = priceLine(cat, line)
    expect(p.errors).toEqual([])
    expect(p.unitPrice).toBe(13500 + 1000 + 1000 + 1200)
    expect(p.lineTotal).toBe(33400)
    expect(p.details).toEqual(['Large (14″)', 'Thin crust', 'Add Mushrooms, Olives', 'Extra cheese'])
  })

  it('shows starting prices from the cheapest size or variant', () => {
    expect(startingPrice(cat, cat.products.find((p) => p.id === 'margherita')!)).toBe(6500)
    expect(startingPrice(cat, cat.products.find((p) => p.id === 'wings')!)).toBe(5500)
  })

  it('formats money in the configured currency', () => {
    expect(formatMoney(16700, cat.settings.currency)).toBe('GH₵167')
    expect(formatMoney(3340, cat.settings.currency)).toBe('GH₵33.40')
    expect(formatMoney(1250, { code: 'USD', symbol: '$', locale: 'en-US' })).toBe('$12.50')
    expect(toMinor(0.1 + 0.2)).toBe(30)
  })
})

describe('topping charges', () => {
  it('charges added toppings at the size price', () => {
    expect(priceLine(cat, pizza('margherita', { sizeId: 'S', addedToppings: ['chicken'] })).unitPrice).toBe(6500 + 1000)
    expect(priceLine(cat, pizza('margherita', { sizeId: 'XL', addedToppings: ['chicken', 'onions'] })).unitPrice).toBe(15000 + 1800 + 1200)
  })

  it('removing an included topping is free and listed', () => {
    const p = priceLine(cat, pizza('pepperoni', { removedToppings: ['pepperoni'] }))
    expect(p.unitPrice).toBe(10500)
    expect(p.details).toContain('No Pepperoni')
  })

  it('prices extra and double cheese', () => {
    expect(priceLine(cat, pizza('margherita', { sizeId: 'XL', cheese: 'double' })).unitPrice).toBe(15000 + 3000)
    expect(priceLine(cat, pizza('margherita', { cheese: 'light' })).unitPrice).toBe(9000)
  })

  it('blocks invalid topping selections', () => {
    expect(validateSelection(cat, pizza('pepperoni', { addedToppings: ['pepperoni'] }))).toContain('That topping is already included.')
    expect(validateSelection(cat, pizza('margherita', { addedToppings: ['olives', 'olives'] }))).toContain('A topping was added twice.')
    expect(validateSelection(cat, pizza('margherita', { removedToppings: ['olives'] }))).toContain('Only included toppings can be removed.')
    expect(validateSelection(cat, pizza('margherita', { addedToppings: ['unicorn'] }))).toContain('A selected topping is unavailable.')
    expect(validateSelection(cat, pizza('margherita', { addedToppings: ['extra-cheese'] }))).toContain('Use the cheese options to add extra cheese.')
  })

  it('enforces the maximum topping count', () => {
    const five = ['mushrooms', 'onions', 'green-peppers', 'olives', 'jalapenos']
    expect(validateSelection(cat, pizza('meat-feast', { addedToppings: five }))).toContain('Maximum 8 toppings per pizza.')
    expect(validateSelection(cat, pizza('meat-feast', { addedToppings: five, removedToppings: ['beef'] }))).toEqual([])
  })

  it('respects topping prices changed by the restaurant', () => {
    const edited: Catalog = { ...cat, toppings: cat.toppings.map((t) => (t.id === 'olives' ? { ...t, prices: { ...t.prices, M: 11.5 } } : t)) }
    expect(priceLine(edited, pizza('margherita', { addedToppings: ['olives'] })).unitPrice).toBe(9000 + 1150)
  })
})

describe('cart calculations', () => {
  it('merges identical items and keeps different customisations separate', () => {
    let lines: CartLine[] = []
    const { lineId: _a, ...a } = pizza('pepperoni', { addedToppings: ['olives', 'onions'] })
    const { lineId: _b, ...b } = pizza('pepperoni', { addedToppings: ['onions', 'olives'] }, 2)
    const { lineId: _c, ...c } = pizza('pepperoni', { addedToppings: ['onions'] })
    lines = addOrMergeLine(lines, a, 20)
    lines = addOrMergeLine(lines, b, 20)
    lines = addOrMergeLine(lines, c, 20)
    expect(lines).toHaveLength(2)
    expect(lines[0].quantity).toBe(3)
  })

  it('caps quantity and removes lines set to zero', () => {
    let lines = addOrMergeLine([], { productId: 'fries', variantId: 'reg', quantity: 1, notes: '' }, 20)
    lines = updateQuantity(lines, lines[0].lineId, 99, 20)
    expect(lines[0].quantity).toBe(20)
    expect(updateQuantity(lines, lines[0].lineId, 0, 20)).toHaveLength(0)
  })

  it('replaces a line when editing and keeps its position', () => {
    const lines = [pizza('margherita'), simple('fries', 'reg')]
    const { lineId: _x, ...edited } = pizza('margherita', { sizeId: 'L' })
    const next = replaceLine(lines, lines[0].lineId, edited, 20)
    expect(next[0].pizza?.sizeId).toBe('L')
    expect(next[0].lineId).toBe(lines[0].lineId)
    expect(next).toHaveLength(2)
  })

  it('totals subtotal, delivery and total', () => {
    const lines = [pizza('pepperoni', { sizeId: 'L', crustId: 'thin', addedToppings: ['mushrooms', 'olives'], cheese: 'extra' }, 2)]
    const t = computeTotals(cat, lines, { orderType: 'delivery', zoneId: 'kpone', promoCode: '', now: NOW })
    expect(t.subtotal).toBe(33400)
    expect(t.discount).toBe(0)
    expect(t.delivery.fee).toBe(1500)
    expect(t.total).toBe(34900)
    expect(t.itemCount).toBe(2)
    expect(t.errors).toEqual([])
  })

  it('flags an empty cart and the minimum order', () => {
    expect(computeTotals(cat, [], { orderType: 'pickup', zoneId: '', promoCode: '' }).errors).toContain('Your cart is empty.')
    expect(computeTotals(cat, [simple('lemonade', '400')], { orderType: 'pickup', zoneId: '', promoCode: '' }).errors).toContain('Minimum order is GH₵40.')
  })

  it('never trusts a tampered line: invalid lines cost nothing and block checkout', () => {
    const t = computeTotals(cat, [pizza('pepperoni', { sizeId: 'S', crustId: 'stuffed' }, 3)], { orderType: 'pickup', zoneId: '', promoCode: '' })
    expect(t.subtotal).toBe(0)
    expect(t.errors).toContain('Some items in your cart need attention.')
  })

  it('applies exclusive and inclusive tax', () => {
    const lines = [simple('wings', '12')] // 95
    const excl: Catalog = { ...cat, settings: { ...cat.settings, tax: { enabled: true, label: 'VAT', ratePercent: 10, inclusive: false } } }
    const tx = computeTotals(excl, lines, { orderType: 'pickup', zoneId: '', promoCode: '' })
    expect(tx.tax).toBe(950)
    expect(tx.total).toBe(9500 + 950)
    const incl: Catalog = { ...cat, settings: { ...cat.settings, tax: { enabled: true, label: 'VAT', ratePercent: 15, inclusive: true } } }
    const ti = computeTotals(incl, [simple('wings', '12'), simple('lemonade', '400', 0 + 1)], { orderType: 'pickup', zoneId: '', promoCode: '' })
    expect(ti.subtotal).toBe(12000)
    expect(ti.tax).toBe(Math.round((12000 * 15) / 115))
    expect(ti.total).toBe(12000)
  })
})

describe('discount calculations', () => {
  const totals = (lines: CartLine[], promoCode: string, now = NOW) => computeTotals(cat, lines, { orderType: 'pickup', zoneId: '', promoCode, now })

  it('percentage code with minimum and cap', () => {
    const t = totals([pizza('pepperoni', { sizeId: 'L', crustId: 'thin', addedToppings: ['mushrooms', 'olives'], cheese: 'extra' }, 2)], 'welcome10')
    expect(t.discount).toBe(3340)
    expect(t.total).toBe(33400 - 3340)
    expect(totals([pizza('meat-feast', { sizeId: 'XL' }, 3)], 'WELCOME10').discount).toBe(5000) // 10% of 600 capped at 50
    const small = totals([pizza('margherita', { sizeId: 'S' })], 'WELCOME10')
    expect(small.discount).toBe(0)
    expect(small.promoMessage).toMatch(/Add GH₵15 more/)
  })

  it('fixed amount code respects minimum order', () => {
    expect(totals([pizza('meat-feast', { sizeId: 'XL' }, 2)], 'PARTY25').discount).toBe(2500)
    expect(totals([pizza('meat-feast', { sizeId: 'XL' })], 'PARTY25').discount).toBe(0)
  })

  it('buy one get one free makes the cheaper of each pair free', () => {
    const lines = [pizza('pepperoni', { sizeId: 'L' }), pizza('pepperoni', { sizeId: 'M' }), pizza('margherita', { sizeId: 'M' })]
    expect(totals(lines, '2FOR1').discount).toBe(10500) // 135, 105, 90 -> 105 free
    expect(totals([pizza('pepperoni', {}, 4)], '2FOR1').discount).toBe(2 * 10500)
    expect(totals([pizza('pepperoni'), simple('fries', 'reg')], '2FOR1').discount).toBe(0)
  })

  it('applies the combo automatically per complete combo', () => {
    const one = [pizza('pepperoni'), simple('garlic-bread', 'reg'), simple('lemonade', '400')]
    const t = totals(one, '')
    expect(t.discount).toBe(2000)
    expect(t.promotion?.id).toBe('family-combo')
    const two = [pizza('pepperoni', {}, 2), simple('garlic-bread', 'reg', 2), simple('lemonade', '400', 3)]
    expect(totals(two, '').discount).toBe(4000)
  })

  it('uses whichever single promotion saves the customer more', () => {
    const lines = [pizza('pepperoni'), simple('garlic-bread', 'reg'), simple('lemonade', '400')] // 165, combo = 20
    const withWelcome = totals(lines, 'WELCOME10') // 16.50 < 20
    expect(withWelcome.discount).toBe(2000)
    expect(withWelcome.promoMessage).toMatch(/saves you more/)
    const withBogo = totals([...lines, pizza('pepperoni')], '2FOR1') // bogo 105 > combo 20
    expect(withBogo.discount).toBe(10500)
    expect(withBogo.promotion?.id).toBe('two-for-one')
  })

  it('handles limited-time and unknown codes', () => {
    const lines = [pizza('meat-feast', { sizeId: 'XL' })]
    expect(totals(lines, 'FESTIVE15').promoMessage).toBe('That promo code is not active yet.')
    expect(totals(lines, 'FESTIVE15', new Date('2026-12-10T12:00:00Z')).discount).toBe(3000)
    expect(totals([pizza('meat-feast', { sizeId: 'XL' }, 2)], 'PARTY25', new Date('2027-01-02T00:00:00Z')).promoMessage).toBe('That promo code has expired.')
    expect(totals(lines, 'FREEPIZZA').promoMessage).toBe('That promo code is not recognised.')
  })

  it('never discounts more than the subtotal', () => {
    const big: Catalog = { ...cat, promotions: [{ id: 'x', name: 'X', description: '', type: 'fixed', value: 1000, code: 'BIG', active: true }] }
    const r = selectPromotion(big, [priceLine(big, simple('fries', 'reg'))], 2500, 'BIG', NOW)
    expect(r.applied?.discount).toBe(2500)
  })

  it('ignores disabled promotions', () => {
    const off: Catalog = { ...cat, promotions: cat.promotions.map((p) => ({ ...p, active: false })) }
    expect(computeTotals(off, [pizza('pepperoni'), simple('garlic-bread', 'reg'), simple('lemonade', '400')], { orderType: 'pickup', zoneId: '', promoCode: '' }).discount).toBe(0)
  })
})

describe('delivery fees', () => {
  it('charges the zone fee and nothing for pickup', () => {
    expect(deliveryFee(cat, 'delivery', 'community-25', 10000).fee).toBe(2000)
    expect(deliveryFee(cat, 'pickup', 'community-25', 10000).fee).toBe(0)
  })
  it('requires a valid, active zone', () => {
    expect(deliveryFee(cat, 'delivery', '', 10000).error).toBe('Choose your delivery area.')
    expect(deliveryFee(cat, 'delivery', 'prampram', 50000).error).toMatch(/not delivering to Prampram/)
  })
  it('enforces zone minimum orders', () => {
    expect(deliveryFee(cat, 'delivery', 'afienya', 8500).error).toMatch(/Minimum order for delivery to Afienya/)
    expect(deliveryFee(cat, 'delivery', 'afienya', 10000).fee).toBe(3500)
  })
  it('gives free delivery over the threshold (after discounts)', () => {
    const q = deliveryFee(cat, 'delivery', 'kpone', 40000)
    expect(q.fee).toBe(0)
    expect(q.freeApplied).toBe(true)
    expect(deliveryFee(cat, 'delivery', 'kpone', 39999).fee).toBe(1500)
  })
})
