/**
 * WhatsApp ordering: order references, the order message, the official
 * click-to-chat URL (https://wa.me/<number>?text=<urlencoded>), a compact
 * staff-import payload and duplicate-submission protection.
 */
import { formatMoney } from './pricing'
import { formatPhone } from './validation'
import type { CartLine, Catalog, CustomerDetails, Order } from './types'

const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // no 0/O/1/I/L

export function generateOrderRef(now: Date, prefix = 'PZ', random: () => number = secureRandom): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  let tail = ''
  for (let i = 0; i < 5; i++) tail += REF_ALPHABET[Math.floor(random() * REF_ALPHABET.length)]
  return `${prefix}-${yy}${mm}${dd}-${tail}`
}

function secureRandom(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

export function refPrefix(name: string): string {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase().replace(/[^A-Z]/g, '')
  return letters.length >= 1 ? letters : 'PZ'
}

export function whatsappUrl(number: string, text: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

const PAYMENT_NOTE = 'not yet paid — awaiting confirmation'

export function buildOrderMessage(order: Order, catalog: Catalog, importLink?: string): string {
  const s = catalog.settings
  const cur = s.currency
  const m = (v: number) => formatMoney(v, cur)
  const c = order.customer
  const zone = s.deliveryZones.find((z) => z.id === c.zoneId)
  const when = new Date(order.createdAt).toLocaleString(cur.locale || 'en', {
    timeZone: s.timezone,
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  const out: string[] = []
  out.push(`*NEW ORDER — ${s.name}*`, `Ref: *${order.ref}*`, `Placed: ${when}`, '')
  out.push('*Customer*', `Name: ${c.name}`, `Phone: ${formatPhone(c.phone)}`, '')
  if (c.orderType === 'delivery') {
    out.push('*Order type: DELIVERY*', `Area: ${zone?.name ?? c.zoneId}`, `Address: ${c.address}`)
    if (c.landmark) out.push(`Landmark: ${c.landmark}`)
  } else {
    out.push('*Order type: PICKUP*', `Collect from: ${s.address}, ${s.city}`)
  }
  out.push('', '*Items*')
  order.lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.quantity} × ${l.name} — ${m(l.lineTotal)}`)
    for (const d of l.details) out.push(`   • ${d}`)
  })
  out.push('', `Subtotal: ${m(order.totals.subtotal)}`)
  if (order.totals.discount > 0) out.push(`Discount${order.totals.promotionName ? ` (${order.totals.promotionName})` : ''}: −${m(order.totals.discount)}`)
  if (c.orderType === 'delivery') out.push(`Delivery: ${order.totals.delivery > 0 ? m(order.totals.delivery) : 'FREE'}`)
  if (s.tax.enabled && order.totals.tax > 0)
    out.push(`${s.tax.label}${s.tax.inclusive ? ' (included)' : ''}: ${m(order.totals.tax)}`)
  out.push(`*TOTAL: ${m(order.totals.total)}*`, '')
  const method = c.paymentMethod ? s.payments[c.paymentMethod].label : '—'
  out.push(`*Payment:* ${method} (${PAYMENT_NOTE})`)
  if (c.promoCode) out.push(`Promo code entered: ${c.promoCode}`)
  if (c.instructions) out.push(`*Instructions:* ${c.instructions}`)
  out.push('', 'Please confirm you have received this order, item availability and the final total. Thank you!')
  if (importLink) out.push('', `(Staff: tap to add to dashboard) ${importLink}`)
  return out.join('\n')
}

// ---------- staff import payload (no prices: the dashboard re-prices from its own menu) ----------

type PayloadLine = [string, number, string | null, string | null, string | null, string[], string[], string | null, string]

interface Payload {
  v: 1
  r: string
  t: string
  c: [string, string, string, string, string, string, string, string, string]
  l: PayloadLine[]
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)))
}

export function encodeOrderPayload(ref: string, createdAt: string, c: CustomerDetails, lines: CartLine[]): string {
  const p: Payload = {
    v: 1,
    r: ref,
    t: createdAt,
    c: [c.name, c.phone, c.orderType, c.zoneId, c.address, c.landmark, c.instructions, c.paymentMethod, c.promoCode],
    l: lines.map((l) => [
      l.productId, l.quantity, l.variantId ?? null,
      l.pizza?.sizeId ?? null, l.pizza?.crustId ?? null,
      l.pizza?.addedToppings ?? [], l.pizza?.removedToppings ?? [], l.pizza?.cheese ?? null, l.notes ?? '',
    ]),
  }
  return b64urlEncode(JSON.stringify(p))
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '')
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 30) as string[] : [])

/** Decode and structurally validate a payload. Returns null for anything malformed. */
export function decodeOrderPayload(encoded: string): { ref: string; createdAt: string; customer: CustomerDetails; lines: CartLine[] } | null {
  try {
    if (!encoded || encoded.length > 20000) return null
    const p = JSON.parse(b64urlDecode(encoded)) as Payload
    if (p?.v !== 1 || !Array.isArray(p.c) || !Array.isArray(p.l) || p.l.length > 100) return null
    if (!/^[A-Z]{1,3}-\d{6}-[A-Z0-9]{4,6}$/.test(str(p.r))) return null
    if (Number.isNaN(Date.parse(str(p.t)))) return null
    const [name, phone, orderType, zoneId, address, landmark, instructions, paymentMethod, promoCode] = p.c
    const customer: CustomerDetails = {
      name: str(name), phone: str(phone), orderType: orderType === 'delivery' ? 'delivery' : 'pickup',
      zoneId: str(zoneId), address: str(address), landmark: str(landmark), instructions: str(instructions),
      paymentMethod: (['cash_pickup', 'cash_delivery', 'momo', 'bank'].includes(str(paymentMethod)) ? paymentMethod : '') as CustomerDetails['paymentMethod'],
      promoCode: str(promoCode, 30),
    }
    const lines: CartLine[] = p.l.map((l, i) => {
      const qty = Number(l[1])
      const line: CartLine = { lineId: `imp-${i}`, productId: str(l[0], 80), quantity: Number.isInteger(qty) ? qty : 0, notes: str(l[8], 200) }
      if (l[2]) line.variantId = str(l[2], 40)
      if (l[3]) line.pizza = {
        sizeId: str(l[3], 3) as never, crustId: str(l[4], 40),
        addedToppings: strArr(l[5]), removedToppings: strArr(l[6]), cheese: (str(l[7], 10) || 'regular') as never,
      }
      return line
    })
    return { ref: str(p.r), createdAt: str(p.t), customer, lines }
  } catch {
    return null
  }
}

// ---------- duplicate-submission guard ----------

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Stable fingerprint of what is being ordered, by whom. */
export function orderFingerprint(lines: CartLine[], c: CustomerDetails): string {
  const key = JSON.stringify([
    lines.map((l) => [l.productId, l.quantity, l.variantId, l.pizza, l.notes]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    c.phone.replace(/\D/g, ''), c.orderType, c.zoneId, c.address.trim().toLowerCase(),
  ])
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0
  return h.toString(36)
}

export type GuardResult = { status: 'ok' } | { status: 'in-flight' } | { status: 'duplicate'; ref: string; at: number }

export function createSubmitGuard(store: KeyValueStore, windowMs = 10 * 60 * 1000, storageKey = 'pz.lastSubmission') {
  let inFlight = false
  return {
    begin(fp: string, now = Date.now()): GuardResult {
      if (inFlight) return { status: 'in-flight' }
      try {
        const last = JSON.parse(store.getItem(storageKey) ?? 'null') as { fp: string; ref: string; at: number } | null
        if (last && last.fp === fp && now - last.at < windowMs) return { status: 'duplicate', ref: last.ref, at: last.at }
      } catch {
        /* corrupted entry — ignore */
      }
      inFlight = true
      return { status: 'ok' }
    },
    complete(fp: string, ref: string, now = Date.now()) {
      inFlight = false
      try { store.setItem(storageKey, JSON.stringify({ fp, ref, at: now })) } catch { /* storage full or blocked */ }
    },
    fail() {
      inFlight = false
    },
  }
}
