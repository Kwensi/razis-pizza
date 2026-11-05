import { describe, expect, it } from 'vitest'
import { defaultCatalog as cat } from '../data/catalog'
import { openStatus } from './hours'
import { buildOrder, getOrder, listOrders, orderStats, saveOrder, setOrderStatus } from './orders'
import { normalisePhone, sanitizeText, validateCheckout } from './validation'
import {
  buildOrderMessage, createSubmitGuard, decodeOrderPayload, encodeOrderPayload, generateOrderRef, orderFingerprint, whatsappUrl,
} from './whatsapp'
import type { CartLine, CustomerDetails } from './types'

const customer = (over: Partial<CustomerDetails> = {}): CustomerDetails => ({
  name: 'Ama Mensah', phone: '024 123 4567', orderType: 'delivery', zoneId: 'osu', address: 'House 12, Mango Tree Lane',
  landmark: 'Opposite the blue church', instructions: 'Gate #4 & blue door', paymentMethod: 'momo', promoCode: '', ...over,
})
const lines: CartLine[] = [
  { lineId: 'a', productId: 'pepperoni', quantity: 2, notes: 'Well done please',
    pizza: { sizeId: 'L', crustId: 'thin', addedToppings: ['mushrooms', 'olives'], removedToppings: [], cheese: 'extra' } },
  { lineId: 'b', productId: 'garlic-bread', quantity: 1, notes: '', variantId: 'reg' },
]
const NOW = new Date('2026-11-05T12:00:00Z')

describe('phone validation', () => {
  it.each([
    ['024 123 4567', '233241234567'],
    ['0241234567', '233241234567'],
    ['+233 24 123 4567', '233241234567'],
    ['+233 024 123 4567', '233241234567'],
    ['00233241234567', '233241234567'],
    ['24-123-4567', '233241234567'],
    ['+1 (415) 555-0100', '14155550100'],
  ])('accepts %s', (input, expected) => expect(normalisePhone(input, '233', 9)).toBe(expected))

  it.each(['', '12345', 'call me', '024123456', '02412345678', '+233 24 123', '+12'])('rejects %s', (input) =>
    expect(normalisePhone(input, '233', 9)).toBeNull())

  it('supports US-style configuration', () => {
    expect(normalisePhone('(415) 555-0100', '1', 10)).toBe('14155550100')
  })
})

describe('checkout validation', () => {
  it('accepts a complete delivery order', () => {
    expect(validateCheckout(cat, customer())).toEqual({})
  })
  it('reports every missing field', () => {
    const e = validateCheckout(cat, customer({ name: '', phone: '', zoneId: '', address: '', paymentMethod: '' }))
    expect(Object.keys(e).sort()).toEqual(['address', 'name', 'paymentMethod', 'phone', 'zoneId'])
  })
  it('does not require an address for pickup', () => {
    expect(validateCheckout(cat, customer({ orderType: 'pickup', zoneId: '', address: '', paymentMethod: 'cash_pickup' }))).toEqual({})
  })
  it('rejects payment methods that do not match the order type', () => {
    expect(validateCheckout(cat, customer({ paymentMethod: 'cash_pickup' })).paymentMethod).toBeDefined()
    expect(validateCheckout(cat, customer({ orderType: 'pickup', paymentMethod: 'cash_delivery' })).paymentMethod).toBeDefined()
    expect(validateCheckout(cat, customer({ paymentMethod: 'bank' })).paymentMethod).toBeDefined() // bank disabled in demo
  })
  it('rejects inactive zones, odd names and long text', () => {
    expect(validateCheckout(cat, customer({ zoneId: 'tema' })).zoneId).toMatch(/Tema/)
    expect(validateCheckout(cat, customer({ name: '<script>alert(1)</script>' })).name).toBeDefined()
    expect(validateCheckout(cat, customer({ instructions: 'x'.repeat(301) })).instructions).toBeDefined()
  })
  it('sanitises control characters and whitespace', () => {
    expect(sanitizeText('  Ama\u0000   Mensah\u0007 ', 60)).toBe('Ama Mensah')
    expect(sanitizeText('line1\n\n\n\nline2', 100, true)).toBe('line1\n\nline2')
  })
})

