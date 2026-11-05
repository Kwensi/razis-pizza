import { AlertTriangle, Check, ClipboardList, Copy, Hourglass, MessageCircle, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDocumentTitle, useMoney } from '../components/ui'
import { getOrder, listOrders, statusLabel } from '../lib/orders'
import type { Order } from '../lib/types'
import { whatsappUrl } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'

export function OrderPlaced() {
  const { ref = '' } = useParams()
  const { state } = useLocation() as { state?: { order?: Order; launched?: boolean } }
  const { catalog } = useCatalog()
  const money = useMoney()
  const s = catalog.settings
  const [order, setOrder] = useState<Order | null | undefined>(state?.order?.ref === ref ? state.order : undefined)
  const [copied, setCopied] = useState(false)
  useDocumentTitle(`Order ${ref}`)

  useEffect(() => {
    if (order) return
    getOrder(ref).then((o) => setOrder(o ?? null)).catch(() => setOrder(null))
  }, [ref, order])

  if (order === undefined) return <p className="container-page py-24 text-center text-ink-soft">Loading your order…</p>
  if (order === null) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-semibold">Order not found on this device</h1>
        <p className="mt-2 text-ink-soft">Order details are stored in the browser where the order was placed.</p>
        <Link to="/menu" className="btn-primary mt-6">Back to menu</Link>
      </div>
    )
  }

  const url = whatsappUrl(s.whatsappNumber, order.message)
  const launchedFailed = state?.launched === false
  const copy = async () => {
    try { await navigator.clipboard.writeText(order.message); setCopied(true) } catch { setCopied(false) }
  }
  const pay = order.customer.paymentMethod

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="card overflow-hidden">
        <div className="bg-ink p-7 text-white sm:p-9">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#f4c46a] px-3 py-1 text-xs font-bold text-ink">
            <Hourglass size={14} /> {order.status === 'new' ? 'Sent · awaiting restaurant confirmation' : statusLabel(order.status)}
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Thanks, {order.customer.name.split(' ')[0]}!</h1>
          <p className="mt-2 text-white/80">Your order reference is</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider" data-testid="order-ref">{order.ref}</p>
        </div>

        <div className="space-y-6 p-7 sm:p-9">
          {launchedFailed ? (
            <div role="alert" className="rounded-2xl bg-brand-soft p-4 text-sm text-brand-dark">
              <p className="flex items-center gap-2 font-bold"><AlertTriangle size={18} /> WhatsApp didn’t open automatically</p>
              <p className="mt-1">Tap “Send on WhatsApp” below. If you don’t have WhatsApp, copy the order and send it by SMS, or call us.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-cream p-4 text-sm">
              <p className="font-bold">Important: press “Send” in WhatsApp.</p>
              <p className="mt-1 text-ink-soft">
                Your order is <strong>not confirmed yet</strong>. {s.name} will reply on WhatsApp to confirm they received it, that everything is available, and the final total.
              </p>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><MessageCircle size={18} /> Send on WhatsApp</a>
            <button type="button" onClick={copy} className="btn-ghost">{copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Copied' : 'Copy order'}</button>
            <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="btn-ghost"><Phone size={18} /> Call us</a>
          </div>

          {(pay === 'momo' || pay === 'bank') && (
            <section className="rounded-2xl border border-ink/10 p-5 text-sm">
              <h2 className="font-sans text-base font-bold">{s.payments[pay].label} details</h2>
              {pay === 'momo' ? (
                <ul className="mt-2 space-y-1">{s.payments.momo.accounts.map((a) => <li key={a.number}><strong>{a.network}:</strong> {a.number} · {a.accountName}</li>)}</ul>
              ) : (
                <p className="mt-2">{s.payments.bank.bankName} · {s.payments.bank.accountName} · <strong>{s.payments.bank.accountNumber}</strong> · {s.payments.bank.branch}</p>
              )}
              <p className="mt-2">Amount: <strong>{money(order.totals.total)}</strong> · Reference: <strong>{order.ref}</strong></p>
              <p className="mt-2 text-ink-soft">{s.payments[pay].instructions} Payment is only confirmed when the restaurant verifies it.</p>
            </section>
          )}

          <section>
            <h2 className="font-sans text-base font-bold">{order.customer.orderType === 'delivery' ? 'Delivery to' : 'Pickup from'}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {order.customer.orderType === 'delivery'
                ? `${order.customer.address}${order.customer.landmark ? ` (near ${order.customer.landmark})` : ''} · ${s.deliveryZones.find((z) => z.id === order.customer.zoneId)?.name ?? ''}`
                : `${s.address}, ${s.city} · ready about ${s.pickupPrepMinutes} min after confirmation`}
            </p>
          </section>

          <section>
            <h2 className="font-sans text-base font-bold">Items</h2>
            <ul className="mt-2 divide-y divide-ink/5 text-sm">
              {order.lines.map((l, i) => (
                <li key={i} className="py-2.5">
                  <p className="flex justify-between gap-3 font-semibold"><span>{l.quantity} × {l.name}</span><span className="tabular-nums">{money(l.lineTotal)}</span></p>
                  {l.details.length > 0 && <p className="text-ink-soft">{l.details.join(' · ')}</p>}
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.totals.subtotal)}</dd></div>
              {order.totals.discount > 0 && <div className="flex justify-between text-basil"><dt>Discount · {order.totals.promotionName}</dt><dd>−{money(order.totals.discount)}</dd></div>}
              {order.customer.orderType === 'delivery' && <div className="flex justify-between"><dt>Delivery</dt><dd>{order.totals.delivery ? money(order.totals.delivery) : 'FREE'}</dd></div>}
              <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{money(order.totals.total)}</dd></div>
            </dl>
          </section>
          <Link to="/menu" className="inline-flex font-bold text-brand">Order something else →</Link>
        </div>
      </div>
    </div>
  )
}

export function MyOrders() {
  const money = useMoney()
  const [orders, setOrders] = useState<Order[] | null>(null)
  useDocumentTitle('My orders')
  useEffect(() => {
    listOrders().then((all) => setOrders(all.filter((o) => o.source === 'this-device'))).catch(() => setOrders([]))
  }, [])
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl font-semibold">My orders</h1>
      <p className="mt-2 text-ink-soft">Orders sent from this device. Order status updates come from the restaurant on WhatsApp.</p>
      {orders === null ? <p className="py-10 text-ink-soft">Loading…</p> : orders.length === 0 ? (
        <div className="py-16 text-center">
          <ClipboardList className="mx-auto text-brand" size={36} />
          <p className="mt-3 text-ink-soft">No orders yet.</p>
          <Link to="/menu" className="btn-primary mt-6">Start an order</Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li key={o.ref}>
              <Link to={`/order/${o.ref}`} className="card flex items-center justify-between gap-4 p-5 hover:shadow-lg">
                <span>
                  <span className="block font-mono font-bold">{o.ref}</span>
                  <span className="text-sm text-ink-soft">{new Date(o.createdAt).toLocaleString()} · {o.lines.reduce((s, l) => s + l.quantity, 0)} items</span>
                </span>
                <span className="font-bold tabular-nums">{money(o.totals.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
