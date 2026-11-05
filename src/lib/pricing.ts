/**
 * Pricing engine. All amounts returned from this module are integer MINOR
 * units (pesewas / cents) to avoid floating-point rounding errors.
 *
 * Prices are always recomputed from the catalog — a cart line never stores a
 * price, so a tampered or stale cart cannot change what the customer pays.
 * (In production the same calculation must run again on the server.)
 */
import type {
  CartLine,
  Catalog,
  CheeseLevel,
  CurrencySettings,
  PizzaProduct,
  PizzaSelection,
  Product,
  SizeId,
} from './types'

export const CHEESE_TOPPING_ID = 'extra-cheese'
export const CHEESE_LEVELS: { id: CheeseLevel; name: string; portions: number }[] = [
  { id: 'none', name: 'No cheese', portions: 0 },
  { id: 'light', name: 'Light', portions: 0 },
  { id: 'regular', name: 'Regular', portions: 0 },
  { id: 'extra', name: 'Extra', portions: 1 },
  { id: 'double', name: 'Double', portions: 2 },
]

export const MAX_NOTES_LENGTH = 200

/** Convert a major-unit amount (e.g. 12.5) to integer minor units (1250). */
export function toMinor(major: number): number {
  return Math.round(major * 100)
}

export function formatMoney(minor: number, currency: CurrencySettings): string {
  const major = minor / 100
  const hasCents = minor % 100 !== 0
  const num = new Intl.NumberFormat(currency.locale || 'en', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(major))
  return `${minor < 0 ? '−' : ''}${currency.symbol}${num}`
}

const isPrice = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

export function findProduct(catalog: Catalog, id: string): Product | undefined {
  return catalog.products.find((p) => p.id === id)
}

/** Sizes this pizza is sold in, in catalog order. */
export function availableSizes(catalog: Catalog, product: PizzaProduct): SizeId[] {
  return catalog.sizes.map((s) => s.id).filter((id) => isPrice(product.prices[id]))
}

export function crustAvailable(catalog: Catalog, crustId: string, sizeId: SizeId): boolean {
  const crust = catalog.crusts.find((c) => c.id === crustId)
  return !!crust && crust.enabled && isPrice(crust.prices[sizeId])
}

export function toppingAvailable(catalog: Catalog, toppingId: string, sizeId: SizeId): boolean {
  const t = catalog.toppings.find((x) => x.id === toppingId)
  return !!t && t.enabled && isPrice(t.prices[sizeId])
}

/** Number of toppings on the finished pizza (defaults kept + extras added). */
export function toppingCount(product: PizzaProduct, sel: PizzaSelection): number {
  const kept = product.defaultToppings.filter((t) => t !== CHEESE_TOPPING_ID && !sel.removedToppings.includes(t))
  return kept.length + sel.addedToppings.length
}

export function defaultSelection(catalog: Catalog, product: PizzaProduct): PizzaSelection {
  const sizes = availableSizes(catalog, product)
  const sizeId = sizes.includes('M') ? 'M' : sizes[0]
  const crust = catalog.crusts.find((c) => c.enabled && isPrice(c.prices[sizeId])) ?? catalog.crusts[0]
  return { sizeId, crustId: crust?.id ?? '', addedToppings: [], removedToppings: [], cheese: 'regular' }
}

/** Returns a list of human-readable problems; empty list = valid. */
export function validateSelection(catalog: Catalog, line: CartLine): string[] {
  const errors: string[] = []
  const { settings } = catalog
  const product = findProduct(catalog, line.productId)
  if (!product) return ['This item is no longer on the menu.']
  const category = catalog.categories.find((c) => c.id === product.categoryId)
  if (!product.enabled || (category && !category.enabled)) errors.push(`${product.name} is currently unavailable.`)

  if (!Number.isInteger(line.quantity) || line.quantity < 1) errors.push('Quantity must be at least 1.')
  else if (line.quantity > settings.maxQuantityPerLine)
    errors.push(`You can order up to ${settings.maxQuantityPerLine} of one item. Call us for larger orders.`)

  if ((line.notes ?? '').length > MAX_NOTES_LENGTH) errors.push(`Instructions must be under ${MAX_NOTES_LENGTH} characters.`)

  if (product.kind === 'simple') {
    if (!product.variants.some((v) => v.id === line.variantId && isPrice(v.price))) errors.push('Please choose an option.')
    return errors
  }

  const sel = line.pizza
  if (!sel) return [...errors, 'Please choose a size.']
  if (!isPrice(product.prices[sel.sizeId])) {
    errors.push('Please choose an available size.')
    return errors
  }
  if (!crustAvailable(catalog, sel.crustId, sel.sizeId)) errors.push('That crust is not available in this size.')

  const added = new Set(sel.addedToppings)
  if (added.size !== sel.addedToppings.length) errors.push('A topping was added twice.')
  for (const id of sel.addedToppings) {
    if (id === CHEESE_TOPPING_ID) errors.push('Use the cheese options to add extra cheese.')
    else if (product.defaultToppings.includes(id)) errors.push('That topping is already included.')
    else if (!toppingAvailable(catalog, id, sel.sizeId)) errors.push('A selected topping is unavailable.')
  }
  for (const id of sel.removedToppings) {
    if (!product.defaultToppings.includes(id)) errors.push('Only included toppings can be removed.')
  }
  if (toppingCount(product, sel) > settings.maxToppings)
    errors.push(`Maximum ${settings.maxToppings} toppings per pizza.`)

  const level = CHEESE_LEVELS.find((c) => c.id === sel.cheese)
  if (!level) errors.push('Please choose a cheese option.')
  else if (level.portions > 0 && !toppingAvailable(catalog, CHEESE_TOPPING_ID, sel.sizeId))
    errors.push('Extra cheese is currently unavailable.')

  return [...new Set(errors)]
}

