import { Download, Plus, Save, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useDocumentTitle } from '../components/ui'
import { DAY_NAMES } from '../lib/hours'
import { promotionStatus } from '../lib/promotions'
import type { Catalog, Promotion, PromotionType, RestaurantSettings } from '../lib/types'
import { isCatalog, useCatalog } from '../state/catalog'
import { DemoModeNotice, sha256 } from './AdminApp'

const toLocalInput = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined)
const optNum = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v)))

function Text({ label, value, onChange, type = 'text', hint }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="block text-sm font-semibold">{label}
      <input type={type} className="field mt-1 py-2.5" value={value} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="mt-1 block text-xs font-normal text-ink-soft">{hint}</span>}
    </label>
  )
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-4 p-5"><h2 className="text-xl font-extrabold">{title}</h2>{children}</section>
}

// ---------------- Promotions ----------------

const TYPES: { id: PromotionType; label: string }[] = [
  { id: 'percent', label: 'Percentage off' }, { id: 'fixed', label: 'Fixed amount off' }, { id: 'bogo', label: 'Buy one get one free' }, { id: 'combo', label: 'Combo meal' },
]

function PromotionEditor({ initial, onClose }: { initial: Promotion; onClose: () => void }) {
  const { catalog, saveCatalog } = useCatalog()
  const [p, setP] = useState<Promotion>(initial)
  const [error, setError] = useState('')
  const isNew = !catalog.promotions.some((x) => x.id === initial.id)
  const save = async () => {
    if (!p.name.trim()) return setError('Name is required.')
    if (p.type === 'percent' && !(p.value > 0 && p.value <= 100)) return setError('Percentage must be between 1 and 100.')
    if ((p.type === 'fixed' || p.type === 'combo') && !(p.value > 0)) return setError('Enter the amount to take off.')
    if (p.type === 'combo' && !(p.combo?.length && p.combo.every((r) => r.categoryIds.length && r.quantity > 0))) return setError('Each combo item needs at least one category.')
    const code = p.code?.trim().toUpperCase().replace(/\s+/g, '') || undefined
    if (code && catalog.promotions.some((x) => x.id !== p.id && x.code?.toUpperCase() === code)) return setError('Another promotion already uses that code.')
    if (p.startsAt && p.endsAt && p.endsAt < p.startsAt) return setError('End date must be after the start date.')
    const next = { ...p, code }
    await saveCatalog({ ...catalog, promotions: isNew ? [...catalog.promotions, next] : catalog.promotions.map((x) => (x.id === p.id ? next : x)) })
    onClose()
  }
  const cats = catalog.categories
  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-xl font-extrabold">{isNew ? 'New promotion' : `Edit ${initial.name}`}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Text label="Name" value={p.name} onChange={(name) => setP({ ...p, name })} />
        <label className="block text-sm font-semibold">Type
          <select className="field mt-1 py-2.5" value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as PromotionType })}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2"><Text label="Description (shown to customers)" value={p.description} onChange={(description) => setP({ ...p, description })} /></div>
        {p.type !== 'bogo' && <Text type="number" label={p.type === 'percent' ? 'Percent off' : 'Amount off (per combo for combos)'} value={p.value} onChange={(v) => setP({ ...p, value: Number(v) })} />}
        {p.type === 'percent' && <Text type="number" label="Maximum discount (optional)" value={p.maxDiscount ?? ''} onChange={(v) => setP({ ...p, maxDiscount: optNum(v) })} />}
        <Text label="Promo code (blank = automatic)" value={p.code ?? ''} onChange={(code) => setP({ ...p, code })} />
        <Text type="number" label="Minimum order (optional)" value={p.minSubtotal ?? ''} onChange={(v) => setP({ ...p, minSubtotal: optNum(v) })} />
        <Text type="datetime-local" label="Starts (optional)" value={toLocalInput(p.startsAt)} onChange={(v) => setP({ ...p, startsAt: fromLocalInput(v) })} />
        <Text type="datetime-local" label="Ends (optional)" value={toLocalInput(p.endsAt)} onChange={(v) => setP({ ...p, endsAt: fromLocalInput(v) })} />
      </div>
      {p.type === 'bogo' && (
        <fieldset><legend className="text-sm font-bold">Eligible categories <span className="font-normal text-ink-soft">(none ticked = all pizzas)</span></legend>
          <div className="mt-2 flex flex-wrap gap-3">{cats.map((c) => (
            <Toggle key={c.id} label={c.name} checked={!!p.categoryIds?.includes(c.id)} onChange={(on) => setP({ ...p, categoryIds: on ? [...(p.categoryIds ?? []), c.id] : (p.categoryIds ?? []).filter((x) => x !== c.id) })} />
          ))}</div>
        </fieldset>
      )}
      {p.type === 'combo' && (
        <fieldset className="space-y-3"><legend className="text-sm font-bold">Combo contents</legend>
          {(p.combo ?? []).map((r, i) => (
            <div key={i} className="rounded-2xl bg-cream p-3">
              <div className="flex gap-2">
                <input className="field py-2" aria-label="Item label" value={r.label} placeholder="e.g. pizza" onChange={(e) => setP({ ...p, combo: p.combo!.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <input className="field w-24 py-2" type="number" min={1} aria-label="Quantity" value={r.quantity} onChange={(e) => setP({ ...p, combo: p.combo!.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)) })} />
                <button type="button" className="p-2 text-brand" aria-label="Remove combo item" onClick={() => setP({ ...p, combo: p.combo!.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">{cats.map((c) => (
                <Toggle key={c.id} label={c.name} checked={r.categoryIds.includes(c.id)} onChange={(on) => setP({ ...p, combo: p.combo!.map((x, j) => (j === i ? { ...x, categoryIds: on ? [...x.categoryIds, c.id] : x.categoryIds.filter((y) => y !== c.id) } : x)) })} />
              ))}</div>
            </div>
          ))}
          <button type="button" className="text-sm font-bold text-brand" onClick={() => setP({ ...p, combo: [...(p.combo ?? []), { label: 'item', quantity: 1, categoryIds: [] }] })}>+ Add combo item</button>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-4"><Toggle label="Active" checked={p.active} onChange={(active) => setP({ ...p, active })} /><Toggle label="Feature on homepage" checked={!!p.featured} onChange={(featured) => setP({ ...p, featured })} /></div>
      {error && <p role="alert" className="text-sm font-medium text-brand">{error}</p>}
      <div className="flex gap-2"><button type="button" className="btn-primary" onClick={save}><Save size={18} /> Save</button><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button></div>
    </div>
  )
}

export function PromotionsAdmin() {
  const { catalog, saveCatalog } = useCatalog()
  const [editing, setEditing] = useState<Promotion | null>(null)
  useDocumentTitle('Promotions')
  const now = new Date()
  const tone = { live: 'bg-[#e4eedc] text-basil', scheduled: 'bg-[#dbe8f7] text-[#1c4f8a]', expired: 'bg-ink/10 text-ink-soft', inactive: 'bg-ink/10 text-ink-soft' }
  if (editing) return <PromotionEditor initial={editing} onClose={() => setEditing(null)} />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Promotions</h1>
        <button type="button" className="btn-primary py-2 text-sm" onClick={() => setEditing({ id: `promo-${Date.now().toString(36)}`, name: '', description: '', type: 'percent', value: 10, active: true })}><Plus size={16} /> New promotion</button>
      </div>
      <p className="text-sm text-ink-soft">One promotion applies per order — whichever saves the customer most among automatic offers and the code they enter.</p>
      <ul className="space-y-2">
        {catalog.promotions.map((p) => {
          const st = promotionStatus(p, now)
          return (
            <li key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.name} {p.code && <span className="ml-1 rounded-md bg-cream px-2 py-0.5 font-mono text-xs">{p.code}</span>}</p>
                <p className="text-sm text-ink-soft">{TYPES.find((t) => t.id === p.type)?.label} · {p.description}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone[st]}`}>{st}</span>
              <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setEditing(p)}>Edit</button>
              <button type="button" className="p-2 text-brand" aria-label={`Delete ${p.name}`} onClick={() => { if (confirm(`Delete ${p.name}?`)) saveCatalog({ ...catalog, promotions: catalog.promotions.filter((x) => x.id !== p.id) }) }}><Trash2 size={18} /></button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------- Settings ----------------

export function SettingsAdmin() {
  const { catalog, saveCatalog, discardLocalEdits, source } = useCatalog()
  const [s, setS] = useState<RestaurantSettings>(catalog.settings)
  const [msg, setMsg] = useState('')
  const [pin, setPin] = useState({ a: '', b: '' })
  useDocumentTitle('Settings')
  const up = (patch: Partial<RestaurantSettings>) => setS({ ...s, ...patch })

  const save = async () => {
    const wa = s.whatsappNumber.replace(/\D/g, '')
    if (wa.length < 8 || wa.length > 15) return setMsg('WhatsApp number must include the country code, digits only (e.g. 233201234567).')
    if (!s.name.trim()) return setMsg('Business name is required.')
    if (s.deliveryZones.some((z) => !z.name.trim() || !(z.fee >= 0))) return setMsg('Every delivery zone needs a name and a fee.')
    await saveCatalog({ ...catalog, settings: { ...s, whatsappNumber: wa } })
    setMsg('Settings saved on this device. Publish them to make them live for customers.')
  }

  const exportJson = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...catalog, settings: s }, null, 2)], { type: 'application/json' }))
    a.download = 'catalog.json'
    a.click()
  }
  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (!isCatalog(data)) throw new Error('bad')
      await saveCatalog(data as Catalog)
      setS((data as Catalog).settings)
      setMsg('Catalog imported on this device.')
    } catch { setMsg('That file is not a valid catalog.json export.') }
  }

  return (
    <div className="space-y-5 pb-24">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      <DemoModeNotice />

      <Section title="Publish changes to customers">
        <p className="text-sm leading-relaxed">
          Current source: <strong>{source === 'local' ? 'unpublished edits on this device' : source === 'published' ? 'published catalog.json' : 'built-in demo menu'}</strong>.
          To make menu, price and settings changes live for everyone: <strong>1)</strong> Export <code>catalog.json</code>, <strong>2)</strong> upload it to the <code>public/</code> folder of your GitHub repository (Add file → Upload files), <strong>3)</strong> commit. The site redeploys automatically in about a minute.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-dark py-2 text-sm" onClick={exportJson}><Download size={16} /> Export catalog.json</button>
          <label className="btn-ghost cursor-pointer py-2 text-sm"><Upload size={16} /> Import catalog.json
            <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
          {source === 'local' && <button type="button" className="btn-ghost py-2 text-sm text-brand" onClick={async () => { if (confirm('Discard all unpublished edits on this device?')) { await discardLocalEdits(); location.reload() } }}>Discard local edits</button>}
        </div>
      </Section>

      <Section title="Business details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Restaurant name" value={s.name} onChange={(name) => up({ name })} />
          <Text label="Tagline" value={s.tagline} onChange={(tagline) => up({ tagline })} />
          <div className="sm:col-span-2"><Text label="Description" value={s.description} onChange={(description) => up({ description })} /></div>
          <Text label="Street address" value={s.address} onChange={(address) => up({ address })} />
          <Text label="City" value={s.city} onChange={(city) => up({ city })} />
          <Text label="Country" value={s.country} onChange={(country) => up({ country })} />
          <Text label="Google Maps link (optional)" value={s.mapUrl} onChange={(mapUrl) => up({ mapUrl })} />
          <Text label="WhatsApp number for orders" value={s.whatsappNumber} onChange={(whatsappNumber) => up({ whatsappNumber })} hint="Country code + number, digits only, e.g. 233201234567" />
          <Text label="Phone (display)" value={s.phone} onChange={(phone) => up({ phone })} />
          <Text label="Email" value={s.email} onChange={(email) => up({ email })} />
        </div>
      </Section>

      <Section title="Currency & phone numbers">
        <div className="flex gap-2">
          <button type="button" className="btn-ghost py-2 text-sm" onClick={() => up({ currency: { code: 'GHS', symbol: 'GH₵', locale: 'en-GH' }, phoneCountryCode: '233', phoneNationalLength: 9 })}>Ghana (GHS)</button>
          <button type="button" className="btn-ghost py-2 text-sm" onClick={() => up({ currency: { code: 'USD', symbol: '$', locale: 'en-US' }, phoneCountryCode: '1', phoneNationalLength: 10 })}>United States (USD)</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Text label="Currency code" value={s.currency.code} onChange={(code) => up({ currency: { ...s.currency, code } })} />
          <Text label="Symbol" value={s.currency.symbol} onChange={(symbol) => up({ currency: { ...s.currency, symbol } })} />
          <Text label="Number format locale" value={s.currency.locale} onChange={(locale) => up({ currency: { ...s.currency, locale } })} />
          <Text label="Country calling code" value={s.phoneCountryCode} onChange={(v) => up({ phoneCountryCode: v.replace(/\D/g, '') })} />
          <Text type="number" label="Local number length (after code)" value={s.phoneNationalLength} onChange={(v) => up({ phoneNationalLength: Number(v) })} hint="0 = don't check length" />
          <Text label="Timezone" value={s.timezone} onChange={(timezone) => up({ timezone })} hint="e.g. Africa/Accra, America/New_York" />
        </div>
      </Section>

      <Section title="Opening hours">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const h = s.hours.find((x) => x.day === d) ?? { day: d, open: '11:00', close: '22:00', closed: true }
          const set = (patch: Partial<typeof h>) => up({ hours: [...s.hours.filter((x) => x.day !== d), { ...h, ...patch }].sort((a, b) => a.day - b.day) })
          return (
            <div key={d} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-28 font-semibold">{DAY_NAMES[d]}</span>
              <input type="time" aria-label={`${DAY_NAMES[d]} opens`} className="field w-32 py-2" value={h.open} disabled={h.closed} onChange={(e) => set({ open: e.target.value })} />
              <span>to</span>
              <input type="time" aria-label={`${DAY_NAMES[d]} closes`} className="field w-32 py-2" value={h.close} disabled={h.closed} onChange={(e) => set({ close: e.target.value })} />
              <Toggle label="Closed" checked={h.closed} onChange={(closed) => set({ closed })} />
            </div>
          )
        })}
        <Toggle label="Accept orders while closed (customers see a notice)" checked={s.acceptOrdersWhenClosed} onChange={(acceptOrdersWhenClosed) => up({ acceptOrdersWhenClosed })} />
      </Section>

      <Section title="Ordering rules">
        <div className="grid gap-3 sm:grid-cols-3">
          <Text type="number" label="Pickup prep time (minutes)" value={s.pickupPrepMinutes} onChange={(v) => up({ pickupPrepMinutes: Number(v) })} />
          <Text type="number" label="Minimum order" value={s.minOrder} onChange={(v) => up({ minOrder: Number(v) })} />
          <Text type="number" label="Free delivery over (blank = never)" value={s.freeDeliveryOver ?? ''} onChange={(v) => up({ freeDeliveryOver: optNum(v) })} />
          <Text type="number" label="Max toppings per pizza" value={s.maxToppings} onChange={(v) => up({ maxToppings: Math.max(0, Number(v)) })} />
          <Text type="number" label="Max quantity per item" value={s.maxQuantityPerLine} onChange={(v) => up({ maxQuantityPerLine: Math.max(1, Number(v)) })} />
        </div>
      </Section>

      <Section title="Delivery zones & fees">
        {s.deliveryZones.map((z, i) => {
          const set = (patch: Partial<typeof z>) => up({ deliveryZones: s.deliveryZones.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
          return (
            <div key={z.id} className="grid items-end gap-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto_auto]">
              <Text label="Neighbourhood" value={z.name} onChange={(name) => set({ name })} />
              <Text type="number" label="Fee" value={z.fee} onChange={(v) => set({ fee: Number(v) })} />
              <Text type="number" label="Min order" value={z.minOrder ?? ''} onChange={(v) => set({ minOrder: optNum(v) })} />
              <Text type="number" label="ETA (min)" value={z.etaMinutes} onChange={(v) => set({ etaMinutes: Number(v) })} />
              <div className="pb-3"><Toggle label="Active" checked={z.active} onChange={(active) => set({ active })} /></div>
              <button type="button" className="mb-2 p-2 text-brand" aria-label={`Delete ${z.name}`} onClick={() => up({ deliveryZones: s.deliveryZones.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>
            </div>
          )
        })}
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => up({ deliveryZones: [...s.deliveryZones, { id: `zone-${Date.now().toString(36)}`, name: '', fee: 0, etaMinutes: 40, active: true }] })}><Plus size={16} /> Add zone</button>
      </Section>

      <Section title="Tax">
        <div className="grid items-end gap-3 sm:grid-cols-4">
          <div className="pb-3"><Toggle label="Charge / show tax" checked={s.tax.enabled} onChange={(enabled) => up({ tax: { ...s.tax, enabled } })} /></div>
          <Text label="Label" value={s.tax.label} onChange={(label) => up({ tax: { ...s.tax, label } })} />
          <Text type="number" label="Rate %" value={s.tax.ratePercent} onChange={(v) => up({ tax: { ...s.tax, ratePercent: Math.max(0, Number(v)) } })} />
          <div className="pb-3"><Toggle label="Prices already include tax" checked={s.tax.inclusive} onChange={(inclusive) => up({ tax: { ...s.tax, inclusive } })} /></div>
        </div>
      </Section>

      <Section title="Payment methods">
        <div className="flex flex-wrap gap-4">
          <Toggle label="Cash on pickup" checked={s.payments.cash_pickup.enabled} onChange={(enabled) => up({ payments: { ...s.payments, cash_pickup: { ...s.payments.cash_pickup, enabled } } })} />
          <Toggle label="Cash on delivery" checked={s.payments.cash_delivery.enabled} onChange={(enabled) => up({ payments: { ...s.payments, cash_delivery: { ...s.payments.cash_delivery, enabled } } })} />
          <Toggle label="Mobile Money" checked={s.payments.momo.enabled} onChange={(enabled) => up({ payments: { ...s.payments, momo: { ...s.payments.momo, enabled } } })} />
          <Toggle label="Bank transfer" checked={s.payments.bank.enabled} onChange={(enabled) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, enabled } } })} />
        </div>
        <h3 className="font-sans text-sm font-bold">Mobile Money accounts</h3>
        {s.payments.momo.accounts.map((a, i) => {
          const set = (patch: Partial<typeof a>) => up({ payments: { ...s.payments, momo: { ...s.payments.momo, accounts: s.payments.momo.accounts.map((x, j) => (j === i ? { ...x, ...patch } : x)) } } })
          return (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
              <Text label="Network" value={a.network} onChange={(network) => set({ network })} />
              <Text label="Number" value={a.number} onChange={(number) => set({ number })} />
              <Text label="Account name" value={a.accountName} onChange={(accountName) => set({ accountName })} />
              <button type="button" className="mb-2 p-2 text-brand" aria-label="Remove account" onClick={() => up({ payments: { ...s.payments, momo: { ...s.payments.momo, accounts: s.payments.momo.accounts.filter((_, j) => j !== i) } } })}><Trash2 size={18} /></button>
            </div>
          )
        })}
        <button type="button" className="text-sm font-bold text-brand" onClick={() => up({ payments: { ...s.payments, momo: { ...s.payments.momo, accounts: [...s.payments.momo.accounts, { network: '', number: '', accountName: '' }] } } })}>+ Add MoMo account</button>
        <Text label="Mobile Money instructions" value={s.payments.momo.instructions} onChange={(instructions) => up({ payments: { ...s.payments, momo: { ...s.payments.momo, instructions } } })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Bank name" value={s.payments.bank.bankName} onChange={(bankName) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, bankName } } })} />
          <Text label="Account name" value={s.payments.bank.accountName} onChange={(accountName) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, accountName } } })} />
          <Text label="Account number" value={s.payments.bank.accountNumber} onChange={(accountNumber) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, accountNumber } } })} />
          <Text label="Branch / routing" value={s.payments.bank.branch} onChange={(branch) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, branch } } })} />
        </div>
        <Text label="Bank transfer instructions" value={s.payments.bank.instructions} onChange={(instructions) => up({ payments: { ...s.payments, bank: { ...s.payments.bank, instructions } } })} />
      </Section>

      <Section title="Admin PIN (demo protection only)">
        <div className="grid gap-3 sm:grid-cols-3">
          <Text type="password" label="New PIN (4–12 digits)" value={pin.a} onChange={(a) => setPin({ ...pin, a })} />
          <Text type="password" label="Repeat PIN" value={pin.b} onChange={(b) => setPin({ ...pin, b })} />
          <button type="button" className="btn-ghost self-end" onClick={async () => {
            if (!/^\d{4,12}$/.test(pin.a)) return setMsg('PIN must be 4–12 digits.')
            if (pin.a !== pin.b) return setMsg('PINs do not match.')
            const adminPinHash = await sha256(pin.a)
            setS({ ...s, adminPinHash })
            await saveCatalog({ ...catalog, settings: { ...s, adminPinHash } })
            sessionStorage.setItem('pz.admin.session', adminPinHash)
            setPin({ a: '', b: '' }); setMsg('PIN changed. Publish catalog.json so the new PIN applies on other devices.')
          }}>Change PIN</button>
        </div>
      </Section>

      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 p-3 backdrop-blur md:left-[220px]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p role="status" className="text-sm font-medium">{msg}</p>
          <button type="button" className="btn-primary" onClick={save}><Save size={18} /> Save settings</button>
        </div>
      </div>
    </div>
  )
}
