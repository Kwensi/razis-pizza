import { ArrowLeft, Download, MessageCircle, Printer, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDocumentTitle, useMoney } from '../components/ui'
import { buildOrder, getOrder, listOrders, ORDER_STATUSES, saveOrder, setOrderStatus, statusLabel } from '../lib/orders'
import type { Order, OrderStatus } from '../lib/types'
import { formatPhone } from '../lib/validation'
import { buildOrderMessage, decodeOrderPayload, whatsappUrl } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

const STATUS_TONE: Record<OrderStatus, string> = {
  new: 'bg-brand text-white', accepted: 'bg-[#dbe8f7] text-[#1c4f8a]', preparing: 'bg-[#fdf3e3] text-[#7a4a0c]',
  ready: 'bg-[#e4eedc] text-basil', out_for_delivery: 'bg-[#e4eedc] text-basil', completed: 'bg-cream-deep text-ink', cancelled: 'bg-ink/10 text-ink-soft line-through',
}

function StatusSelect({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  return (
    <select aria-label={`Status for ${order.ref}`} value={order.status} className={`rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_TONE[order.status]}`}
      onChange={async (e) => { const next = await setOrderStatus(order.ref, e.target.value as OrderStatus); if (next) onChange(next) }}>
      {ORDER_STATUSES.filter((s) => order.customer.orderType === 'delivery' ? s.id !== 'ready' : s.id !== 'out_for_delivery')
        .map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
  )
}

export function OrdersList() {
  const money = useMoney()
  const [orders, setOrders] = useState<Order[]>([])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState<'' | 'pickup' | 'delivery'>('')
  const [status, setStatus] = useState<'' | OrderStatus>('')
  useDocumentTitle('Orders')
  useEffect(() => { listOrders().then(setOrders).catch(() => setOrders([])) }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const digits = needle.replace(/\D/g, '')
    return orders.filter((o) => {
      const day = o.createdAt.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      if (type && o.customer.orderType !== type) return false
      if (status && o.status !== status) return false
      if (!needle) return true
      return o.ref.toLowerCase().includes(needle) || o.customer.name.toLowerCase().includes(needle) || (digits.length >= 3 && o.customer.phone.includes(digits))
    })
  }, [orders, q, from, to, type, status])

  const exportCsv = () => {
    const rows = [['Ref', 'Date', 'Customer', 'Phone', 'Type', 'Status', 'Total']]
      .concat(filtered.map((o) => [o.ref, o.createdAt, o.customer.name, formatPhone(o.customer.phone), o.customer.orderType, statusLabel(o.status), (o.totals.total / 100).toFixed(2)]))
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <button type="button" onClick={exportCsv} className="btn-ghost py-2 text-sm"><Download size={16} /> Export CSV</button>
      </div>
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative lg:col-span-2"><span className="sr-only">Search</span>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input className="field py-2.5 pl-10" placeholder="Ref, name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className="text-xs font-semibold">From<input type="date" className="field mt-1 py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="text-xs font-semibold">To<input type="date" className="field mt-1 py-2" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">Type
            <select className="field mt-1 py-2" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="">All</option><option value="delivery">Delivery</option><option value="pickup">Pickup</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Status
            <select className="field mt-1 py-2" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">All</option>{ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="text-sm text-ink-soft">{filtered.length} of {orders.length} orders</p>
      <ul className="space-y-2">
        {filtered.map((o) => (
          <li key={o.ref} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
            <Link to={o.ref} className="font-mono font-bold text-brand hover:underline">{o.ref}</Link>
            <span className="text-ink-soft">{new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span className="font-semibold">{o.customer.name}</span>
            <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold capitalize">{o.customer.orderType}</span>
            {o.source !== 'this-device' && <span className="text-xs text-ink-soft">{o.source === 'sample' ? 'sample' : 'imported'}</span>}
            <span className="ml-auto font-bold tabular-nums">{money(o.totals.total)}</span>
            <StatusSelect order={o} onChange={(n) => setOrders((all) => all.map((x) => (x.ref === n.ref ? n : x)))} />
          </li>
        ))}
        {filtered.length === 0 && <li className="card p-6 text-center text-ink-soft">No orders match these filters.</li>}
      </ul>
    </div>
  )
}

export function OrderDetail() {
  const { ref = '' } = useParams()
  const { catalog } = useCatalog()
  const money = useMoney()
  const [order, setOrder] = useState<Order | null | undefined>()
  useDocumentTitle(`Order ${ref}`)
  useEffect(() => { getOrder(ref).then((o) => setOrder(o ?? null)) }, [ref])
  if (order === undefined) return <p>Loading…</p>
  if (order === null) return <p>Order not found. <Link to="/admin/orders" className="text-brand">Back to orders</Link></p>
  const s = catalog.settings
  const c = order.customer
  const zone = s.deliveryZones.find((z) => z.id === c.zoneId)
  const reply = whatsappUrl(c.phone, `Hello ${c.name.split(' ')[0]}, this is ${s.name}. Your order ${order.ref} is now: ${statusLabel(order.status)}. Total: ${money(order.totals.total)}.`)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-bold text-brand"><ArrowLeft size={16} /> Orders</Link>
        <div className="flex flex-wrap gap-2">
          <StatusSelect order={order} onChange={setOrder} />
          <a href={reply} target="_blank" rel="noopener noreferrer" className="btn-whatsapp py-2 text-sm"><MessageCircle size={16} /> Message customer</a>
          <button type="button" onClick={() => window.print()} className="btn-ghost py-2 text-sm"><Printer size={16} /> Print</button>
        </div>
      </div>
      <article className="card space-y-5 p-6 print:shadow-none">
        <header className="flex flex-wrap justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{s.name} · {c.orderType}</p>
            <h1 className="font-mono text-2xl font-bold">{order.ref}</h1>
            <p className="text-sm text-ink-soft">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <p className={`h-fit rounded-full px-3 py-1 text-sm font-bold ${STATUS_TONE[order.status]}`}>{statusLabel(order.status)}</p>
        </header>
        <section className="grid gap-4 text-sm sm:grid-cols-2">
          <div><h2 className="font-sans font-bold">Customer</h2><p>{c.name}</p><p><a href={`tel:+${c.phone}`} className="text-brand">{formatPhone(c.phone)}</a></p></div>
          <div>
            <h2 className="font-sans font-bold">{c.orderType === 'delivery' ? 'Deliver to' : 'Pickup'}</h2>
            {c.orderType === 'delivery' ? <><p>{zone?.name}</p><p className="whitespace-pre-line">{c.address}</p>{c.landmark && <p>Near: {c.landmark}</p>}</> : <p>Customer collects</p>}
          </div>
          <div><h2 className="font-sans font-bold">Payment</h2><p>{c.paymentMethod ? s.payments[c.paymentMethod].label : '—'} · <span className="text-ink-soft">verify before marking paid</span></p></div>
          {c.instructions && <div><h2 className="font-sans font-bold">Instructions</h2><p className="whitespace-pre-line">{c.instructions}</p></div>}
        </section>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-soft"><th className="py-2">Item</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Total</th></tr></thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={i} className="border-b border-ink/5 align-top">
                <td className="py-2.5"><p className="font-semibold">{l.name}</p>{l.details.map((d, j) => <p key={j} className="text-ink-soft">{d}</p>)}</td>
                <td className="py-2.5 text-right">{l.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.totals.subtotal)}</dd></div>
          {order.totals.discount > 0 && <div className="flex justify-between"><dt>Discount ({order.totals.promotionName})</dt><dd>−{money(order.totals.discount)}</dd></div>}
          {c.orderType === 'delivery' && <div className="flex justify-between"><dt>Delivery</dt><dd>{money(order.totals.delivery)}</dd></div>}
          {order.totals.tax > 0 && <div className="flex justify-between"><dt>{s.tax.label}</dt><dd>{money(order.totals.tax)}</dd></div>}
          <div className="flex justify-between border-t border-ink/10 pt-2 text-lg font-bold"><dt>Total</dt><dd>{money(order.totals.total)}</dd></div>
        </dl>
        <section className="no-print border-t border-ink/10 pt-4 text-xs text-ink-soft">
          <h2 className="font-sans font-bold text-ink">Status history</h2>
          <ul className="mt-1">{order.statusHistory.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} — {statusLabel(h.status)}</li>)}</ul>
        </section>
      </article>
    </div>
  )
}

