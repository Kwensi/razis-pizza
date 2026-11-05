/* eslint-disable react-refresh/only-export-components */
import { createStore, del, get, set } from 'idb-keyval'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CATALOG_VERSION, defaultCatalog } from '../data/catalog'
import type { Catalog } from '../lib/types'

export type CatalogSource = 'built-in' | 'published' | 'local'

interface CatalogContextValue {
  catalog: Catalog
  /** where the current catalog came from */
  source: CatalogSource
  hasLocalEdits: boolean
  ready: boolean
  saveCatalog: (next: Catalog) => Promise<void>
  discardLocalEdits: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)
const kv = createStore('pizza-pwa-catalog', 'kv')

/** Minimal structural check so a broken catalog.json never takes the menu down. */
export function isCatalog(v: unknown): v is Catalog {
  const c = v as Catalog
  return !!c && typeof c === 'object' && !!c.settings && typeof c.settings.name === 'string'
    && [c.products, c.categories, c.toppings, c.crusts, c.sizes, c.promotions].every(Array.isArray)
}

/** Fill in fields added in newer versions so old exports keep working. */
function upgrade(c: Catalog): Catalog {
  return { ...defaultCatalog, ...c, settings: { ...defaultCatalog.settings, ...c.settings }, version: CATALOG_VERSION }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(defaultCatalog)
  const [published, setPublished] = useState<Catalog | null>(null)
  const [source, setSource] = useState<CatalogSource>('built-in')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let pub: Catalog | null = null
      try {
        const res = await fetch('./catalog.json', { cache: 'no-cache' })
        if (res.ok && res.headers.get('content-type')?.includes('json')) {
          const data = await res.json()
          if (isCatalog(data)) pub = upgrade(data)
        }
      } catch { /* offline or no published catalog: use built-in */ }
      let local: Catalog | null = null
      try {
        const saved = await get<{ catalog: Catalog }>('catalog', kv)
        if (saved && isCatalog(saved.catalog)) local = upgrade(saved.catalog)
      } catch { /* IndexedDB unavailable (private mode) */ }
      if (cancelled) return
      setPublished(pub)
      if (local) { setCatalog(local); setSource('local') }
      else if (pub) { setCatalog(pub); setSource('published') }
      setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  const saveCatalog = useCallback(async (next: Catalog) => {
    setCatalog(next)
    setSource('local')
    await set('catalog', { savedAt: new Date().toISOString(), catalog: next }, kv)
  }, [])

  const discardLocalEdits = useCallback(async () => {
    await del('catalog', kv)
    setCatalog(published ?? defaultCatalog)
    setSource(published ? 'published' : 'built-in')
  }, [published])

  const value = useMemo(
    () => ({ catalog, source, hasLocalEdits: source === 'local', ready, saveCatalog, discardLocalEdits }),
    [catalog, source, ready, saveCatalog, discardLocalEdits],
  )
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used inside CatalogProvider')
  return ctx
}
