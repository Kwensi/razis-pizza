import { AlertTriangle, Clock, Loader2, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ProductImage, useDocumentTitle, useMoney } from '../components/ui'
import { openStatus } from '../lib/hours'
import { buildOrder, saveOrder } from '../lib/orders'
import type { CustomerDetails, PaymentMethodId } from '../lib/types'
import { LIMITS, paymentMethodsFor, validateCheckout, type CheckoutErrors } from '../lib/validation'
import { buildOrderMessage, createSubmitGuard, encodeOrderPayload, generateOrderRef, orderFingerprint, refPrefix, whatsappUrl } from '../lib/whatsapp'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'
import { OrderSummary, OrderTypeToggle, PromoCodeInput, useCartTotals, ZoneSelect } from './Cart'

const memoryStore = new Map<string, string>()
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return memoryStore.get(k) ?? null } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { memoryStore.set(k, v) } },
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-sm font-medium text-brand">{error}</p>}
    </div>
  )
}

export default function Checkout() {
  const { catalog } = useCatalog()
  const { lines, draft, setDraft, clear } = useCart()
  const totals = useCartTotals()
  const money = useMoney()
  const navigate = useNavigate()
  const s = catalog.settings
  const guard = useMemo(() => createSubmitGuard(safeStorage), [])
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [duplicate, setDuplicate] = useState<{ ref: string; at: number } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useDocumentTitle('Checkout')

  const status = openStatus(s.hours, new Date(), s.timezone)
  const methods = paymentMethodsFor(catalog, draft.orderType)
  if (!lines.length && !submitting) return <Navigate to="/cart" replace />

  const input = (key: keyof CustomerDetails) => ({
    id: key,
    value: draft[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft({ [key]: e.target.value })
      if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }))
    },
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${key}-err` : undefined,
    className: `field ${errors[key] ? 'field-error' : ''}`,
  })

  const placeOrder = (force = false) => {
    setFormError('')
    const v = validateCheckout(catalog, draft)
    setErrors(v)
    if (Object.keys(v).length) {
      setFormError('Please fix the highlighted fields.')
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (totals.errors.length) { setFormError(totals.errors[0]); return }
    if (!status.open && !s.acceptOrdersWhenClosed) { setFormError(`We're closed right now (${status.label}). Please order during opening hours.`); return }
    if (!navigator.onLine) { setFormError('You appear to be offline. Connect to the internet to send your order on WhatsApp.'); return }

    const fp = orderFingerprint(lines, draft)
    const check = force ? (guard.fail(), guard.begin(`${fp}:${Date.now()}`)) : guard.begin(fp)
    if (check.status === 'in-flight') return
    if (check.status === 'duplicate') { setDuplicate({ ref: check.ref, at: check.at }); return }

    setSubmitting(true)
    try {
      const now = new Date()
      const ref = generateOrderRef(now, refPrefix(s.name))
      const { order, errors: orderErrors } = buildOrder(catalog, lines, draft, ref, now)
      if (orderErrors.length) throw new Error(orderErrors[0])
      const importLink = `${location.origin}${location.pathname}#/admin/import?o=${encodeOrderPayload(ref, order.createdAt, order.customer, lines)}`
      order.message = buildOrderMessage(order, catalog, importLink)
      const url = whatsappUrl(s.whatsappNumber, order.message)

      // Must run synchronously inside the click handler or mobile browsers block the pop-up.
      const win = window.open(url, '_blank')
      if (win) win.opener = null
      const launched = !!win || document.visibilityState === 'hidden'

      saveOrder(order).catch(() => { /* private mode: the order page will fall back to router state */ })
      guard.complete(fp, ref)
      clear()
      setDraft({ promoCode: '', instructions: '' })
      navigate(`/order/${ref}`, { replace: true, state: { order, launched } })
    } catch (err) {
      guard.fail()
      setSubmitting(false)
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const paymentInfo = (id: PaymentMethodId) => {
    const p = s.payments
    if (id === 'momo') return p.momo.accounts.map((a) => `${a.network}: ${a.number} (${a.accountName})`).join(' · ')
    if (id === 'bank') return `${p.bank.bankName} · ${p.bank.accountName} · ${p.bank.accountNumber}`
    return id === 'cash_pickup' ? 'Pay when you collect your order.' : 'Pay the rider when your order arrives.'
  }

  return (
    <div className="container-page py-8">
      <Link to="/cart" className="text-sm font-bold text-brand">← Back to cart</Link>
      <h1 className="mt-3 text-4xl font-extrabold">Checkout</h1>
      <p className="mt-2 text-ink-soft">No account needed. Your order is sent to us on WhatsApp.</p>

      {!status.open && (
        <p className={`mt-5 flex gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${s.acceptOrdersWhenClosed ? 'bg-cream-deep' : 'bg-brand-soft text-brand-dark'}`}>
          <Clock size={18} className="shrink-0" />
          {s.acceptOrdersWhenClosed ? `We're closed right now (${status.label}). You can still send your order and we'll confirm it when we open.` : `We're closed right now (${status.label}).`}
        </p>
      )}

      <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); placeOrder() }} className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card space-y-5 p-6" aria-labelledby="h-you">
            <h2 id="h-you" className="text-2xl font-extrabold">Your details</h2>
            <Field id="name" label="Full name" error={errors.name}>
              <input {...input('name')} autoComplete="name" maxLength={LIMITS.name} />
            </Field>
            <Field id="phone" label="Phone number" error={errors.phone} hint="We'll use this to confirm your order on WhatsApp or by phone.">
              <input {...input('phone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="024 123 4567" maxLength={20} />
            </Field>
          </section>

          <section className="card space-y-5 p-6" aria-labelledby="h-how">
            <h2 id="h-how" className="text-2xl font-extrabold">Pickup or delivery?</h2>
            <OrderTypeToggle />
            {draft.orderType === 'pickup' ? (
              <div className="rounded-2xl bg-cream p-4 text-sm">
                <p className="flex gap-2 font-semibold"><MapPin size={18} className="shrink-0 text-brand" /> {s.address}, {s.city}</p>
                <p className="mt-2 flex gap-2"><Clock size={18} className="shrink-0 text-brand" /> Ready in about {s.pickupPrepMinutes} minutes after we confirm.</p>
              </div>
            ) : (
              <>
                <ZoneSelect error={errors.zoneId} />
                <Field id="address" label="Delivery address" error={errors.address} hint="House number, street, building or apartment.">
                  <textarea {...input('address')} autoComplete="street-address" rows={2} maxLength={LIMITS.address} />
                </Field>
                <Field id="landmark" label="Nearest landmark (optional)" error={errors.landmark}>
                  <input {...input('landmark')} placeholder="e.g. opposite the Total filling station" maxLength={LIMITS.landmark} />
                </Field>
                {totals.delivery.zone && <p className="text-sm text-ink-soft">Estimated delivery: ~{totals.delivery.zone.etaMinutes} minutes after confirmation.</p>}
              </>
            )}
            <Field id="instructions" label="Additional instructions (optional)" error={errors.instructions}>
              <textarea {...input('instructions')} rows={2} maxLength={LIMITS.instructions} placeholder="Gate code, allergies, call on arrival…" />
            </Field>
          </section>

          <section className="card space-y-4 p-6" aria-labelledby="h-pay">
            <h2 id="h-pay" className="text-2xl font-extrabold">Payment</h2>
            <div role="radiogroup" aria-labelledby="h-pay" aria-describedby={errors.paymentMethod ? 'paymentMethod-err' : undefined} className="grid gap-2.5">
              {methods.map((id) => (
                <label key={id} className={`cursor-pointer rounded-2xl border-2 bg-white p-4 transition ${draft.paymentMethod === id ? 'border-brand' : 'border-ink/10 hover:border-ink/25'}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="payment" value={id} checked={draft.paymentMethod === id} className="h-5 w-5 accent-[var(--color-brand)]"
                      onChange={() => { setDraft({ paymentMethod: id }); setErrors((x) => ({ ...x, paymentMethod: undefined })) }} />
                    <span className="font-bold">{s.payments[id].label}</span>
                  </span>
                  <span className="mt-1 block pl-8 text-sm text-ink-soft">{paymentInfo(id)}</span>
                  {draft.paymentMethod === id && (id === 'momo' || id === 'bank') && (
                    <span className="mt-2 block pl-8 text-sm">{s.payments[id].instructions}</span>
                  )}
                </label>
              ))}
            </div>
            {errors.paymentMethod && <p id="paymentMethod-err" className="text-sm font-medium text-brand">{errors.paymentMethod}</p>}
            <p className="flex gap-2 text-xs text-ink-soft"><ShieldCheck size={16} className="shrink-0" /> No payment is taken online. The restaurant confirms receipt of any Mobile Money or bank payment.</p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-5 p-6">
            <h2 className="text-2xl font-extrabold">Review your order</h2>
            <ul className="divide-y divide-ink/5">
              {totals.priced.map((p) => (
                <li key={p.line.lineId} className="flex gap-3 py-3">
                  <ProductImage image={p.product?.image ?? ''} alt="" sizes="56px" className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex justify-between gap-2 font-bold"><span>{p.line.quantity} × {p.name}</span><span className="tabular-nums">{money(p.lineTotal)}</span></p>
                    <p className="text-ink-soft">{p.details.join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ul>
            <PromoCodeInput totals={totals} />
            <OrderSummary totals={totals} compact />
            {formError && <p role="alert" className="flex gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark"><AlertTriangle size={18} className="shrink-0" />{formError}</p>}
            <button type="submit" disabled={submitting} className="btn-whatsapp w-full py-4 text-lg" data-testid="place-order">
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <MessageCircle size={20} />}
              {submitting ? 'Opening WhatsApp…' : `Place order · ${money(totals.total)}`}
            </button>
            <p className="text-center text-xs leading-relaxed text-ink-soft">
              This opens WhatsApp with your order ready to send. Your order is only confirmed once the restaurant replies.
            </p>
          </div>
        </aside>
      </form>

      {duplicate && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="dup-title" className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-4 sm:place-items-center">
          <div className="card w-full max-w-md p-6">
            <h2 id="dup-title" className="text-2xl font-extrabold">Already sent?</h2>
            <p className="mt-2 text-ink-soft">
              You placed this exact order {Math.max(1, Math.round((Date.now() - duplicate.at) / 60000))} min ago (ref <strong>{duplicate.ref}</strong>). Sending it again may create a duplicate order.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link to={`/order/${duplicate.ref}`} className="btn-dark">View my previous order</Link>
              <button type="button" className="btn-ghost" onClick={() => { setDuplicate(null); placeOrder(true) }}>Yes, send a new order</button>
              <button type="button" className="py-2 text-sm font-semibold text-ink-soft" onClick={() => setDuplicate(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
