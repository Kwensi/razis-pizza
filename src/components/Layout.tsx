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
  s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.address}, ${s.city}`)}`

/** Splits "Razi's Pizza" into a heavy wordmark ("Razi's") and a spaced caps descriptor ("PIZZA"). */
export function splitBrand(name: string): { mark: string; descriptor: string } {
  const words = name.trim().split(/\s+/)
  return words.length > 1 ? { mark: words.slice(0, -1).join(' '), descriptor: words[words.length - 1] } : { mark: name, descriptor: '' }
}

export function Wordmark({ light = false, size = 'md' }: { light?: boolean; size?: 'md' | 'xl' }) {
  const { catalog } = useCatalog()
  const { mark, descriptor } = splitBrand(catalog.settings.name)
  const big = size === 'xl'
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-display font-black tracking-tight ${big ? 'text-6xl sm:text-8xl' : 'text-[1.6rem]'} ${light ? 'text-white' : 'text-ink'}`}>{mark}</span>
      {descriptor && (
        <span className={`font-sans font-extrabold uppercase ${light ? 'text-[#f4c46a]' : 'text-brand'} ${big ? 'mt-2 text-sm tracking-[0.6em]' : 'mt-0.5 text-[9px] tracking-[0.5em]'}`}>{descriptor}</span>
      )}
    </span>
  )
}

export function Logo({ light = false }: { light?: boolean }) {
  const { catalog } = useCatalog()
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${catalog.settings.name} home`}>
      <img src="logo.svg" alt="" width={40} height={40} className="h-10 w-10 drop-shadow-sm" />
      <Wordmark light={light} />
    </Link>
  )
}

function Header() {
  const { count } = useCart()
  const { catalog } = useCatalog()
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-semibold transition hover:text-brand ${isActive ? 'text-brand' : ''}`
  return (
    <header className="no-print sticky top-0 z-30 border-b border-ink/5 bg-cream/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          <NavLink to="/menu" className={link}>Menu</NavLink>
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/orders" className={link}>My orders</NavLink>
          <NavLink to="/install" className={link}>Get the app</NavLink>
        </nav>
        <div className="flex items-center gap-2">
          <a href={`tel:${catalog.settings.phone.replace(/\s/g, '')}`} className="hidden h-10 w-10 place-items-center rounded-full border border-ink/10 bg-white sm:grid" aria-label="Call us">
            <Phone size={18} />
          </a>
          <Link to="/cart" className="btn-dark h-10 px-4 py-0 text-sm" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs tabular-nums">{count}</span>
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
    <footer className="no-print mt-20 bg-ink pb-24 text-white/80 md:pb-0">
      <div className="container-page border-b border-white/10 pb-10 pt-16"><Wordmark light size="xl" /></div>
      <div className="container-page grid gap-10 py-14 sm:grid-cols-3">
        <div>
          <p className="max-w-xs font-display text-xl font-bold leading-snug text-white">{s.tagline}</p>
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
      <Link to="/cart" className="shrink-0 font-bold text-[#f4c46a]">View cart</Link>
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
