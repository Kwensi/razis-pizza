/**
 * Order snapshots + local order storage (IndexedDB via idb-keyval).
 *
 * DEMO MODE: orders live in the browser that created or imported them. A
 * customer's phone and the restaurant's tablet do NOT share this database.
 * See docs/PRODUCTION.md for the Supabase-backed multi-device setup.
 */
import { createStore, del, entries, get, set, clear } from 'idb-keyval'
import { computeTotals } from './cart'
import { sanitizeCustomer } from './validation'
import type { CartLine, Catalog, CustomerDetails, Order, OrderStatus } from './types'

export const ORDER_STATUSES: { id: OrderStatus; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready for pickup' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]
export const statusLabel = (s: OrderStatus) => ORDER_STATUSES.find((x) => x.id === s)?.label ?? s

/** Build an order snapshot. Prices are recalculated from `catalog`; nothing from the client is trusted. */
export function buildOrder(
  catalog: Catalog,
  lines: CartLine[],
  customer: CustomerDetails,
  ref: string,
  createdAt: Date,
  source: Order['source'] = 'this-device',
): { order: Order; errors: string[] } {
  const clean = sanitizeCustomer(catalog, customer)
  const totals = computeTotals(catalog, lines, { orderType: clean.orderType, zoneId: clean.zoneId, promoCode: clean.promoCode, now: createdAt })
  const at = createdAt.toISOString()
  const order: Order = {
    ref,
    createdAt: at,
    status: 'new',
    source,
    customer: clean,
    lines: totals.priced.map((p) => ({
      productId: p.line.productId,
      name: p.name,
      quantity: p.line.quantity,
      unitPrice: p.unitPrice,
      lineTotal: p.lineTotal,
      details: p.details,
      notes: p.line.notes,
    })),
    totals: {
      subtotal: totals.subtotal,
      discount: totals.discount,
      delivery: totals.delivery.fee,
      tax: totals.tax,
      total: totals.total,
      promotionName: totals.promotion?.name,
    },
    currency: catalog.settings.currency.code,
    message: '',
    statusHistory: [{ status: 'new', at }],
  }
  const lineErrors = totals.priced.flatMap((p) => p.errors.map((e) => `${p.name}: ${e}`))
  return { order, errors: [...totals.errors, ...lineErrors] }
}

// ---------- persistence ----------

let store: ReturnType<typeof createStore> | undefined
const db = () => (store ??= createStore('pizza-pwa', 'orders'))

export async function saveOrder(order: Order): Promise<void> {
  await set(order.ref, order, db())
}
export async function getOrder(ref: string): Promise<Order | undefined> {
  return get<Order>(ref, db())
}
export async function listOrders(): Promise<Order[]> {
  const all = await entries<string, Order>(db())
  return all.map(([, o]) => o).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export async function deleteOrder(ref: string): Promise<void> {
  await del(ref, db())
}
export async function clearOrders(): Promise<void> {
  await clear(db())
}
export async function setOrderStatus(ref: string, status: OrderStatus): Promise<Order | undefined> {
  const o = await getOrder(ref)
  if (!o) return undefined
  const next: Order = { ...o, status, statusHistory: [...o.statusHistory, { status, at: new Date().toISOString() }] }
  await saveOrder(next)
  return next
}

// ---------- dashboard statistics ----------

export interface OrderStats {
  totalOrders: number
  today: number
  week: number
  month: number
  averageOrder: number
  bestSellers: { name: string; quantity: number; revenue: number }[]
  last7Days: { label: string; total: number }[]
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function orderStats(orders: Order[], now: Date): OrderStats {
  const counted = orders.filter((o) => o.status !== 'cancelled')
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startWeek = new Date(startToday)
  startWeek.setDate(startWeek.getDate() - 6)
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const sumSince = (from: Date) =>
    counted.filter((o) => new Date(o.createdAt) >= from && new Date(o.createdAt) <= now).reduce((s, o) => s + o.totals.total, 0)

  const sellers = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const o of counted)
    for (const l of o.lines) {
      const cur = sellers.get(l.productId) ?? { name: l.name, quantity: 0, revenue: 0 }
      cur.quantity += l.quantity
      cur.revenue += l.lineTotal
      sellers.set(l.productId, cur)
    }

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startWeek)
    d.setDate(d.getDate() + i)
    const total = counted.filter((o) => dayKey(new Date(o.createdAt)) === dayKey(d)).reduce((s, o) => s + o.totals.total, 0)
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), total }
  })

  return {
    totalOrders: counted.length,
    today: sumSince(startToday),
    week: sumSince(startWeek),
    month: sumSince(startMonth),
    averageOrder: counted.length ? Math.round(counted.reduce((s, o) => s + o.totals.total, 0) / counted.length) : 0,
    bestSellers: [...sellers.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    last7Days,
  }
}

/** Clearly-labelled sample orders so the dashboard can be explored before real orders exist. */
export function makeSampleOrders(catalog: Catalog, now: Date, count = 24): Order[] {
  const names = ['Ama Mensah', 'Kwame Boateng', 'Efua Owusu', 'Kofi Asante', 'Abena Darko', 'Yaw Adjei', 'Akosua Frimpong', 'Nana Ofori']
  const pizzas = catalog.products.filter((p) => p.kind === 'pizza' && p.enabled)
  const simples = catalog.products.filter((p) => p.kind === 'simple' && p.enabled)
  const zones = catalog.settings.deliveryZones.filter((z) => z.active)
  const statuses: OrderStatus[] = ['completed', 'completed', 'completed', 'cancelled', 'new', 'preparing', 'accepted']
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]

  return Array.from({ length: count }, (_, i) => {
    const at = new Date(now.getTime() - Math.floor(rnd() * 20 * 24 * 60) * 60 * 1000)
    const pizza = pick(pizzas)
    const lines: CartLine[] = [{
      lineId: `s${i}a`, productId: pizza.id, quantity: 1 + Math.floor(rnd() * 2), notes: '',
      pizza: { sizeId: pick(['M', 'L', 'XL'] as const), crustId: pick(['regular', 'thin']), addedToppings: [], removedToppings: [], cheese: 'regular' },
    }]
    const side = pick(simples)
    if (side.kind === 'simple' && rnd() > 0.4) lines.push({ lineId: `s${i}b`, productId: side.id, quantity: 1, notes: '', variantId: side.variants[0].id })
    const delivery = rnd() > 0.45 && zones.length > 0
    const zone = pick(zones)
    const customer: CustomerDetails = {
      name: pick(names), phone: `0${pick(['24', '20', '55', '27'])}${String(1000000 + Math.floor(rnd() * 8999999))}`,
      orderType: delivery ? 'delivery' : 'pickup', zoneId: delivery ? zone.id : '', address: delivery ? `House ${10 + i}, ${zone.name}` : '',
      landmark: '', instructions: '', paymentMethod: delivery ? 'cash_delivery' : 'momo', promoCode: '',
    }
    const ref = `SAMPLE-${String(i + 1).padStart(3, '0')}`
    const { order } = buildOrder(catalog, lines, customer, ref, at, 'sample')
    const status = pick(statuses)
    return { ...order, status, statusHistory: [...order.statusHistory, ...(status !== 'new' ? [{ status, at: at.toISOString() }] : [])] }
  })
}
