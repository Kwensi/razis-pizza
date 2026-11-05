/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addOrMergeLine, replaceLine, updateQuantity } from '../lib/cart'
import type { CartLine, CustomerDetails } from '../lib/types'
import { useCatalog } from './catalog'

const CART_KEY = 'pz.cart.v1'
const DRAFT_KEY = 'pz.checkout.v1'

export const emptyDraft: CustomerDetails = {
  name: '', phone: '', orderType: 'delivery', zoneId: '', address: '', landmark: '', instructions: '', paymentMethod: '', promoCode: '',
}

function readJSON<T>(key: string, fallback: T, check: (v: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const v = JSON.parse(raw)
    return check(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full / disabled: cart still works for this visit */ }
}

const isLines = (v: unknown) =>
  Array.isArray(v) && v.every((l) => l && typeof l.lineId === 'string' && typeof l.productId === 'string' && Number.isInteger(l.quantity))

interface CartContextValue {
  lines: CartLine[]
  count: number
  add: (line: Omit<CartLine, 'lineId'>) => void
  replace: (lineId: string, line: Omit<CartLine, 'lineId'>) => void
  setQuantity: (lineId: string, q: number) => void
  remove: (lineId: string) => void
  clear: () => void
  draft: CustomerDetails
  setDraft: (patch: Partial<CustomerDetails>) => void
  customizing: { productId: string; lineId?: string } | null
  openCustomizer: (productId: string, lineId?: string) => void
  closeCustomizer: () => void
  toast: string | null
  showToast: (msg: string) => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const { catalog } = useCatalog()
  const maxQty = catalog.settings.maxQuantityPerLine
  const [lines, setLines] = useState<CartLine[]>(() => readJSON(CART_KEY, [], isLines))
  const [draft, setDraftState] = useState<CustomerDetails>(() => ({
    ...emptyDraft,
    ...readJSON<Partial<CustomerDetails>>(DRAFT_KEY, {}, (v) => !!v && typeof v === 'object'),
  }))
  const [customizing, setCustomizing] = useState<CartContextValue['customizing']>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => writeJSON(CART_KEY, lines), [lines])
  useEffect(() => writeJSON(DRAFT_KEY, draft), [draft])

  // keep tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setLines(readJSON(CART_KEY, [], isLines))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  const add = useCallback((l: Omit<CartLine, 'lineId'>) => setLines((cur) => addOrMergeLine(cur, l, maxQty)), [maxQty])
  const replace = useCallback((id: string, l: Omit<CartLine, 'lineId'>) => setLines((cur) => replaceLine(cur, id, l, maxQty)), [maxQty])
  const setQuantity = useCallback((id: string, q: number) => setLines((cur) => updateQuantity(cur, id, q, maxQty)), [maxQty])
  const remove = useCallback((id: string) => setLines((cur) => cur.filter((l) => l.lineId !== id)), [])
  const clear = useCallback(() => setLines([]), [])
  const setDraft = useCallback((patch: Partial<CustomerDetails>) => setDraftState((d) => ({ ...d, ...patch })), [])

  const value = useMemo<CartContextValue>(() => ({
    lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    add, replace, setQuantity, remove, clear, draft, setDraft,
    customizing,
    openCustomizer: (productId, lineId) => setCustomizing({ productId, lineId }),
    closeCustomizer: () => setCustomizing(null),
    toast,
    showToast: setToast,
  }), [lines, add, replace, setQuantity, remove, clear, draft, setDraft, customizing, toast])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