/** Opened from the staff link in a WhatsApp order message. Re-prices the order with THIS device's menu. */
export function ImportOrder() {
  const [params] = useSearchParams()
  const { catalog } = useCatalog()
  const money = useMoney()
  const navigate = useNavigate()
  const [existing, setExisting] = useState<Order | undefined>()
  useDocumentTitle('Import order')
  const decoded = useMemo(() => decodeOrderPayload(params.get('o') ?? ''), [params])
  const built = useMemo(() => decoded && buildOrder(catalog, decoded.lines, decoded.customer, decoded.ref, new Date(decoded.createdAt), 'whatsapp-import'), [decoded, catalog])
  useEffect(() => { if (decoded) getOrder(decoded.ref).then(setExisting) }, [decoded])

  if (!decoded || !built) {
    return <div className="card mx-auto max-w-lg p-6"><h1 className="text-2xl font-semibold">Invalid order link</h1><p className="mt-2 text-ink-soft">This link is incomplete or has been altered. Ask the customer to resend the order.</p></div>
  }
  const { order, errors } = built
  return (
    <div className="card mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Add WhatsApp order {order.ref}</h1>
      <p className="text-sm text-ink-soft">Prices below were recalculated from your current menu, not taken from the customer’s message. Compare the total with the WhatsApp message before accepting.</p>
      {existing && <p className="rounded-xl bg-cream p-3 text-sm">This order is already in your dashboard. <Link className="font-bold text-brand" to={`/admin/orders/${order.ref}`}>Open it</Link></p>}
      {errors.length > 0 && <div role="alert" className="rounded-xl bg-brand-soft p-3 text-sm text-brand-dark"><p className="font-bold">Check this order:</p><ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul></div>}
      <p className="text-sm"><strong>{order.customer.name}</strong> · {formatPhone(order.customer.phone)} · <span className="capitalize">{order.customer.orderType}</span></p>
      <ul className="divide-y divide-ink/5 text-sm">
        {order.lines.map((l, i) => <li key={i} className="flex justify-between gap-3 py-2"><span>{l.quantity} × {l.name}<span className="block text-ink-soft">{l.details.join(' · ')}</span></span><span className="tabular-nums">{money(l.lineTotal)}</span></li>)}
      </ul>
      <p className="text-right text-lg font-bold">Total {money(order.totals.total)}</p>
      <button type="button" disabled={!!existing} className="btn-primary w-full" onClick={async () => {
        await saveOrder({ ...order, message: buildOrderMessage(order, catalog) })
        navigate(`/admin/orders/${order.ref}`)
      }}>Add to dashboard</button>
    </div>
  )
}
