import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { CustomizeSheet } from '../components/CustomizeSheet'
import Cart from '../pages/Cart'
import Menu from '../pages/Menu'
import { CartProvider } from '../state/cart'
import { CatalogProvider } from '../state/catalog'

beforeAll(() => {
  // jsdom has no <dialog> modal support
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  Element.prototype.scrollIntoView = () => {}
})
beforeEach(() => localStorage.clear())

function renderApp(path: string) {
  return render(
    <CatalogProvider>
      <CartProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes><Route path="/menu" element={<Menu />} /><Route path="/cart" element={<Cart />} /></Routes>
          <CustomizeSheet />
        </MemoryRouter>
      </CartProvider>
    </CatalogProvider>,
  )
}

describe('customer ordering flow (UI)', () => {
  it('customises a pizza with live pricing and persists it to the cart', async () => {
    const user = userEvent.setup()
    renderApp('/menu')
    await user.click(screen.getByRole('button', { name: 'Choose Pepperoni' }))
    const dialog = screen.getByRole('dialog')
    const add = within(dialog).getByTestId('add-to-cart')
    expect(add).toHaveTextContent('GH₵105') // medium default

    await user.click(within(dialog).getByRole('radio', { name: /^Large/ }))
    await user.click(within(dialog).getByRole('radio', { name: /^Thin crust/ }))
    await user.click(within(dialog).getByRole('radio', { name: /^Extra\s*\+/ }))
    await user.click(within(dialog).getByRole('checkbox', { name: /^Mushrooms/ }))
    await user.click(within(dialog).getByRole('checkbox', { name: /^Olives/ }))
    expect(add).toHaveTextContent('GH₵167')
    await user.click(within(dialog).getByRole('button', { name: 'Increase quantity' }))
    expect(add).toHaveTextContent('GH₵334')

    // stuffed crust is unavailable in Small, and switching size moves off it
    await user.click(within(dialog).getByRole('radio', { name: /^Stuffed crust/ }))
    await user.click(within(dialog).getByRole('radio', { name: /^Small/ }))
    expect(within(dialog).getByRole('radio', { name: /^Stuffed crust/ })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/isn't available in this size/)
    await user.click(within(dialog).getByRole('radio', { name: /^Large/ }))
    await user.click(within(dialog).getByRole('radio', { name: /^Thin crust/ }))

    await user.click(add)
    const saved = JSON.parse(localStorage.getItem('pz.cart.v1')!)
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({ productId: 'pepperoni', quantity: 2, pizza: { sizeId: 'L', crustId: 'thin', cheese: 'extra' } })
  })

  it('shows totals in the cart and handles quantity changes and removal', async () => {
    localStorage.setItem('pz.cart.v1', JSON.stringify([
      { lineId: 'a', productId: 'pepperoni', quantity: 2, notes: '', pizza: { sizeId: 'L', crustId: 'thin', addedToppings: ['mushrooms', 'olives'], removedToppings: [], cheese: 'extra' } },
    ]))
    const user = userEvent.setup()
    renderApp('/cart')
    expect(screen.getByTestId('order-total')).toHaveTextContent('GH₵334')
    await user.click(screen.getByRole('button', { name: 'Increase Pepperoni quantity' }))
    expect(screen.getByTestId('order-total')).toHaveTextContent('GH₵501')
    await user.click(screen.getByRole('button', { name: 'Remove Pepperoni' }))
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument()
  })

  it('renders mobile-first layouts with no fixed widths that could overflow small screens', () => {
    renderApp('/menu')
    // product grid is single-column by default and only adds columns at sm/lg breakpoints
    const grid = document.querySelector('section .grid')!
    expect(grid.className).toMatch(/^grid gap-6 sm:grid-cols-2 lg:grid-cols-3$/)
    // category chips scroll horizontally inside their own container instead of widening the page
    expect(screen.getByRole('navigation', { name: 'Menu categories' }).className).toContain('overflow-x-auto')
  })
})