describe('WhatsApp message generation', () => {
  const ref = 'FP-261105-ABCDE'
  const { order, errors } = buildOrder(cat, lines, customer(), ref, NOW)
  const message = buildOrderMessage(order, cat)

  it('builds a valid order from trusted prices', () => {
    expect(errors).toEqual([])
    expect(order.totals.subtotal).toBe(33400 + 3500)
    expect(order.totals.delivery).toBe(1500)
    expect(order.totals.total).toBe(33400 + 3500 + 1500)
    expect(order.customer.phone).toBe('233241234567')
    expect(order.status).toBe('new')
  })

  it('includes every required detail', () => {
    for (const s of [
      'NEW ORDER — Fornello Pizza Co.', `Ref: *${ref}*`, 'Name: Ama Mensah', 'Phone: +233241234567',
      'Order type: DELIVERY', 'Area: Osu', 'Address: House 12, Mango Tree Lane', 'Landmark: Opposite the blue church',
      '1. 2 × Pepperoni — GH₵334', '• Large (14″)', '• Thin crust', '• Add Mushrooms, Olives', '• Extra cheese', '• Note: Well done please',
      '2. 1 × Cheesy Garlic Bread — GH₵35', '• 6 pieces', 'Subtotal: GH₵369', 'Delivery: GH₵15', '*TOTAL: GH₵384*',
      'Payment:* Mobile Money (not yet paid — awaiting confirmation)', 'Instructions:* Gate #4 & blue door', 'Please confirm',
    ]) expect(message).toContain(s)
  })

  it('shows pickup details for pickup orders', () => {
    const p = buildOrder(cat, lines, customer({ orderType: 'pickup', paymentMethod: 'cash_pickup' }), ref, NOW).order
    const msg = buildOrderMessage(p, cat)
    expect(msg).toContain('Order type: PICKUP')
    expect(msg).toContain('Collect from: 14 Oxford Street, Osu, Accra')
    expect(msg).not.toContain('Delivery:')
  })

  it('URL-encodes the message into the official click-to-chat URL', () => {
    const url = whatsappUrl('+233 20 000 0000', message)
    expect(url.startsWith('https://wa.me/233200000000?text=')).toBe(true)
    const text = url.split('?text=')[1]
    expect(text).not.toMatch(/[ #&\n]/)
    expect(decodeURIComponent(text)).toBe(message)
    expect(new URL(url).searchParams.get('text')).toBe(message)
  })

  it('generates readable unique-looking references', () => {
    let i = 0
    const seq = [0.1, 0.5, 0.9, 0.3, 0.7]
    const r = generateOrderRef(new Date(2026, 10, 5), 'FP', () => seq[i++ % seq.length])
    expect(r).toMatch(/^FP-261105-[2-9A-HJKMNP-Z]{5}$/)
    expect(generateOrderRef(NOW, 'FP')).not.toBe(generateOrderRef(NOW, 'FP'))
  })

  it('round-trips the staff import payload without prices', () => {
    const encoded = encodeOrderPayload(ref, NOW.toISOString(), order.customer, lines)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    const decoded = decodeOrderPayload(encoded)!
    expect(decoded.ref).toBe(ref)
    expect(decoded.customer.name).toBe('Ama Mensah')
    expect(decoded.lines[0].pizza?.addedToppings).toEqual(['mushrooms', 'olives'])
    // re-pricing the decoded order on the restaurant side gives the same total
    expect(buildOrder(cat, decoded.lines, decoded.customer, ref, NOW).order.totals.total).toBe(order.totals.total)
  })

  it('rejects malformed or tampered payloads', () => {
    expect(decodeOrderPayload('not-base64!!')).toBeNull()
    expect(decodeOrderPayload(btoa(JSON.stringify({ v: 2 })))).toBeNull()
    expect(decodeOrderPayload(btoa(JSON.stringify({ v: 1, r: 'DROP TABLE', t: 'x', c: [], l: [] })))).toBeNull()
  })
})

describe('duplicate submissions', () => {
  const memory = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
  }

  it('blocks double taps while a submission is in flight', () => {
    const g = createSubmitGuard(memory())
    expect(g.begin('fp', 0).status).toBe('ok')
    expect(g.begin('fp', 10).status).toBe('in-flight')
  })

  it('detects re-sending the same order within the window', () => {
    const g = createSubmitGuard(memory(), 60_000)
    g.begin('fp', 0)
    g.complete('fp', 'FP-1', 0)
    expect(g.begin('fp', 30_000)).toEqual({ status: 'duplicate', ref: 'FP-1', at: 0 })
    expect(g.begin('other', 30_000).status).toBe('ok')
  })

  it('allows the same order again after the window or after a failure', () => {
    const g = createSubmitGuard(memory(), 60_000)
    g.begin('fp', 0)
    g.complete('fp', 'FP-1', 0)
    expect(g.begin('fp', 61_000).status).toBe('ok')
    g.fail()
    expect(g.begin('fp2', 61_001).status).toBe('ok')
  })

  it('fingerprints ignore line order and phone formatting', () => {
    const a = orderFingerprint(lines, customer())
    const b = orderFingerprint([...lines].reverse(), customer({ phone: '0241234567' }))
    expect(a).toBe(b)
    expect(orderFingerprint(lines, customer({ zoneId: 'labone' }))).not.toBe(a)
  })
})

describe('order storage and stats', () => {
  it('saves, lists and updates orders in IndexedDB', async () => {
    const { order } = buildOrder(cat, lines, customer(), 'FP-261105-ZZZZZ', NOW)
    await saveOrder(order)
    expect((await getOrder('FP-261105-ZZZZZ'))?.totals.total).toBe(order.totals.total)
    const updated = await setOrderStatus('FP-261105-ZZZZZ', 'preparing')
    expect(updated?.status).toBe('preparing')
    expect(updated?.statusHistory.map((h) => h.status)).toEqual(['new', 'preparing'])
    expect((await listOrders()).length).toBeGreaterThan(0)
  })

  it('computes dashboard statistics excluding cancelled orders', () => {
    const a = buildOrder(cat, lines, customer(), 'A', NOW).order
    const b = { ...buildOrder(cat, lines, customer(), 'B', NOW).order, status: 'cancelled' as const }
    const s = orderStats([a, b], new Date('2026-11-05T18:00:00Z'))
    expect(s.totalOrders).toBe(1)
    expect(s.today).toBe(a.totals.total)
    expect(s.averageOrder).toBe(a.totals.total)
    expect(s.bestSellers[0]).toMatchObject({ name: 'Pepperoni', quantity: 2 })
  })
})

describe('opening hours', () => {
  const tz = 'Africa/Accra' // UTC+0
  it('reports open and closed states', () => {
    expect(openStatus(cat.settings.hours, new Date('2026-11-05T12:00:00Z'), tz)).toEqual({ open: true, label: 'Open until 23:00' })
    expect(openStatus(cat.settings.hours, new Date('2026-11-05T10:00:00Z'), tz).label).toBe('Closed · opens today at 11:00')
    expect(openStatus(cat.settings.hours, new Date('2026-11-07T23:30:00Z'), tz).label).toBe('Open until midnight')
    expect(openStatus(cat.settings.hours, new Date('2026-11-08T00:30:00Z'), tz).label).toBe('Closed · opens today at 12:00')
  })
  it('handles opening hours that run past midnight', () => {
    const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '18:00', close: '02:00', closed: false }))
    expect(openStatus(hours, new Date('2026-11-08T01:00:00Z'), tz).open).toBe(true)
    expect(openStatus(hours, new Date('2026-11-08T03:00:00Z'), tz).label).toBe('Closed · opens today at 18:00')
  })
})
