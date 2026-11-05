/* eslint-disable react-refresh/only-export-components */
import { ClipboardList, Home, MessageCircle, Phone, Pizza, ShoppingBag } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { whatsappUrl } from '../lib/whatsapp'
import type { RestaurantSettings } from '../lib/types'
import { useCatalog } from '../state/catalog'
import { useCart } from '../state/cart'
import { CustomizeSheet } from './CustomizeSheet'

export const whatsAppContactUrl = (s: RestaurantSettings) => whatsappUrl(s.whatsappNumber, `Hello ${s.name}! I have a question.`)
export const mapUrl = (s: RestaurantSettings) =>
  s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.address}, ${s.city}, ${s.country}`)}`

/** The Razi's Pizza badge (public/razis-logo.webp — replace with the original artwork for best quality). */
export function Logo({ size = 'md' }: { size?: 'md' | 'xl' }) {
  const { catalog } = useCatalog()
  return (
    <Link to="/" className="flex shrink-0 items-center" aria-label={`${catalog.settings.name} home`}>
      <img src="razis-logo.webp" alt={catalog.settings.name} width={361} height={333}
        className={`${size === 'xl' ? 'h-36 sm:h-44' : 'h-12'} w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]`} />
    </Link>
  )
}

/** "PIZZA • SHAWARMA • GREAT TASTE" strap from the flyers */
export function ServesLine({ className = '' }: { className?: string }) {
  const { catalog } = useCatalog()
  const items = catalog.settings.brand?.servesLine ?? []
  if (!items.length) return null
  return (
    <p className={`flex items-center justify-center gap-2 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.16em] sm:gap-3 sm:text-xs sm:tracking-[0.3em] ${className}`}>
      <span className="h-px w-5 bg-gold sm:w-8" aria-hidden />
      {items.map((t, i) => (
        <span key={t} className="flex items-center gap-2 sm:gap-3">{i > 0 && <span className="text-gold" aria-hidden>•</span>}{t}</span>
      ))}
      <span className="h-px w-5 bg-gold sm:w-8" aria-hidden />
    </p>
  )
}

function Header() {
  const { count } = useCart()
  const { catalog } = useCatalog()
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-bold uppercase tracking-wider transition hover:text-gold ${isActive ? 'text-gold' : 'text-white/85'}`
  return (
    <header className="no-print bg-grunge sticky top-0 z-30 border-b-4 border-brand text-white">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          <NavLink to="/menu" className={link}>Menu</NavLink>
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/orders" className={link}>My orders</NavLink>
          <NavLink to="/install" className={link}>Get the app</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <a href={`tel:${catalog.settings.phone.replace(/\s/g, '')}`} className="hidden h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 sm:grid" aria-label="Call us">
            <Phone size={18} />
          </a>
          <Link to="/cart" className="btn h-10 bg-gold px-4 py-0 text-sm font-extrabold text-ink hover:brightness-105" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs text-white tabular-nums">{count}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function MobileNav() {
  const { count } = useCart()
  const item = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${isActive ? 'text-brand' : 'text-ink-soft'}`
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile">
      <div className="flex">
        <NavLink to="/" end className={item}><Home size={22} />Home</NavLink>
        <NavLink to="/menu" className={item}><Pizza size={22} />Menu</NavLink>
        <NavLink to="/cart" className={item}>
          <span className="relative"><ShoppingBag size={22} />
            {count > 0 && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] text-white">{count}</span>}
          </span>Cart
        </NavLink>
        <NavLink to="/orders" className={item}><ClipboardList size={22} />Orders</NavLink>
      </div>
    </nav>
  )
}

function Footer() {
  const { catalog } = useCatalog()
  const s = catalog.settings
  return (
    <footer className="no-print bg-grunge mt-20 border-t-4 border-brand pb-24 text-white/80 md:pb-0">
      <div className="container-page flex flex-col items-center gap-4 border-b border-white/10 pb-10 pt-14 text-center">
        <Logo size="xl" />
        <p className="font-display text-2xl uppercase text-gold">{s.tagline}</p>
      </div>
      <div className="container-page grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white">Order</h2>
          <p className="text-sm">Pickup in about {s.pickupPrepMinutes} minutes, or delivery across {s.city}. Order online and send it to us on WhatsApp.</p>
          <Link to="/menu" className="btn-primary mt-4 py-2 text-sm">Order now</Link>
        </div>
        <div className="text-sm">
          <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white">Visit</h2>
          <p>{s.address}<br />{s.city}, {s.country}</p>
          <a href={mapUrl(s)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-white underline underline-offset-4">Get directions</a>
        </div>
        <div className="text-sm">
          <h2 className="mb-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-white">Contact</h2>
          <p><a href={`tel:${s.phone.replace(/\s/g, '')}`} className="hover:text-white">{s.phone}</a></p>
          <p><a href={`mailto:${s.email}`} className="hover:text-white">{s.email}</a></p>
          <a href={whatsAppContactUrl(s)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp mt-4 py-2 text-sm"><MessageCircle size={16} /> WhatsApp us</a>
        </div>
      </div>
      <ServesLine className="pb-8 text-white/90" />
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {s.name}. Menu, prices and photos are for demonstration and may change.</p>
          <Link to="/admin" className="hover:text-white">Staff login</Link>
        </div>
      </div>
    </footer>
  )
}

function Toast() {
  const { toast } = useCart()
  if (!toast) return null
  return (
    <div role="status" className="animate-fade fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-xl md:bottom-8">
      <span className="font-medium">{toast}</span>
      <Link to="/cart" className="shrink-0 font-bold text-gold">View cart</Link>
    </div>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>
      <Header />
      <main id="main" className="flex-1"><Outlet /></main>
      <Footer />
      <MobileNav />
      <Toast />
      <CustomizeSheet />
    </div>
  )
}
