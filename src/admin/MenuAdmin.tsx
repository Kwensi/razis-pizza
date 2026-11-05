import { Plus, Save, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { ProductImage, useDocumentTitle, useMoney } from '../components/ui'
import { startingPrice } from '../lib/pricing'
import { SIZE_IDS, type Category, type Crust, type Product, type SizePrices, type Topping } from '../lib/types'
import { useCatalog } from '../state/catalog'
import { DemoModeNotice } from './AdminApp'

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `item-${Date.now().toString(36)}`
const num = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Math.round(Number(v) * 100) / 100))

/** Resize an uploaded photo to 800×600 (cover) and return a compact data URL. */
async function resizeImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Image must be under 10 MB.')
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600
  const ctx = canvas.getContext('2d')!
  const scale = Math.max(800 / bitmap.width, 600 / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.drawImage(bitmap, (800 - w) / 2, (600 - h) / 2, w, h)
  const webp = canvas.toDataURL('image/webp', 0.8)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82)
}

function SizePriceInputs({ value, onChange, idPrefix }: { value: SizePrices; onChange: (v: SizePrices) => void; idPrefix: string }) {
  const { catalog } = useCatalog()
  return (
    <div className="grid grid-cols-4 gap-2">
      {SIZE_IDS.map((id) => (
        <label key={id} className="text-xs font-semibold" htmlFor={`${idPrefix}-${id}`}>
          {catalog.sizes.find((s) => s.id === id)?.name ?? id}
          <input id={`${idPrefix}-${id}`} type="number" min={0} step="0.5" inputMode="decimal" className="field mt-1 px-2 py-2"
            value={value[id] ?? ''} placeholder="—"
            onChange={(e) => { const next = { ...value }; const n = num(e.target.value); if (n === undefined) delete next[id]; else next[id] = n; onChange(next) }} />
        </label>
      ))}
    </div>
  )
}

