/* eslint-disable react-refresh/only-export-components */
import { Flame, Leaf, Minus, Plus, Star } from 'lucide-react'
import { useEffect } from 'react'
import { availableSizes, formatMoney, startingPrice } from '../lib/pricing'
import type { Product } from '../lib/types'
import { useCatalog } from '../state/catalog'

/** Responsive product photo. "images/name" → name-400.webp / name-800.webp; URLs and data URLs are used as-is. */
export function ProductImage({ image, alt, sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw', className = '', eager = false }: {
  image: string; alt: string; sizes?: string; className?: string; eager?: boolean
}) {
  const direct = /^(data:|blob:|https?:)/.test(image) || /\.(webp|jpe?g|png|avif|gif|svg)$/i.test(image)
  return (
    <img
      src={direct ? image : `${image}-800.webp`}
      srcSet={direct ? undefined : `${image}-400.webp 400w, ${image}-800.webp 800w`}
      sizes={direct ? undefined : sizes}
      alt={alt}
      width={800}
      height={600}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`bg-cream-deep object-cover ${className}`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
    />
  )
}

export function useMoney() {
  const { catalog } = useCatalog()
  return (minor: number) => formatMoney(minor, catalog.settings.currency)
}

export function useDocumentTitle(title: string, description?: string) {
  const { catalog } = useCatalog()
  useEffect(() => {
    document.title = title ? `${title} · ${catalog.settings.name}` : `${catalog.settings.name} — ${catalog.settings.tagline}`
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description, catalog.settings.name, catalog.settings.tagline])
}

export function QuantityStepper({ value, onChange, min = 1, max, label, size = 'md' }: {
  value: number; onChange: (v: number) => void; min?: number; max: number; label: string; size?: 'sm' | 'md'
}) {
  const btn = size === 'sm' ? 'h-8 w-8' : 'h-11 w-11'
  return (
    <div className="inline-flex items-center rounded-full border border-ink/15 bg-white" role="group" aria-label={label}>
      <button type="button" className={`${btn} grid place-items-center rounded-full hover:bg-cream disabled:opacity-40`}
        onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus size={16} />
      </button>
      <output className="min-w-8 text-center font-bold tabular-nums" aria-live="polite">{value}</output>
      <button type="button" className={`${btn} grid place-items-center rounded-full hover:bg-cream disabled:opacity-40`}
        onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus size={16} />
      </button>
    </div>
  )
}

export function Tag({ label }: { label: string }) {
  const icon = label === 'Spicy' ? <Flame size={12} /> : label === 'Vegetarian' ? <Leaf size={12} /> : <Star size={12} />
  const tone = label === 'Spicy' ? 'bg-brand-soft text-brand-dark' : label === 'Vegetarian' ? 'bg-[#e4eedc] text-basil' : 'bg-[#f8ead2] text-[#7a4a0c]'
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{icon}{label}</span>
}

export function ProductCard({ product, onSelect, priority = false }: { product: Product; onSelect: () => void; priority?: boolean }) {
  const { catalog } = useCatalog()
  const money = useMoney()
  const sizes = product.kind === 'pizza' ? availableSizes(catalog, product) : []
  const customizable = product.kind === 'pizza'
  return (
    <article className="card group flex flex-col overflow-hidden">
      <button type="button" onClick={onSelect} className="relative block overflow-hidden text-left" aria-label={`Choose ${product.name}`}>
        <ProductImage image={product.image} alt={product.name} eager={priority}
          className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03]" />
        {product.bestSeller && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-bold text-white backdrop-blur">Best seller</span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold leading-tight">{product.name}</h3>
          <p className="shrink-0 text-right text-sm text-ink-soft">
            {(customizable || (product.kind === 'simple' && product.variants.length > 1)) && 'From '}
            <span className="text-base font-bold text-ink">{money(startingPrice(catalog, product))}</span>
          </p>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{product.description}</p>
        {!!product.tags?.length && <div className="flex flex-wrap gap-1.5">{product.tags.map((t) => <Tag key={t} label={t} />)}</div>}
        {customizable && (
          <p className="text-xs font-medium text-ink-soft">
            Sizes: {sizes.map((s) => catalog.sizes.find((x) => x.id === s)?.name).join(' · ')}
            <span className="block">Choose crust, toppings &amp; cheese</span>
          </p>
        )}
        <button type="button" onClick={onSelect} className="btn-primary mt-auto w-full">
          <Plus size={18} /> {customizable ? 'Customise & add' : 'Add to cart'}
        </button>
      </div>
    </article>
  )
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-ink-soft">{children}</p>}
    </div>
  )
}
