/* eslint-disable react-refresh/only-export-components */
import { BarChart3, ClipboardList, Info, LogOut, Pizza, Settings, Tag, Store } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useDocumentTitle, useMoney } from '../components/ui'
import { clearOrders, listOrders, makeSampleOrders, orderStats, saveOrder, statusLabel } from '../lib/orders'
import type { Order } from '../lib/types'
import { useCatalog } from '../state/catalog'
import MenuAdmin from './MenuAdmin'
import { ImportOrder, OrderDetail, OrdersList } from './OrdersAdmin'
import { PromotionsAdmin, SettingsAdmin } from './SettingsAdmin'

const SESSION_KEY = 'pz.admin.session'

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { catalog } = useCatalog()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  useDocumentTitle('Staff login')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (attempts >= 5) { setError('Too many attempts. Reload the page to try again.'); return }
    if ((await sha256(pin)) === catalog.settings.adminPinHash) {
      sessionStorage.setItem(SESSION_KEY, catalog.settings.adminPinHash)
      onUnlock()
    } else {
      setAttempts((a) => a + 1)
      setError('Incorrect PIN.')
      setPin('')
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center bg-ink p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-7">
        <img src="razis-logo.webp" alt="" className="h-16 w-auto" />
        <h1 className="mt-4 text-2xl font-extrabold">Staff dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Enter the admin PIN. Default demo PIN: <strong>1234</strong> — change it in Settings.</p>
        <label htmlFor="pin" className="label mt-5">PIN</label>
        <input id="pin" type="password" inputMode="numeric" autoComplete="current-password" className="field text-center text-2xl tracking-[0.5em]"
          value={pin} onChange={(e) => setPin(e.target.value)} maxLength={12} autoFocus />
        {error && <p role="alert" className="mt-2 text-sm font-medium text-brand">{error}</p>}
        <button type="submit" className="btn-primary mt-5 w-full">Unlock</button>
        <Link to="/" className="mt-4 block text-center text-sm font-semibold text-ink-soft">← Back to the shop</Link>
      </form>
    </div>
  )
}

export function DemoModeNotice() {
  return (
    <details className="no-print rounded-2xl border border-gold/40 bg-[#fdf3e3] p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-bold text-[#7a4a0c]"><Info size={18} /> Demo mode: data is stored in this browser only</summary>
      <div className="mt-3 space-y-2 leading-relaxed text-ink">
        <p>This dashboard runs entirely in the browser with no server. That means:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Orders</strong> are those placed on this device, or added by tapping the staff link inside a WhatsApp order message (Orders → Import). Customer phones do not sync to this dashboard.</li>
          <li><strong>Menu, price and settings edits</strong> apply to this browser only until you <em>publish</em> them (Settings → Publish) by uploading <code>catalog.json</code> to the website.</li>
          <li>The <strong>PIN</strong> only keeps casual visitors out. It is not secure authentication: anyone with technical skills can read browser data.</li>
        </ul>
        <p>For shared, multi-device, secure administration use the free-tier Supabase setup described in <code>docs/PRODUCTION.md</code>.</p>
      </div>
    </details>
  )
}

