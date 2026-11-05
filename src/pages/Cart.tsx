/* eslint-disable react-refresh/only-export-components */
import { ArrowRight, Pencil, ShoppingBag, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage, QuantityStepper, useDocumentTitle, useMoney } from '../components/ui'
import { computeTotals, type CartTotals } from '../lib/cart'
import { toMinor } from '../lib/pricing'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'

export function useCartTotals(): CartTotals {
  const { catalog } = useCatalog()
  const { lines, draft } = useCart()
  return computeTotals(catalog, lines, { orderType: draft.orderType, zoneId: draft.zoneId, promoCode: draft.promoCode })
}

export function OrderSummary({ totals, compact = false }: { totals: CartTotals; compact?: boolean }) {
  const { catalog } = useCatalog()
  const { draft } = useCart()
  const money = useMoney()
  const s = catalog.settings
  const row = 'flex justify-between gap-4'
  return (
    <dl className={`space-y-2.5 ${compact ? 'text-sm' : ''}`}>
      <div className={row}><dt>Subtotal ({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
      {totals.discount > 0 && (
        <div className={`${row} font-semibold text-basil`}><dt>Discount · {totals.promotion?.name}</dt><dd className="tabular-nums">−{money(totals.discount)}</dd></div>
      )}
      {draft.orderType === 'delivery' ? (
        <div className={row}>
          <dt>Delivery{totals.delivery.zone ? ` · ${totals.delivery.zone.name}` : ''}</dt>
          <dd className="tabular-nums">{!totals.delivery.zone ? 'Choose area' : totals.delivery.freeApplied ? 'FREE' : money(totals.delivery.fee)}</dd>
        </div>
      ) : (
        <div className={row}><dt>Pickup</dt><dd>Free</dd></div>
      )}
      {s.tax.enabled && totals.tax > 0 && (
        <div className={`${row} text-ink-soft`}><dt>{s.tax.label} {s.tax.ratePercent}%{totals.taxIncluded ? ' (included)' : ''}</dt><dd className="tabular-nums">{money(totals.tax)}</dd></div>
      )}
      <div className={`${row} border-t border-ink/10 pt-3 text-xl font-bold`}><dt>Total</dt><dd className="tabular-nums" data-testid="order-total">{money(totals.total)}</dd></div>
      {draft.orderType === 'delivery' && s.freeDeliveryOver && !totals.delivery.freeApplied && totals.subtotal > 0 && (
        <p className="text-xs text-ink-soft">Free delivery on orders over {money(toMinor(s.freeDeliveryOver))}.</p>
      )}
    </dl>
  )
}

export function OrderTypeToggle() {
  const { draft, setDraft } = useCart()
  const opt = (v: 'delivery' | 'pickup', label: string) => (
    <label className={`flex-1 cursor-pointer rounded-full py-2.5 text-center text-sm font-bold transition ${draft.orderType === v ? 'bg-ink text-white' : 'text-ink-soft'}`}>
      <input type="radio" name="orderType" value={v} className="sr-only" checked={draft.orderType === v}
        onChange={() => setDraft({ orderType: v, paymentMethod: '' })} />
      {label}
    </label>
  )
  return (
    <div className="flex rounded-full border border-ink/10 bg-cream p-1" role="radiogroup" aria-label="Order type">
      {opt('delivery', 'Delivery')}{opt('pickup', 'Pickup')}
    </div>
  )
}

export function ZoneSelect({ error }: { error?: string }) {
  const { catalog } = useCatalog()
  const { draft, setDraft } = useCart()
  const money = useMoney()
  return (
    <div>
      <label htmlFor="zone" className="label">Delivery area / neighbourhood</label>
      <select id="zone" className={`field ${error ? 'field-error' : ''}`} value={draft.zoneId} onChange={(e) => setDraft({ zoneId: e.target.value })}
        aria-invalid={!!error} aria-describedby={error ? 'zone-err' : undefined}>
        <option value="">Select your area…</option>
        {catalog.settings.deliveryZones.filter((z) => z.active).map((z) => (
          <option key={z.id} value={z.id}>{z.name} — {money(toMinor(z.fee))} · ~{z.etaMinutes} min{z.minOrder ? ` · min ${money(toMinor(z.minOrder))}` : ''}</option>
        ))}
      </select>
      {error && <p id="zone-err" className="mt-1 text-sm font-medium text-brand">{error}</p>}
    </div>
  )
}

export function PromoCodeInput({ totals }: { totals: CartTotals }) {
  const { draft, setDraft } = useCart()
  const [code, setCode] = useState(draft.promoCode)
  return (
    <div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setDraft({ promoCode: code.trim().toUpperCase() }) }}>
        <label htmlFor="promo" className="sr-only">Promo code</label>
        <div className="relative flex-1">
          <Tag size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input id="promo" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Promo code" maxLength={30} className="field pl-10 uppercase" autoCapitalize="characters" />
        </div>
        <button type="submit" className="btn-ghost">Apply</button>
      </form>
      {draft.promoCode && (
        <p className={`mt-2 text-sm font-medium ${totals.promoCodeValid ? 'text-basil' : 'text-brand'}`} role="status">
          {totals.promoMessage ?? (totals.promoCodeValid ? `Code ${draft.promoCode} applied.` : '')}
          <button type="button" className="ml-2 underline" onClick={() => { setCode(''); setDraft({ promoCode: '' }) }}>Remove</button>
        </p>
      )}
    </div>
  )
}

