import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  availableSizes, CHEESE_LEVELS, CHEESE_TOPPING_ID, crustAvailable, defaultSelection, findProduct, MAX_NOTES_LENGTH,
  priceLine, toMinor, toppingAvailable, toppingCount, validateSelection,
} from '../lib/pricing'
import type { CartLine, PizzaProduct, PizzaSelection, Product, SimpleProduct, SizeId } from '../lib/types'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'
import { ProductImage, QuantityStepper, Tag, useMoney } from './ui'

export function CustomizeSheet() {
  const { customizing, closeCustomizer, lines } = useCart()
  const { catalog } = useCatalog()
  const ref = useRef<HTMLDialogElement>(null)
  const product = customizing ? findProduct(catalog, customizing.productId) : undefined
  const editing = customizing?.lineId ? lines.find((l) => l.lineId === customizing.lineId) : undefined

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (product && !d.open) d.showModal?.()
    if (!product && d.open) d.close()
  }, [product])

  return (
    <dialog
      ref={ref}
      onClose={closeCustomizer}
      onClick={(e) => { if (e.target === ref.current) closeCustomizer() }}
      aria-labelledby="customize-title"
      className="m-0 mt-auto h-[94dvh] max-h-none w-full max-w-none overflow-hidden rounded-t-[28px] bg-cream p-0 text-ink backdrop:bg-ink/55 backdrop:backdrop-blur-[2px] sm:m-auto sm:h-[min(860px,92dvh)] sm:max-w-2xl sm:rounded-[28px]"
    >
      {product && <SheetBody key={`${product.id}-${editing?.lineId ?? 'new'}`} product={product} editing={editing} onDone={closeCustomizer} />}
    </dialog>
  )
}

function SheetBody({ product, editing, onDone }: { product: Product; editing?: CartLine; onDone: () => void }) {
  const { catalog } = useCatalog()
  const { add, replace, showToast } = useCart()
  const money = useMoney()
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1)
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [pizza, setPizza] = useState<PizzaSelection | undefined>(() =>
    product.kind === 'pizza' ? (editing?.pizza ?? defaultSelection(catalog, product)) : undefined)
  const [variantId, setVariantId] = useState<string | undefined>(() =>
    product.kind === 'simple' ? (editing?.variantId ?? product.variants[0]?.id) : undefined)
  const [notice, setNotice] = useState('')

  const draft: Omit<CartLine, 'lineId'> = { productId: product.id, quantity, notes, pizza, variantId }
  const priced = useMemo(() => priceLine(catalog, { ...draft, lineId: 'draft' }), [catalog, quantity, notes, pizza, variantId]) // eslint-disable-line react-hooks/exhaustive-deps
  const errors = validateSelection(catalog, { ...draft, lineId: 'draft' })

  const submit = () => {
    if (errors.length) return
    const clean = { ...draft, notes: notes.trim() }
    if (editing) replace(editing.lineId, clean)
    else add(clean)
    showToast(`${editing ? 'Updated' : 'Added'}: ${quantity} × ${product.name}`)
    onDone()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative shrink-0">
        <ProductImage image={product.image} alt={product.name} eager sizes="(min-width: 640px) 672px, 100vw" className="h-44 w-full sm:h-56" />
        <button type="button" onClick={onDone} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5 sm:px-7">
        <h2 id="customize-title" className="text-3xl font-semibold">{product.name}</h2>
        <p className="mt-2 text-ink-soft">{product.description}</p>
        {!!product.tags?.length && <div className="mt-3 flex flex-wrap gap-1.5">{product.tags.map((t) => <Tag key={t} label={t} />)}</div>}

        {product.kind === 'pizza' && pizza && (
          <PizzaOptions product={product} sel={pizza} onChange={(next, msg) => { setPizza(next); setNotice(msg ?? '') }} />
        )}
        {product.kind === 'simple' && variantId !== undefined && (
          <VariantOptions product={product} value={variantId} onChange={setVariantId} />
        )}

        <section className="mt-7">
          <label htmlFor="notes" className="label">Special instructions <span className="font-normal text-ink-soft">(optional)</span></label>
          <textarea id="notes" className="field min-h-20" maxLength={MAX_NOTES_LENGTH} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={product.kind === 'pizza' ? 'e.g. well done, cut into squares, sauce on the side' : 'Anything we should know?'} />
          <p className="mt-1 text-right text-xs text-ink-soft">{notes.length}/{MAX_NOTES_LENGTH}</p>
        </section>

        {priced.components.length > 0 && (
          <details className="mt-4 rounded-2xl bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Price breakdown</summary>
            <ul className="mt-3 space-y-1">
              {priced.components.map((c, i) => (
                <li key={i} className="flex justify-between"><span>{c.label}</span><span className="tabular-nums">{money(c.amount)}</span></li>
              ))}
              <li className="flex justify-between border-t border-ink/10 pt-2 font-bold"><span>Each</span><span>{money(priced.unitPrice)}</span></li>
            </ul>
          </details>
        )}
      </div>

      <footer className="shrink-0 border-t border-ink/10 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-7">
        {(notice || errors.length > 0) && (
          <p role="alert" className="mb-3 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark">{errors[0] ?? notice}</p>
        )}
        <div className="flex items-center gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} max={catalog.settings.maxQuantityPerLine} label="quantity" />
          <button type="button" onClick={submit} disabled={errors.length > 0} className="btn-primary flex-1 text-base" data-testid="add-to-cart">
            {editing ? 'Update item' : 'Add to cart'} · <span className="tabular-nums" aria-live="polite">{money(priced.unitPrice * quantity)}</span>
          </button>
        </div>
      </footer>
    </div>
  )
}

function OptionGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-7">
      <legend className="flex w-full items-baseline justify-between text-lg font-bold">
        {title}{hint && <span className="text-xs font-semibold text-ink-soft">{hint}</span>}
      </legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}

const radioCard = (active: boolean, disabled = false) =>
  `relative flex cursor-pointer flex-col rounded-2xl border-2 bg-white p-3 text-left transition ${
    active ? 'border-brand shadow-[0_0_0_3px_rgba(179,38,30,0.12)]' : 'border-transparent hover:border-ink/15'
  } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`

function PizzaOptions({ product, sel, onChange }: { product: PizzaProduct; sel: PizzaSelection; onChange: (s: PizzaSelection, notice?: string) => void }) {
  const { catalog } = useCatalog()
  const money = useMoney()
  const sizes = availableSizes(catalog, product)
  const max = catalog.settings.maxToppings
  const count = toppingCount(product, sel)
  const cheese = catalog.toppings.find((t) => t.id === CHEESE_TOPPING_ID)
  const extras = catalog.toppings.filter((t) => t.enabled && t.id !== CHEESE_TOPPING_ID && !product.defaultToppings.includes(t.id))
  const included = product.defaultToppings.filter((t) => t !== CHEESE_TOPPING_ID)
  const price = (amount: number | undefined) => (amount ? `+${money(toMinor(amount))}` : 'Free')

  const setSize = (sizeId: SizeId) => {
    let next: PizzaSelection = { ...sel, sizeId }
    const notices: string[] = []
    if (!crustAvailable(catalog, sel.crustId, sizeId)) {
      const fallback = catalog.crusts.find((c) => crustAvailable(catalog, c.id, sizeId))
      next = { ...next, crustId: fallback?.id ?? '' }
      notices.push(`${catalog.crusts.find((c) => c.id === sel.crustId)?.name} isn't available in this size, so we switched to ${fallback?.name}.`)
    }
    const keep = next.addedToppings.filter((t) => toppingAvailable(catalog, t, sizeId))
    if (keep.length !== next.addedToppings.length) { next = { ...next, addedToppings: keep }; notices.push('Some toppings are not available in this size.') }
    onChange(next, notices.join(' '))
  }

  return (
    <>
      <OptionGroup title="Choose your size">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {catalog.sizes.map((s) => {
            const offered = sizes.includes(s.id)
            const active = sel.sizeId === s.id
            return (
              <label key={s.id} className={radioCard(active, !offered)}>
                <input type="radio" name="size" className="sr-only" checked={active} disabled={!offered} onChange={() => setSize(s.id)} />
                <span className="font-bold">{s.name}</span>
                <span className="text-xs text-ink-soft">{s.detail}</span>
                <span className="mt-2 font-bold tabular-nums">{offered ? money(toMinor(product.prices[s.id]!)) : 'N/A'}</span>
                {active && <Check size={16} className="absolute right-2.5 top-2.5 text-brand" />}
              </label>
            )
          })}
        </div>
      </OptionGroup>

      <OptionGroup title="Crust">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {catalog.crusts.filter((c) => c.enabled).map((c) => {
            const ok = crustAvailable(catalog, c.id, sel.sizeId)
            const active = sel.crustId === c.id
            return (
              <label key={c.id} className={`${radioCard(active, !ok)} flex-row items-center justify-between gap-3`}>
                <input type="radio" name="crust" className="sr-only" checked={active} disabled={!ok} onChange={() => onChange({ ...sel, crustId: c.id })} />
                <span>
                  <span className="block font-bold">{c.name}</span>
                  <span className="text-xs text-ink-soft">{ok ? c.description : `Not available in ${catalog.sizes.find((s) => s.id === sel.sizeId)?.name}`}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums">{ok ? price(c.prices[sel.sizeId]) : ''}</span>
              </label>
            )
          })}
        </div>
      </OptionGroup>

      {cheese?.enabled && (
        <OptionGroup title="Cheese">
          <div className="flex flex-wrap gap-2">
            {CHEESE_LEVELS.map((lvl) => {
              const active = sel.cheese === lvl.id
              const amount = lvl.portions ? (cheese.prices[sel.sizeId] ?? 0) * lvl.portions : 0
              return (
                <label key={lvl.id} className={`chip cursor-pointer ${active ? 'border-brand bg-brand text-white' : 'border-ink/15 bg-white hover:border-ink/40'}`}>
                  <input type="radio" name="cheese" className="sr-only" checked={active} onChange={() => onChange({ ...sel, cheese: lvl.id })} />
                  {lvl.name}{amount > 0 && <span className={active ? 'text-white/85' : 'text-ink-soft'}> +{money(toMinor(amount))}</span>}
                </label>
              )
            })}
          </div>
        </OptionGroup>
      )}

      {included.length > 0 && (
        <OptionGroup title="Included toppings" hint="Untick to remove">
          <div className="flex flex-wrap gap-2">
            {included.map((id) => {
              const t = catalog.toppings.find((x) => x.id === id)
              const on = !sel.removedToppings.includes(id)
              return (
                <label key={id} className={`chip inline-flex cursor-pointer items-center gap-1.5 ${on ? 'border-basil bg-[#e4eedc] text-basil' : 'border-ink/15 bg-white text-ink-soft line-through'}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => onChange({
                    ...sel, removedToppings: on ? [...sel.removedToppings, id] : sel.removedToppings.filter((x) => x !== id),
                  })} />
                  {on && <Check size={14} />}{t?.name ?? id}
                </label>
              )
            })}
          </div>
        </OptionGroup>
      )}

      <OptionGroup title="Add toppings" hint={`${count} of ${max} toppings`}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {extras.map((t) => {
            const on = sel.addedToppings.includes(t.id)
            const ok = toppingAvailable(catalog, t.id, sel.sizeId)
            const disabled = !ok || (!on && count >= max)
            return (
              <label key={t.id} className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl border-2 bg-white px-3 py-2.5 text-sm transition ${
                on ? 'border-brand' : 'border-transparent hover:border-ink/15'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}>
                <input type="checkbox" className="sr-only" checked={on} disabled={disabled} onChange={() => onChange({
                  ...sel, addedToppings: on ? sel.addedToppings.filter((x) => x !== t.id) : [...sel.addedToppings, t.id],
                })} />
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`grid h-5 w-5 place-items-center rounded-md border ${on ? 'border-brand bg-brand text-white' : 'border-ink/25'}`}>{on && <Check size={13} />}</span>
                  {t.name}
                </span>
                <span className="text-xs font-bold tabular-nums text-ink-soft">{ok ? `+${money(toMinor(t.prices[sel.sizeId]!))}` : ''}</span>
              </label>
            )
          })}
        </div>
        {count >= max && <p className="mt-2 text-sm text-ink-soft">You’ve reached the maximum of {max} toppings.</p>}
      </OptionGroup>
    </>
  )
}

function VariantOptions({ product, value, onChange }: { product: SimpleProduct; value: string; onChange: (v: string) => void }) {
  const money = useMoney()
  if (product.variants.length < 2) return null
  return (
    <OptionGroup title="Choose an option">
      <div className="grid grid-cols-2 gap-2.5">
        {product.variants.map((v) => (
          <label key={v.id} className={radioCard(value === v.id)}>
            <input type="radio" name="variant" className="sr-only" checked={value === v.id} onChange={() => onChange(v.id)} />
            <span className="font-bold">{v.name}</span>
            <span className="mt-1 font-bold tabular-nums">{money(toMinor(v.price))}</span>
          </label>
        ))}
      </div>
    </OptionGroup>
  )
}
