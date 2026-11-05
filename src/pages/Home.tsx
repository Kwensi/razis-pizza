import { ArrowRight, Bike, Clock, MapPin, MessageCircle, Phone, ShoppingBag, Star, Tag as TagIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { mapUrl, whatsAppContactUrl } from '../components/Layout'
import { ProductCard, ProductImage, SectionHeading, useDocumentTitle, useMoney } from '../components/ui'
import { DAY_NAMES, openStatus } from '../lib/hours'
import { toMinor } from '../lib/pricing'
import { isPromotionLive } from '../lib/promotions'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'

export default function Home() {
  const { catalog } = useCatalog()
  const { openCustomizer } = useCart()
  const money = useMoney()
  const s = catalog.settings
  useDocumentTitle('')
  const status = openStatus(s.hours, new Date(), s.timezone)
  const visible = catalog.products.filter((p) => p.enabled && catalog.categories.find((c) => c.id === p.categoryId)?.enabled)
  const bestSellers = visible.filter((p) => p.bestSeller).slice(0, 6)
  const offers = catalog.promotions.filter((p) => p.featured && isPromotionLive(p, new Date()))
  const collections = catalog.categories.filter((c) => c.enabled && c.kind === 'pizza').sort((a, b) => a.sortOrder - b.sortOrder)
  const cover = (catId: string) => visible.find((p) => p.categoryId === catId)?.image ?? 'images/margherita'
  const cheapestZone = s.deliveryZones.filter((z) => z.active).sort((a, b) => a.fee - b.fee)[0]

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <picture>
          <source media="(min-width: 961px)" srcSet="images/hero-1600.webp" />
          <img src="images/hero-960.webp" alt="A freshly baked pizza on a wooden board" fetchPriority="high"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" width={1600} height={900} />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/10" />
        <div className="container-page flex min-h-[78svh] flex-col justify-end py-14 sm:min-h-[640px] sm:justify-center">
          <p className={`mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${status.open ? 'bg-[#1d8a4b]' : 'bg-white/15'}`}>
            <span className={`h-2 w-2 rounded-full ${status.open ? 'bg-white' : 'bg-[#f4c46a]'}`} />{status.label}
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] sm:text-7xl">{s.tagline}</h1>
          <p className="mt-5 max-w-lg text-lg text-white/85">{s.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/menu" className="btn-primary px-7 py-4 text-lg"><ShoppingBag size={20} /> Order now</Link>
            <a href={whatsAppContactUrl(s)} target="_blank" rel="noopener noreferrer" className="btn border border-white/30 bg-white/10 px-6 py-4 text-white backdrop-blur hover:bg-white/20">
              <MessageCircle size={20} /> Chat on WhatsApp
            </a>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/15 pt-6 text-sm">
            <div><dt className="text-white/60">Pickup</dt><dd className="font-bold">~{s.pickupPrepMinutes} min</dd></div>
            <div><dt className="text-white/60">Delivery from</dt><dd className="font-bold">{cheapestZone ? money(toMinor(cheapestZone.fee)) : '—'}</dd></div>
            <div><dt className="text-white/60">Free delivery</dt><dd className="font-bold">{s.freeDeliveryOver ? `over ${money(toMinor(s.freeDeliveryOver))}` : '—'}</dd></div>
          </dl>
        </div>
      </section>

      {/* Collections */}
      <section className="container-page py-16 sm:py-20" aria-labelledby="collections">
        <SectionHeading eyebrow="The menu" title="Find your perfect pizza" />
        <h2 id="collections" className="sr-only">Pizza collections</h2>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {collections.map((c) => (
            <Link key={c.id} to={`/menu?c=${c.id}`} className="group relative w-40 shrink-0 snap-start overflow-hidden rounded-3xl sm:w-auto">
              <ProductImage image={cover(c.id)} alt="" sizes="200px" className="aspect-[3/4] w-full transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              <span className="absolute inset-x-3 bottom-3 text-white">
                <span className="block font-display text-lg font-semibold leading-tight">{c.name}</span>
                <span className="text-xs text-white/80">{c.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="bg-cream-deep/60 py-16 sm:py-20">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <SectionHeading eyebrow="Most loved" title="Best sellers">Ordered again and again by our regulars.</SectionHeading>
              <Link to="/menu" className="mb-8 hidden shrink-0 items-center gap-1 font-bold text-brand sm:flex">Full menu <ArrowRight size={18} /></Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {bestSellers.map((p) => <ProductCard key={p.id} product={p} onSelect={() => openCustomizer(p.id)} />)}
            </div>
          </div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container-page py-16 sm:py-20">
          <SectionHeading eyebrow="Special offers" title="Deals worth sharing" />
          <div className="grid gap-5 md:grid-cols-3">
            {offers.map((o, i) => (
              <article key={o.id} className={`relative overflow-hidden rounded-3xl p-7 ${i === 0 ? 'bg-brand text-white' : 'card'}`}>
                <TagIcon className={i === 0 ? 'text-white/70' : 'text-brand'} />
                <h3 className="mt-4 text-2xl font-semibold">{o.name}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${i === 0 ? 'text-white/85' : 'text-ink-soft'}`}>{o.description}</p>
                {o.code
                  ? <p className={`mt-5 inline-block rounded-xl border-2 border-dashed px-3 py-1.5 font-mono text-sm font-bold ${i === 0 ? 'border-white/50' : 'border-brand/40 text-brand'}`}>{o.code}</p>
                  : <p className={`mt-5 text-sm font-bold ${i === 0 ? '' : 'text-basil'}`}>Applied automatically at checkout</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Story */}
      <section className="container-page grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <ProductImage image="images/story" alt="A pizza being sliced with fresh tomato and basil" className="aspect-[4/3] w-full rounded-[32px]" />
        <div>
          <p className="eyebrow">Our kitchen</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Dough proved for 48 hours. Baked in minutes.</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Every base is hand-stretched to order from dough we prove slowly for two days, then baked at over 400°C so it blisters outside and stays tender inside.
            We use real mozzarella, San Marzano-style tomatoes and produce from local farms.
          </p>
          <ul className="mt-6 grid gap-3 text-sm font-semibold sm:grid-cols-2">
            <li className="flex items-center gap-2"><Bike size={18} className="text-brand" /> Hot delivery across the city</li>
            <li className="flex items-center gap-2"><Clock size={18} className="text-brand" /> Ready for pickup in ~{s.pickupPrepMinutes} min</li>
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      {s.testimonials.length > 0 && (
        <section className="container-page py-16 sm:py-20">
          <SectionHeading eyebrow="Reviews" title="What our customers say" />
          <div className="grid gap-5 md:grid-cols-3">
            {s.testimonials.map((t) => (
              <figure key={t.name} className="card p-7">
                <div className="flex gap-0.5 text-gold" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <blockquote className="mt-4 font-display text-lg leading-snug">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-sm font-bold">{t.name} <span className="font-medium text-ink-soft">· {t.location}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Hours & location */}
      <section className="container-page pb-4" aria-labelledby="visit">
        <div className="grid overflow-hidden rounded-[32px] bg-ink text-white md:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-[#f4c46a]">Visit us</p>
            <h2 id="visit" className="mt-2 text-3xl font-semibold">Opening hours</h2>
            <dl className="mt-6 divide-y divide-white/10 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const h = s.hours.find((x) => x.day === d)
                const today = new Date().getDay() === d
                return (
                  <div key={d} className={`flex justify-between py-2.5 ${today ? 'font-bold text-[#f4c46a]' : ''}`}>
                    <dt>{DAY_NAMES[d]}{today && ' (today)'}</dt>
                    <dd className="tabular-nums">{!h || h.closed ? 'Closed' : `${h.open} – ${h.close === '00:00' ? 'midnight' : h.close}`}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
          <div className="flex flex-col justify-between gap-8 bg-white/5 p-8 sm:p-12">
            <div className="space-y-5">
              <p className="flex gap-3"><MapPin className="shrink-0 text-[#f4c46a]" /><span>{s.address}<br />{s.city}, {s.country}</span></p>
              <p className="flex gap-3"><Phone className="shrink-0 text-[#f4c46a]" /><a href={`tel:${s.phone.replace(/\s/g, '')}`} className="underline-offset-4 hover:underline">{s.phone}</a></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={mapUrl(s)} target="_blank" rel="noopener noreferrer" className="btn bg-white text-ink hover:bg-cream"><MapPin size={18} /> Get directions</a>
              <a href={whatsAppContactUrl(s)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp"><MessageCircle size={18} /> WhatsApp</a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
