import { Component, lazy, Suspense, type ReactNode } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Install, { NotFound } from './pages/Install'
import Menu from './pages/Menu'
import { MyOrders, OrderPlaced } from './pages/OrderPages'
import { CartProvider } from './state/cart'
import { CatalogProvider } from './state/catalog'

// The admin area is code-split so customers never download it.
const AdminApp = lazy(() => import('./admin/AdminApp'))

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-ink-soft">Please reload the page. Your cart is saved on this device.</p>
        <button type="button" className="btn-primary mt-6" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <CatalogProvider>
        <CartProvider>
          <HashRouter>
            <Routes>
              <Route path="/admin/*" element={<Suspense fallback={<p className="p-10 text-center">Loading dashboard…</p>}><AdminApp /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="menu" element={<Menu />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order/:ref" element={<OrderPlaced />} />
                <Route path="orders" element={<MyOrders />} />
                <Route path="install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </HashRouter>
        </CartProvider>
      </CatalogProvider>
    </ErrorBoundary>
  )
}
