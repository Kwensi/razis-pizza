import { ArrowRight, Bike, Flame, Leaf, MapPin, MessageCircle, Phone, ShoppingBag, Star, Tag as TagIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { mapUrl, ServesLine, whatsAppContactUrl } from '../components/Layout'
import { ProductCard, ProductImage, SectionHeading, useDocumentTitle, useMoney } from '../components/ui'
import { DAY_NAMES, openStatus } from '../lib/hours'
import { toMinor } from '../lib/pricing'
import { isPromotionLive } from '../lib/promotions'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'

/** Round stamp badge from the flyers, e.g. "FRESH INGREDIENTS ★ BOLD TASTE". */
function StampBadge({ top, bottom, icon, id }: { top: string; bottom: string; icon: ReactNode; id: string }) {
  return (
    <div className="relative mx-auto aspect-square w-28 text-gold sm:w-40" role="img" aria-label={`${top}, ${bottom}`}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="5" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="3" />
        <defs>
          <path id={`${id}-t`} d="M 28 100 A 72 72 0 0 1 172 100" />
          <path id={`${id}-b`} d="M 22 100 A 78 78 0 0 0 178 100" />
        </defs>
        <text fill="currentColor" fontFamily="Anton, Impact, sans-serif" fontSize="22" letterSpacing="1.5">
          <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">{top.toUpperCase()}</textPath>
        </text>
        <text fill="currentColor" fontFamily="Anton, Impact, sans-serif" fontSize="22" letterSpacing="1.5">
          <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">{bottom.toUpperCase()}</textPath>
        </text>
        <text x="22" y="108" fill="currentColor" fontSize="16">★</text>
        <text x="164" y="108" fill="currentColor" fontSize="16">★</text>
      </svg>
      <span className="absolute inset-0 grid place-items-center">{icon}</span>
    </div>
  )
}

export default function Home() {
  const { catalog } = useCatalog()
  const { openCustomizer } = useCart()
  const money = useMoney()
  const s = catalog.settings
  const brand = s.brand
  useDocumentTitle('')
  const status = openStatus(s.hours, new Date(), s.timezone)
  const visible = catalog.products.filter((p) => p.enabled && catalog.categories.find((c) => c.id === p.categoryId)?.enabled)
  const bestSellers = visible.filter((p) => p.bestSeller).slice(0, 6)
  const offers = catalog.promotions.filter((p) => p.featured && isPromotionLive(p, new Date()))
  const cheapestZone = s.deliveryZones.filter((z) => z.active).sort((a, b) => a.fee - b.fee)[0]
  const firstEnabled = (...ids: string[]) => ids.find((id) => catalog.categories.find((c) => c.id === id)?.enabled)

  const serves = [
    { title: 'Pizza', strap: 'Handcrafted. Loaded.', image: 'images/razis-supreme', to: firstEnabled('signature', 'classic') },
    { title: 'Shawarma', strap: 'Bold flavour. Perfect wrap.', image: 'images/shawarma', to: firstEnabled('shawarma') },
    { title: 'Peri-peri wings', strap: 'Hot & flavourful', image: 'images/peri-wings', to: firstEnabled('grills') },
    { title: 'Grilled chicken', strap: 'Crispy fries. Perfect combo.', image: 'images/grilled-chicken-fries', to: firstEnabled('grills') },
  ].filter((x) => x.to)

  return (
    <>
      {/* Hero, styled after the printed flyers */}
      <section className="bg-grunge relative overflow-hidden text-white">
        <div className="container-page grid items-center gap-8 pb-12 pt-8 md:grid-cols-[1.05fr_1fr] md:py-16">
          <div>
            <p className={`mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${status.open ? 'bg-[#1d8a4b]' : 'bg-white/15'}`}>
              <span className={`h-2 w-2 rounded-full ${status.open ? 'bg-white' : 'bg-gold'}`} />{status.label}
            </p>
            <h1 className="leading-[0.86]">
              <span className="block text-5xl text-gold sm:text-6xl">{brand.heroKicker}</span>
              <span className="block text-[6.5rem] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:text-[9rem]">{brand.heroTitle}</span>
            </h1>
            <p className="brush mt-3 inline-block -rotate-1 bg-gold px-5 py-2 font-display text-lg uppercase tracking-wide text-ink sm:text-2xl">
              {brand.heroStrap}
            </p>
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{s.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/menu" className="btn-primary px-7 py-4 font-display text-xl uppercase tracking-wide"><ShoppingBag size={20} /> Order now</Link>
              <a href={whatsAppContactUrl(s)} target="_blank" rel="noopener noreferrer" className="btn border border-white/25 bg-white/5 px-6 py-4 text-white hover:bg-white/15">
                <MessageCircle size={20} /> WhatsApp us
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="brush absolute inset-[6%] -rotate-3 bg-brand" aria-hidden />
            <ProductImage image="images/razis-supreme" alt="Razi's Supreme pizza with a stretchy cheese pull" eager
              sizes="(min-width: 768px) 50vw, 100vw" className="relative aspect-[4/3] w-full rounded-[28px] shadow-2xl shadow-black/50" />
          </div>
        </div>
      </section>

      {/* Service bar: Fast delivery | Order now | Takeout */}
      <section aria-label="How to get your food" className="bg-grunge pb-2">
        <div className="brush mx-auto grid max-w-5xl grid-cols-3 divide-x divide-white/20 bg-brand py-4 text-white">
          <div className="flex flex-col items-center gap-1 px-2 text-center sm:flex-row sm:justify-center sm:gap-3">
            <Bike className="text-white" size={30} />
            <span className="font-display text-base uppercase leading-tight text-gold sm:text-2xl">Fast<br className="sm:hidden" /> delivery</span>
          </div>
          <Link to="/menu" className="flex flex-col items-center gap-1 px-2 text-center sm:flex-row sm:justify-center sm:gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gold text-brand"><Phone size={17} /></span>
            <span className="font-display text-base uppercase leading-tight text-gold sm:text-2xl">Order<br className="sm:hidden" /> now!</span>
          </Link>
          <div className="flex flex-col items-center gap-1 px-2 text-center sm:flex-row sm:justify-center sm:gap-3">
            <ShoppingBag className="text-gold" size={30} />
            <span className="font-display text-base uppercase leading-tight text-gold sm:text-2xl">Takeout<br className="sm:hidden" /> available</span>
          </div>
        </div>
        <div className="container-page grid grid-cols-[1fr_1.3fr_1fr] items-center gap-2 py-10 sm:gap-8">
          <StampBadge id="fresh" top="Fresh ingredients" bottom="Bold taste" icon={<Leaf className="h-9 w-9 sm:h-12 sm:w-12" fill="currentColor" />} />
          <div className="flex flex-col items-center" aria-label="Made fresh, wrapped right, served hot">
            <span className="ribbon whitespace-nowrap bg-gold px-5 py-1.5 font-display text-base uppercase text-ink sm:px-8 sm:text-3xl">Made fresh</span>
            <span className="-mt-0.5 whitespace-nowrap bg-night-soft px-3 py-1 font-display text-sm uppercase text-white ring-1 ring-white/10 sm:text-2xl">Wrapped right</span>
            <span className="ribbon -mt-0.5 whitespace-nowrap bg-brand px-5 py-1.5 font-display text-base uppercase text-white sm:px-8 sm:text-3xl">Served hot!</span>
          </div>
          <StampBadge id="grill" top="Grilled" bottom="To perfection" icon={<Flame className="h-9 w-9 sm:h-12 sm:w-12" fill="currentColor" />} />
        </div>
        <ServesLine className="pb-8 text-white/90" />
      </section>

      {/* What we serve */}
      {serves.length > 0 && (
        <section className="container-page py-14 sm:py-20" aria-labelledby="serves">
          <SectionHeading eyebrow="What we serve" title="Your crave, our creation" />
          <h2 id="serves" className="sr-only">What we serve</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {serves.map((x) => (
              <Link key={x.title} to={`/menu?c=${x.to}`} className="group relative overflow-hidden rounded-3xl bg-night">
                <ProductImage image={x.image} alt="" sizes="(min-width: 1024px) 25vw, 50vw" className="aspect-[4/5] w-full opacity-90 transition duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent" />
                <span className="absolute inset-x-3 bottom-3">
                  <span className="block font-display text-2xl uppercase leading-none text-white sm:text-3xl">{x.title}</span>
                  <span className="brush mt-1.5 inline-block bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase text-ink sm:text-xs">{x.strap}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="bg-cream-deep/60 py-14 sm:py-20">
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
        <section className="container-page py-14 sm:py-20">
          <SectionHeading eyebrow="Special offers" title="Deals worth sharing" />
          <div className="grid gap-5 md:grid-cols-3">
            {offers.map((o, i) => (
              <article key={o.id} className={`relative overflow-hidden rounded-3xl p-7 text-white ${i === 0 ? 'bg-brand' : 'bg-grunge'}`}>
                <TagIcon className="text-gold" />
                <h3 className="mt-4 text-3xl">{o.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/85">{o.description}</p>
                {o.code
                  ? <p className="brush mt-5 inline-block bg-gold px-4 py-1.5 font-mono text-sm font-bold text-ink">{o.code}</p>
                  : <p className="mt-5 text-sm font-bold text-gold">Applied automatically at checkout</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Authentic flavours */}
      <section className="container-page grid items-center gap-10 py-10 md:grid-cols-2 md:py-16">
        <div className="relative">
          <div className="brush absolute inset-[5%] rotate-2 bg-brand" aria-hidden />
          <ProductImage image="images/shawarma" alt="Chicken and beef shawarma wraps" className="relative aspect-[4/3] w-full rounded-[28px]" />
        </div>
        <div>
          <p className="brush inline-block bg-brand px-4 py-1.5 font-display text-xl uppercase text-white">Authentic flavours</p>
          <h2 className="mt-4 text-4xl sm:text-5xl">Made fresh. Wrapped right. Served hot!</h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Everything is made with fresh ingredients, rich cheese and our signature sauce, from loaded pizzas to juicy shawarma
            and peri-peri wings with our green pepper &amp; ginger sauce. Every bite is a burst of flavour.
          </p>
          <ul className="mt-6 grid gap-3 text-sm font-semibold sm:grid-cols-2">
            <li className="flex items-center gap-2"><Bike size={18} className="text-brand" /> Fast delivery across {s.city}</li>
            <li className="flex items-center gap-2"><ShoppingBag size={18} className="text-brand" /> Takeout ready in ~{s.pickupPrepMinutes} min</li>
            <li className="flex items-center gap-2"><MapPin size={18} className="text-brand" /> Delivery from {cheapestZone ? money(toMinor(cheapestZone.fee)) : '—'}</li>
            {s.freeDeliveryOver ? <li className="flex items-center gap-2"><Star size={18} className="text-brand" /> Free delivery over {money(toMinor(s.freeDeliveryOver))}</li> : null}
          </ul>
        </div>
      </section>

      {/* Testimonials */}
      {s.testimonials.length > 0 && (
        <section className="container-page py-14 sm:py-20">
          <SectionHeading eyebrow="Reviews" title="What our customers say" />
          <div className="grid gap-5 md:grid-cols-3">
            {s.testimonials.map((t) => (
              <figure key={t.name} className="card border-t-4 border-gold p-7">
                <div className="flex gap-0.5 text-gold" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }, (_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <blockquote className="mt-4 text-lg font-semibold leading-snug">“{t.quote}”</blockquote>
                <figcaption className="mt-5 text-sm font-bold">{t.name} <span className="font-medium text-ink-soft">· {t.location}</span></figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Hours & location */}
      <section className="container-page pb-4" aria-labelledby="visit">
        <div className="bg-grunge grid overflow-hidden rounded-[32px] text-white md:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="eyebrow text-gold">Visit us</p>
            <h2 id="visit" className="mt-2 text-4xl">Opening hours</h2>
            <dl className="mt-6 divide-y divide-white/10 text-sm">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const h = s.hours.find((x) => x.day === d)
                const today = new Date().getDay() === d
                return (
                  <div key={d} className={`flex justify-between py-2.5 ${today ? 'font-bold text-gold' : ''}`}>
                    <dt>{DAY_NAMES[d]}{today && ' (today)'}</dt>
                    <dd className="tabular-nums">{!h || h.closed ? 'Closed' : `${h.open} – ${h.close === '00:00' ? 'midnight' : h.close}`}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
          <div className="flex flex-col justify-between gap-8 bg-white/5 p-8 sm:p-12">
            <div className="space-y-5">
              <p className="flex gap-3"><MapPin className="shrink-0 text-gold" /><span>{s.address}<br />{s.city}, {s.country}</span></p>
              <p className="flex gap-3"><Phone className="shrink-0 text-gold" /><a href={`tel:${s.phone.replace(/\s/g, '')}`} className="underline-offset-4 hover:underline">{s.phone}</a></p>
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
