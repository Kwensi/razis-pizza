/**
 * Customer input validation. React escapes everything it renders, so we never
 * use dangerouslySetInnerHTML for customer text; here we additionally strip
 * control characters and enforce length limits so messages stay readable.
 */
import type { Catalog, CustomerDetails, PaymentMethodId } from './types'

export const LIMITS = { name: 60, address: 200, landmark: 120, instructions: 300, promo: 30 } as const

/** Remove control characters (keeps newlines when `multiline`), collapse runs of spaces and trim. */
export function sanitizeText(value: string, max: number, multiline = false): string {
  const cleaned = (value ?? '')
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned.slice(0, max)
}

/**
 * Normalise a phone number to international digits (no "+"), or null if invalid.
 * Accepts local numbers ("024 123 4567"), +CC numbers and 00CC numbers.
 */
export function normalisePhone(input: string, countryCode: string, nationalLength: number): string | null {
  const raw = (input ?? '').trim()
  if (!raw || !/^[+\d\s().-]+$/.test(raw)) return null
  const hasPlus = raw.startsWith('+')
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null

  const isIntl = hasPlus || digits.startsWith('00')
  if (isIntl) {
    if (digits.startsWith('00')) digits = digits.slice(2)
    if (digits.length < 8 || digits.length > 15) return null
    if (digits.startsWith(countryCode) && nationalLength > 0) {
      let national = digits.slice(countryCode.length)
      if (national.startsWith('0') && national.length === nationalLength + 1) national = national.slice(1) // +233 024…
      return national.length === nationalLength ? countryCode + national : null
    }
    return digits
  }

  if (digits.startsWith('0')) {
    const national = digits.slice(1)
    if (nationalLength > 0 && national.length !== nationalLength) return null
    if (national.length < 6) return null
    return countryCode + national
  }
  if (nationalLength > 0) {
    if (digits.length === nationalLength) return countryCode + digits
    if (digits.startsWith(countryCode) && digits.length === countryCode.length + nationalLength) return digits
    return null
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null
}

export function formatPhone(digits: string): string {
  return digits ? `+${digits}` : ''
}

export function paymentMethodsFor(catalog: Catalog, orderType: CustomerDetails['orderType']): PaymentMethodId[] {
  const p = catalog.settings.payments
  const all: PaymentMethodId[] = ['cash_pickup', 'cash_delivery', 'momo', 'bank']
  return all.filter((id) => {
    if (!p[id].enabled) return false
    if (id === 'cash_pickup') return orderType === 'pickup'
    if (id === 'cash_delivery') return orderType === 'delivery'
    return true
  })
}

export type CheckoutErrors = Partial<Record<keyof CustomerDetails, string>>

export function validateCheckout(catalog: Catalog, c: CustomerDetails): CheckoutErrors {
  const e: CheckoutErrors = {}
  const s = catalog.settings
  const name = sanitizeText(c.name, 200)
  if (name.length < 2) e.name = 'Please enter your full name.'
  else if (name.length > LIMITS.name) e.name = `Name must be ${LIMITS.name} characters or fewer.`
  else if (!/^[\p{L}\p{M}' .,-]+$/u.test(name)) e.name = 'Name can only contain letters, spaces, hyphens and apostrophes.'

  if (!c.phone.trim()) e.phone = 'Please enter your phone number so we can confirm your order.'
  else if (!normalisePhone(c.phone, s.phoneCountryCode, s.phoneNationalLength))
    e.phone = `Enter a valid phone number — a local number starting with 0, or an international number starting with +${s.phoneCountryCode}.`

  if (c.orderType !== 'pickup' && c.orderType !== 'delivery') e.orderType = 'Choose pickup or delivery.'

  if (c.orderType === 'delivery') {
    const zone = s.deliveryZones.find((z) => z.id === c.zoneId)
    if (!zone) e.zoneId = 'Choose your delivery area.'
    else if (!zone.active) e.zoneId = `Sorry, we are not delivering to ${zone.name} right now.`
    const address = sanitizeText(c.address, 1000, true)
    if (address.length < 5) e.address = 'Please enter your delivery address (street, house number or building).'
    else if (address.length > LIMITS.address) e.address = `Address must be ${LIMITS.address} characters or fewer.`
    if (sanitizeText(c.landmark, 1000).length > LIMITS.landmark) e.landmark = `Landmark must be ${LIMITS.landmark} characters or fewer.`
  }

  if (sanitizeText(c.instructions, 1000, true).length > LIMITS.instructions)
    e.instructions = `Instructions must be ${LIMITS.instructions} characters or fewer.`

  const methods = paymentMethodsFor(catalog, c.orderType)
  if (!c.paymentMethod) e.paymentMethod = 'Choose how you would like to pay.'
  else if (!methods.includes(c.paymentMethod)) e.paymentMethod = 'That payment method is not available for this order type.'

  return e
}

/** Clean every free-text field before it is stored or sent. */
export function sanitizeCustomer(catalog: Catalog, c: CustomerDetails): CustomerDetails {
  const s = catalog.settings
  const delivery = c.orderType === 'delivery'
  return {
    name: sanitizeText(c.name, LIMITS.name),
    phone: normalisePhone(c.phone, s.phoneCountryCode, s.phoneNationalLength) ?? '',
    orderType: c.orderType,
    zoneId: delivery ? c.zoneId : '',
    address: delivery ? sanitizeText(c.address, LIMITS.address, true) : '',
    landmark: delivery ? sanitizeText(c.landmark, LIMITS.landmark) : '',
    instructions: sanitizeText(c.instructions, LIMITS.instructions, true),
    paymentMethod: c.paymentMethod,
    promoCode: sanitizeText(c.promoCode, LIMITS.promo).toUpperCase(),
  }
}