function Dashboard() {
  const money = useMoney()
  const { catalog } = useCatalog()
  const [orders, setOrders] = useState<Order[]>([])
  useDocumentTitle('Dashboard')
  const load = () => listOrders().then(setOrders).catch(() => setOrders([]))
  useEffect(() => { load() }, [])
  const stats = orderStats(orders, new Date())
  const max = Math.max(1, ...stats.last7Days.map((d) => d.total))
  const hasSamples = orders.some((o) => o.source === 'sample')

  const tiles = [
    { label: 'Total orders', value: String(stats.totalOrders) },
    { label: 'Sales today', value: money(stats.today) },
    { label: 'Last 7 days', value: money(stats.week) },
    { label: 'This month', value: money(stats.month) },
    { label: 'Average order', value: money(stats.averageOrder) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Dashboard</h1>
        <div className="flex gap-2">
          {hasSamples ? (
            <button type="button" className="btn-ghost py-2 text-sm" onClick={async () => {
              const keep = orders.filter((x) => x.source !== 'sample')
              await clearOrders(); for (const o of keep) await saveOrder(o); load()
            }}>Remove sample orders</button>
          ) : (
            <button type="button" className="btn-ghost py-2 text-sm" onClick={async () => {
              for (const o of makeSampleOrders(catalog, new Date())) await saveOrder(o)
              load()
            }}>Load sample orders</button>
          )}
        </div>
      </div>
      <DemoModeNotice />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t.label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="text-xl font-extrabold">Sales, last 7 days</h2>
          <div className="mt-6 flex h-48 items-end gap-2" role="img" aria-label="Bar chart of daily sales for the last 7 days">
            {stats.last7Days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[10px] font-bold tabular-nums text-ink-soft">{d.total ? money(d.total) : ''}</span>
                <div className="w-full rounded-t-lg bg-brand" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total ? 4 : 0 }} />
                <span className="text-xs font-semibold">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-extrabold">Best sellers</h2>
          {stats.bestSellers.length === 0 ? <p className="mt-4 text-sm text-ink-soft">No orders yet.</p> : (
            <ol className="mt-4 space-y-3">
              {stats.bestSellers.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-cream font-bold">{i + 1}</span>
                  <span className="flex-1 font-semibold">{b.name}</span>
                  <span className="text-ink-soft">{b.quantity} sold</span>
                  <span className="w-20 text-right font-bold tabular-nums">{money(b.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <section className="card p-6">
        <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Latest orders</h2><Link to="orders" className="text-sm font-bold text-brand">All orders →</Link></div>
        <ul className="mt-3 divide-y divide-ink/5 text-sm">
          {orders.slice(0, 6).map((o) => (
            <li key={o.ref}><Link to={`orders/${o.ref}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand">
              <span className="font-mono font-bold">{o.ref}</span><span className="hidden flex-1 sm:block">{o.customer.name}</span>
              <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold">{statusLabel(o.status)}</span>
              <span className="w-20 text-right font-bold tabular-nums">{money(o.totals.total)}</span>
            </Link></li>
          ))}
          {orders.length === 0 && <li className="py-4 text-ink-soft">No orders yet. Place a test order from the shop, or load sample orders.</li>}
        </ul>
      </section>
    </div>
  )
}

export default function AdminApp() {
  const { catalog } = useCatalog()
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === catalog.settings.adminPinHash)
  useEffect(() => { setUnlocked(sessionStorage.getItem(SESSION_KEY) === catalog.settings.adminPinHash) }, [catalog.settings.adminPinHash])
  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  const nav = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/menu', label: 'Menu', icon: Pizza },
    { to: '/admin/promotions', label: 'Promotions', icon: Tag },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ]
  return (
    <div className="min-h-dvh bg-[#f6f3ee] md:grid md:grid-cols-[220px_1fr]">
      <aside className="no-print sticky top-0 z-20 bg-ink text-white md:h-dvh">
        <div className="flex items-center justify-between gap-2 p-4 md:block">
          <p className="font-display text-lg font-semibold">{catalog.settings.name}</p>
          <p className="text-xs text-white/60 md:mt-1">Staff dashboard · demo mode</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3" aria-label="Admin">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${isActive ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10'}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 md:mt-4"><Store size={17} />View shop</Link>
          <button type="button" onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false) }}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"><LogOut size={17} />Lock</button>
        </nav>
      </aside>
      <main className="min-w-0 p-4 sm:p-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<OrdersList />} />
          <Route path="orders/:ref" element={<OrderDetail />} />
          <Route path="import" element={<ImportOrder />} />
          <Route path="menu" element={<MenuAdmin />} />
          <Route path="promotions" element={<PromotionsAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Routes>
      </main>
    </div>
  )
}