export interface PriceComponent {
  label: string
  amount: number // minor units, per unit
}

export interface PricedLine {
  line: CartLine
  product?: Product
  name: string
  categoryId: string
  details: string[]
  components: PriceComponent[]
  unitPrice: number
  lineTotal: number
  errors: string[]
}

/** Price a single cart line from trusted catalog data. Invalid lines are priced at 0 and carry errors. */
export function priceLine(catalog: Catalog, line: CartLine): PricedLine {
  const product = findProduct(catalog, line.productId)
  const errors = validateSelection(catalog, line)
  const base: PricedLine = {
    line,
    product,
    name: product?.name ?? 'Unavailable item',
    categoryId: product?.categoryId ?? '',
    details: [],
    components: [],
    unitPrice: 0,
    lineTotal: 0,
    errors,
  }
  if (!product) return base

  const components: PriceComponent[] = []
  const details: string[] = []

  if (product.kind === 'simple') {
    const v = product.variants.find((x) => x.id === line.variantId)
    if (v) {
      components.push({ label: v.name, amount: toMinor(v.price) })
      if (product.variants.length > 1) details.push(v.name)
    }
  } else if (line.pizza) {
    const sel = line.pizza
    const size = catalog.sizes.find((s) => s.id === sel.sizeId)
    const sizePrice = product.prices[sel.sizeId]
    if (size && isPrice(sizePrice)) {
      components.push({ label: `${size.name} ${product.name}`, amount: toMinor(sizePrice) })
      details.push(`${size.name} (${size.detail.split(' ·')[0]})`)

      const crust = catalog.crusts.find((c) => c.id === sel.crustId)
      if (crust) {
        details.push(crust.name.toLowerCase().includes('crust') ? crust.name : `${crust.name} crust`)
        const cp = crust.prices[sel.sizeId]
        if (isPrice(cp) && cp > 0) components.push({ label: crust.name, amount: toMinor(cp) })
      }

      const removed = sel.removedToppings
        .map((id) => catalog.toppings.find((t) => t.id === id)?.name ?? id)
      if (removed.length) details.push(`No ${removed.join(', ')}`)

      const addedNames: string[] = []
      for (const id of sel.addedToppings) {
        const t = catalog.toppings.find((x) => x.id === id)
        if (!t) continue
        addedNames.push(t.name)
        const tp = t.prices[sel.sizeId]
        if (isPrice(tp)) components.push({ label: `+ ${t.name}`, amount: toMinor(tp) })
      }
      if (addedNames.length) details.push(`Add ${addedNames.join(', ')}`)

      const level = CHEESE_LEVELS.find((c) => c.id === sel.cheese)
      if (level && sel.cheese !== 'regular') details.push(level.id === 'none' ? 'No cheese' : `${level.name} cheese`)
      if (level && level.portions > 0) {
        const cheese = catalog.toppings.find((t) => t.id === CHEESE_TOPPING_ID)
        const price = cheese?.prices[sel.sizeId]
        if (isPrice(price)) components.push({ label: `${level.name} cheese`, amount: toMinor(price) * level.portions })
      }
    }
  }

  if (line.notes?.trim()) details.push(`Note: ${line.notes.trim()}`)

  const unitPrice = components.reduce((sum, c) => sum + c.amount, 0)
  const valid = errors.length === 0
  return {
    ...base,
    details,
    components,
    unitPrice: valid ? unitPrice : 0,
    lineTotal: valid ? unitPrice * line.quantity : 0,
  }
}

/** Lowest price a product can be bought for (used for "From GH₵65" labels). */
export function startingPrice(catalog: Catalog, product: Product): number {
  if (product.kind === 'simple') {
    const prices = product.variants.map((v) => v.price).filter(isPrice)
    return prices.length ? toMinor(Math.min(...prices)) : 0
  }
  const prices = availableSizes(catalog, product).map((s) => product.prices[s] as number)
  return prices.length ? toMinor(Math.min(...prices)) : 0
}

/** Stable key so identical customisations merge into one cart line. */
export function configKey(line: Pick<CartLine, 'productId' | 'pizza' | 'variantId' | 'notes'>): string {
  const p = line.pizza
  return JSON.stringify([
    line.productId,
    line.variantId ?? null,
    p ? [p.sizeId, p.crustId, [...p.addedToppings].sort(), [...p.removedToppings].sort(), p.cheese] : null,
    (line.notes ?? '').trim(),
  ])
}
