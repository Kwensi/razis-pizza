import { Search, WifiOff } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard, useDocumentTitle } from '../components/ui'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'

export default function Menu() {
  const { catalog } = useCatalog()
  const { openCustomizer } = useCart()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState(() => navigator.onLine)
  useDocumentTitle('Menu', `Browse pizzas, sides, drinks and desserts from ${catalog.settings.name} and order online.`)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  const categories = useMemo(() => catalog.categories.filter((c) => c.enabled).sort((a, b) => a.sortOrder - b.sortOrder), [catalog])
  const q = query.trim().toLowerCase()
  const sections = categories
    .map((c) => ({
      category: c,
      products: catalog.products.filter((p) => p.enabled && p.categoryId === c.id && (!q || `${p.name} ${p.description} ${p.tags?.join(' ')}`.toLowerCase().includes(q))),
    }))
    .filter((s) => s.products.length > 0)

  const active = params.get('c')
  useEffect(() => {
    if (!active) return
    document.getElementById(`cat-${active}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [active])

  return (
    <div className="container-page pb-10 pt-8">
      <header className="max-w-2xl">
        <p className="eyebrow">Order online</p>
        <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">Our menu</h1>
        <p className="mt-3 text-ink-soft">Tap any pizza to choose its size, crust, cheese and toppings. Prices update as you go.</p>
      </header>

      {!online && (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-cream-deep px-4 py-3 text-sm font-medium">
          <WifiOff size={18} /> You’re offline. You can browse and build your order; you’ll need a connection to send it.
        </p>
      )}

      <div className="sticky top-16 z-20 -mx-4 mt-6 border-b border-ink/5 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <label className="relative block">
          <span className="sr-only">Search the menu</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pizzas, sides, drinks…" className="field pl-11" />
        </label>
        <nav aria-label="Menu categories" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setParams({ c: c.id }, { replace: true })}
              className={`chip shrink-0 ${active === c.id ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/40'}`}>
              {c.name}
            </button>
          ))}
        </nav>
      </div>

      {sections.length === 0 && <p className="py-16 text-center text-ink-soft">Nothing matches “{query}”. Try another search.</p>}

      {sections.map(({ category, products }, si) => (
        <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-44 pt-10" aria-labelledby={`h-${category.id}`}>
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <h2 id={`h-${category.id}`} className="text-2xl font-semibold sm:text-3xl">{category.name}</h2>
            <p className="text-sm text-ink-soft">{category.description}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => <ProductCard key={p.id} product={p} priority={si === 0 && i < 2} onSelect={() => openCustomizer(p.id)} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