export default function Cart() {
  const { catalog } = useCatalog()
  const { lines, setQuantity, remove, openCustomizer, draft } = useCart()
  const money = useMoney()
  const totals = useCartTotals()
  useDocumentTitle('Your cart')

  if (!lines.length) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-cream-deep"><ShoppingBag size={34} className="text-brand" /></span>
        <h1 className="mt-6 text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 max-w-sm text-ink-soft">Pick a pizza, make it yours, and it’ll show up here.</p>
        <Link to="/menu" className="btn-primary mt-8">Browse the menu</Link>
      </div>
    )
  }

  const blocking = totals.errors.filter((e) => !(e === 'Choose your delivery area.'))
  return (
    <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_380px]">
      <section aria-labelledby="cart-title">
        <h1 id="cart-title" className="text-4xl font-semibold">Your cart</h1>
        <ul className="mt-6 space-y-4">
          {totals.priced.map((p) => (
            <li key={p.line.lineId} className="card flex gap-4 p-4">
              <ProductImage image={p.product?.image ?? ''} alt={p.name} sizes="112px" className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-28" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-sans text-base font-bold">{p.name}</h2>
                  <p className="shrink-0 font-bold tabular-nums">{money(p.lineTotal)}</p>
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-ink-soft">
                  {p.details.map((d, i) => <li key={i} className="break-words">{d}</li>)}
                </ul>
                {p.errors.length > 0 && <p className="mt-2 text-sm font-semibold text-brand">{p.errors[0]}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <QuantityStepper size="sm" value={p.line.quantity} max={catalog.settings.maxQuantityPerLine} label={`${p.name} quantity`}
                    onChange={(v) => setQuantity(p.line.lineId, v)} />
                  <span className="text-xs text-ink-soft">{money(p.unitPrice)} each</span>
                  <div className="ml-auto flex gap-1">
                    {p.product && (
                      <button type="button" onClick={() => openCustomizer(p.line.productId, p.line.lineId)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-cream">
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                    <button type="button" onClick={() => remove(p.line.lineId)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft" aria-label={`Remove ${p.name}`}>
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link to="/menu" className="mt-6 inline-flex font-bold text-brand">+ Add more items</Link>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-5 p-6">
          <h2 className="text-2xl font-semibold">Order summary</h2>
          <OrderTypeToggle />
          {draft.orderType === 'delivery' && <ZoneSelect />}
          <PromoCodeInput totals={totals} />
          <OrderSummary totals={totals} />
          {blocking.length > 0 && <p role="alert" className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark">{blocking[0]}</p>}
          <Link to="/checkout" aria-disabled={blocking.length > 0}
            className={`btn-primary w-full py-4 text-lg ${blocking.length > 0 ? 'pointer-events-none opacity-50' : ''}`}>
            Checkout <ArrowRight size={20} />
          </Link>
        </div>
      </aside>
    </div>
  )
}