function ProductEditor({ initial, onClose }: { initial: Product; onClose: () => void }) {
  const { catalog, saveCatalog } = useCatalog()
  const [p, setP] = useState<Product>(initial)
  const [error, setError] = useState('')
  const isNew = !catalog.products.some((x) => x.id === initial.id)
  const category = catalog.categories.find((c) => c.id === p.categoryId)

  const save = async () => {
    if (!p.name.trim()) return setError('Name is required.')
    if (p.kind === 'pizza' && !Object.values(p.prices).some((v) => typeof v === 'number')) return setError('Enter a price for at least one size.')
    if (p.kind === 'simple' && (!p.variants.length || p.variants.some((v) => !v.name.trim() || !(v.price >= 0)))) return setError('Each option needs a name and price.')
    const id = isNew ? (catalog.products.some((x) => x.id === slug(p.name)) ? `${slug(p.name)}-${Date.now().toString(36)}` : slug(p.name)) : p.id
    const product = { ...p, id, name: p.name.trim() }
    await saveCatalog({ ...catalog, products: isNew ? [...catalog.products, product] : catalog.products.map((x) => (x.id === p.id ? product : x)) })
    onClose()
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-xl font-semibold">{isNew ? 'Add product' : `Edit ${initial.name}`}</h2>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div>
          <ProductImage image={p.image} alt="" className="aspect-[4/3] w-full rounded-2xl" />
          <label className="btn-ghost mt-2 w-full cursor-pointer py-2 text-sm"><Upload size={16} /> Upload photo
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return
              try { setP({ ...p, image: await resizeImage(f) }); setError('') } catch (err) { setError((err as Error).message) }
            }} />
          </label>
          <input className="field mt-2 py-2 text-xs" value={p.image.startsWith('data:') ? '(uploaded photo)' : p.image} aria-label="Image path or URL"
            onChange={(e) => setP({ ...p, image: e.target.value })} placeholder="images/name or https://…" />
        </div>
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Name<input className="field mt-1" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Description<textarea className="field mt-1" rows={2} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Category
              <select className="field mt-1" value={p.categoryId} onChange={(e) => setP({ ...p, categoryId: e.target.value })}>
                {catalog.categories.filter((c) => c.kind === p.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Tags (comma separated)
              <input className="field mt-1" value={(p.tags ?? []).join(', ')} onChange={(e) => setP({ ...p, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="Spicy, Vegetarian" />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2"><input type="checkbox" checked={p.enabled} onChange={(e) => setP({ ...p, enabled: e.target.checked })} className="h-5 w-5 accent-[var(--color-brand)]" /> Available</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!p.bestSeller} onChange={(e) => setP({ ...p, bestSeller: e.target.checked })} className="h-5 w-5 accent-[var(--color-brand)]" /> Best seller (homepage)</label>
          </div>
        </div>
      </div>

      {p.kind === 'pizza' ? (
        <>
          <fieldset><legend className="text-sm font-bold">Price per size <span className="font-normal text-ink-soft">(leave blank if not offered)</span></legend>
            <div className="mt-2"><SizePriceInputs idPrefix="pp" value={p.prices} onChange={(prices) => setP({ ...p, prices })} /></div>
          </fieldset>
          <fieldset><legend className="text-sm font-bold">Included toppings</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {catalog.toppings.filter((t) => t.id !== 'extra-cheese').map((t) => {
                const on = p.defaultToppings.includes(t.id)
                return (
                  <label key={t.id} className={`chip cursor-pointer ${on ? 'border-basil bg-[#e4eedc] text-basil' : 'border-ink/15 bg-white'}`}>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => setP({ ...p, defaultToppings: on ? p.defaultToppings.filter((x) => x !== t.id) : [...p.defaultToppings, t.id] })} />{t.name}
                  </label>
                )
              })}
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset><legend className="text-sm font-bold">Options &amp; prices</legend>
          <div className="mt-2 space-y-2">
            {p.variants.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input className="field py-2" aria-label="Option name" value={v.name} onChange={(e) => setP({ ...p, variants: p.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input className="field w-32 py-2" aria-label="Option price" type="number" min={0} step="0.5" value={v.price} onChange={(e) => setP({ ...p, variants: p.variants.map((x, j) => (j === i ? { ...x, price: num(e.target.value) ?? 0 } : x)) })} />
                <button type="button" aria-label="Remove option" className="px-2 text-brand disabled:opacity-30" disabled={p.variants.length === 1} onClick={() => setP({ ...p, variants: p.variants.filter((_, j) => j !== i) })}><Trash2 size={18} /></button>
              </div>
            ))}
            <button type="button" className="text-sm font-bold text-brand" onClick={() => setP({ ...p, variants: [...p.variants, { id: `v${Date.now().toString(36)}`, name: '', price: 0 }] })}>+ Add option</button>
          </div>
        </fieldset>
      )}
      {!category?.enabled && <p className="text-sm text-ink-soft">Note: this category is hidden from customers.</p>}
      {error && <p role="alert" className="text-sm font-medium text-brand">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" onClick={save}><Save size={18} /> Save</button>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

function Products() {
  const { catalog, saveCatalog } = useCatalog()
  const money = useMoney()
  const [editing, setEditing] = useState<Product | null>(null)
  const [q, setQ] = useState('')
  const blank = (kind: 'pizza' | 'simple'): Product => {
    const categoryId = catalog.categories.find((c) => c.kind === kind)?.id ?? ''
    return kind === 'pizza'
      ? { kind, id: `new-${Date.now()}`, name: '', description: '', categoryId, image: 'images/margherita', enabled: true, prices: { M: 0 }, defaultToppings: [] }
      : { kind, id: `new-${Date.now()}`, name: '', description: '', categoryId, image: 'images/fries', enabled: true, variants: [{ id: 'reg', name: 'Regular', price: 0 }] }
  }
  if (editing) return <ProductEditor initial={editing} onClose={() => setEditing(null)} />
  const list = catalog.products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs py-2" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <button type="button" className="btn-primary py-2 text-sm" onClick={() => setEditing(blank('pizza'))}><Plus size={16} /> Pizza</button>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setEditing(blank('simple'))}><Plus size={16} /> Side / drink / dessert</button>
      </div>
      <ul className="grid gap-2">
        {list.map((p) => (
          <li key={p.id} className={`card flex items-center gap-3 p-3 ${p.enabled ? '' : 'opacity-60'}`}>
            <ProductImage image={p.image} alt="" sizes="64px" className="h-14 w-14 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{p.name}</p>
              <p className="text-xs text-ink-soft">{catalog.categories.find((c) => c.id === p.categoryId)?.name} · from {money(startingPrice(catalog, p))}</p>
            </div>
            <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={p.enabled}
              onChange={(e) => saveCatalog({ ...catalog, products: catalog.products.map((x) => (x.id === p.id ? { ...x, enabled: e.target.checked } : x)) })} />On</label>
            <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setEditing(p)}>Edit</button>
            <button type="button" aria-label={`Delete ${p.name}`} className="p-2 text-brand" onClick={() => {
              if (confirm(`Delete ${p.name}? This cannot be undone.`)) saveCatalog({ ...catalog, products: catalog.products.filter((x) => x.id !== p.id) })
            }}><Trash2 size={18} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Categories() {
  const { catalog, saveCatalog } = useCatalog()
  const [rows, setRows] = useState<Category[]>(catalog.categories)
  const [msg, setMsg] = useState('')
  const set = (i: number, patch: Partial<Category>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <div className="card space-y-3 p-5">
      {rows.map((c, i) => (
        <div key={c.id} className="grid items-center gap-2 sm:grid-cols-[60px_1fr_1.5fr_90px_auto_auto]">
          <input type="number" aria-label="Sort order" className="field px-2 py-2" value={c.sortOrder} onChange={(e) => set(i, { sortOrder: Number(e.target.value) })} />
          <input aria-label="Category name" className="field py-2" value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
          <input aria-label="Category description" className="field py-2" value={c.description} onChange={(e) => set(i, { description: e.target.value })} />
          <span className="text-xs font-semibold text-ink-soft">{c.kind === 'pizza' ? 'Pizza' : 'Simple'}</span>
          <label className="flex items-center gap-1.5 text-xs font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={c.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} />Visible</label>
          <button type="button" aria-label={`Delete ${c.name}`} className="p-2 text-brand" onClick={() => {
            if (catalog.products.some((p) => p.categoryId === c.id)) return setMsg(`Move or delete the products in “${c.name}” first.`)
            setRows(rows.filter((_, j) => j !== i))
          }}><Trash2 size={18} /></button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setRows([...rows, { id: `cat-${Date.now().toString(36)}`, name: 'New category', description: '', kind: 'pizza', enabled: false, sortOrder: rows.length + 1 }])}>+ Pizza category</button>
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setRows([...rows, { id: `cat-${Date.now().toString(36)}`, name: 'New category', description: '', kind: 'simple', enabled: false, sortOrder: rows.length + 1 }])}>+ Other category</button>
        <button type="button" className="btn-primary py-2 text-sm" onClick={async () => { await saveCatalog({ ...catalog, categories: rows }); setMsg('Categories saved.') }}><Save size={16} /> Save categories</button>
      </div>
      {msg && <p role="status" className="text-sm font-medium">{msg}</p>}
    </div>
  )
}

function ToppingsAndCrusts() {
  const { catalog, saveCatalog } = useCatalog()
  const [toppings, setToppings] = useState<Topping[]>(catalog.toppings)
  const [crusts, setCrusts] = useState<Crust[]>(catalog.crusts)
  const [msg, setMsg] = useState('')
  const max = catalog.settings.maxToppings
  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-semibold">Toppings &amp; extra charges</h2>
        <p className="text-sm text-ink-soft">Charge per size when a customer adds the topping. “Extra cheese” prices are used for the Extra (×1) and Double (×2) cheese options.</p>
        {toppings.map((t, i) => (
          <div key={t.id} className="grid items-end gap-2 border-b border-ink/5 pb-3 lg:grid-cols-[1fr_2fr_auto_auto_auto]">
            <input aria-label="Topping name" className="field py-2" value={t.name} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <SizePriceInputs idPrefix={`t-${t.id}`} value={t.prices} onChange={(prices) => setToppings(toppings.map((x, j) => (j === i ? { ...x, prices } : x)))} />
            <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-basil)]" checked={t.vegetarian} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, vegetarian: e.target.checked } : x)))} />Veg</label>
            <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={t.enabled} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))} />On</label>
            <button type="button" aria-label={`Delete ${t.name}`} className="p-2 text-brand disabled:opacity-30" disabled={t.id === 'extra-cheese'} onClick={() => setToppings(toppings.filter((_, j) => j !== i))}><Trash2 size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn-ghost py-2 text-sm" onClick={() => setToppings([...toppings, { id: `top-${Date.now().toString(36)}`, name: 'New topping', prices: { S: 0, M: 0, L: 0, XL: 0 }, vegetarian: true, enabled: true }])}>+ Add topping</button>
      </section>
      <section className="card space-y-3 p-5">
        <h2 className="text-xl font-semibold">Crusts</h2>
        <p className="text-sm text-ink-soft">Surcharge per size. Leave a size blank to make the crust unavailable in that size.</p>
        {crusts.map((c, i) => (
          <div key={c.id} className="grid items-end gap-2 border-b border-ink/5 pb-3 lg:grid-cols-[1fr_1fr_2fr_auto]">
            <input aria-label="Crust name" className="field py-2" value={c.name} onChange={(e) => setCrusts(crusts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input aria-label="Crust description" className="field py-2" value={c.description} onChange={(e) => setCrusts(crusts.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <SizePriceInputs idPrefix={`c-${c.id}`} value={c.prices} onChange={(prices) => setCrusts(crusts.map((x, j) => (j === i ? { ...x, prices } : x)))} />
            <label className="flex items-center gap-1.5 pb-2 text-xs font-semibold"><input type="checkbox" className="h-5 w-5 accent-[var(--color-brand)]" checked={c.enabled} onChange={(e) => setCrusts(crusts.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))} />On</label>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={async () => {
          if (!crusts.some((c) => c.enabled)) return setMsg('At least one crust must stay enabled.')
          await saveCatalog({ ...catalog, toppings, crusts }); setMsg('Saved. New prices apply immediately on this device.')
        }}><Save size={18} /> Save toppings &amp; crusts</button>
        <span className="text-sm text-ink-soft">Max toppings per pizza: {max} (change in Settings)</span>
      </div>
      {msg && <p role="status" className="text-sm font-medium">{msg}</p>}
    </div>
  )
}

export default function MenuAdmin() {
  const [tab, setTab] = useState<'products' | 'categories' | 'toppings'>('products')
  useDocumentTitle('Menu')
  const tabs = [['products', 'Products'], ['categories', 'Categories'], ['toppings', 'Toppings & crusts']] as const
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Menu</h1>
      <DemoModeNotice />
      <div className="flex gap-2" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`chip ${tab === id ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>{label}</button>
        ))}
      </div>
      {tab === 'products' && <Products />}
      {tab === 'categories' && <Categories />}
      {tab === 'toppings' && <ToppingsAndCrusts />}
    </div>
  )
}
