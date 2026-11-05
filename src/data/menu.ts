/**
 * ============================================================
 *  DEMONSTRATION MENU DATA — edit freely
 * ============================================================
 *  Products, prices, sizes, crusts and toppings below are sample
 *  data for demonstration. Replace them with your real menu.
 *
 *  - Prices are in major units of the configured currency.
 *  - A pizza size left out of `prices` is not offered for that pizza.
 *  - A crust size left out of `prices` means that crust is not
 *    available for that size (e.g. stuffed crust has no Small).
 *  - `image: 'images/name'` loads public/images/name-400.webp and
 *    name-800.webp. You can also use any full image URL.
 *
 *  You can also edit everything from Admin → Menu and export the
 *  result as catalog.json (see README → "Updating menu prices").
 */
import type { Category, Crust, Product, SizeOption, Topping } from '../lib/types'

export const sizes: SizeOption[] = [
  { id: 'S', name: 'Small', detail: '10″ · 6 slices', serves: 'Serves 1' },
  { id: 'M', name: 'Medium', detail: '12″ · 8 slices', serves: 'Serves 1–2' },
  { id: 'L', name: 'Large', detail: '14″ · 8 slices', serves: 'Serves 2–3' },
  { id: 'XL', name: 'Extra Large', detail: '16″ · 12 slices', serves: 'Serves 3–4' },
]

export const crusts: Crust[] = [
  { id: 'regular', name: 'Regular', description: 'Our classic hand-stretched base', prices: { S: 0, M: 0, L: 0, XL: 0 }, enabled: true },
  { id: 'thin', name: 'Thin crust', description: 'Crisp, light and blistered', prices: { S: 0, M: 0, L: 0, XL: 0 }, enabled: true },
  { id: 'thick', name: 'Thick crust', description: 'Soft, pillowy pan-style', prices: { S: 5, M: 6, L: 8, XL: 10 }, enabled: true },
  { id: 'stuffed', name: 'Stuffed crust', description: 'Mozzarella baked into the edge', prices: { M: 18, L: 22, XL: 28 }, enabled: true },
]

const bySize = (s: number, m: number, l: number, xl: number) => ({ S: s, M: m, L: l, XL: xl })
const VEG = bySize(6, 8, 10, 12)
const MEAT = bySize(10, 12, 15, 18)

export const toppings: Topping[] = [
  { id: 'extra-cheese', name: 'Extra cheese', prices: bySize(8, 10, 12, 15), vegetarian: true, enabled: true },
  { id: 'pepperoni', name: 'Pepperoni', prices: MEAT, vegetarian: false, enabled: true },
  { id: 'chicken', name: 'Chicken', prices: MEAT, vegetarian: false, enabled: true },
  { id: 'beef', name: 'Beef', prices: MEAT, vegetarian: false, enabled: true },
  { id: 'sausage', name: 'Sausage', prices: MEAT, vegetarian: false, enabled: true },
  { id: 'mushrooms', name: 'Mushrooms', prices: VEG, vegetarian: true, enabled: true },
  { id: 'onions', name: 'Onions', prices: VEG, vegetarian: true, enabled: true },
  { id: 'green-peppers', name: 'Green peppers', prices: VEG, vegetarian: true, enabled: true },
  { id: 'olives', name: 'Olives', prices: VEG, vegetarian: true, enabled: true },
  { id: 'tomatoes', name: 'Tomatoes', prices: VEG, vegetarian: true, enabled: true },
  { id: 'pineapple', name: 'Pineapple', prices: VEG, vegetarian: true, enabled: true },
  { id: 'jalapenos', name: 'Jalapeños', prices: VEG, vegetarian: true, enabled: true },
]

export const categories: Category[] = [
  { id: 'classic', name: 'Classic Pizzas', description: 'The timeless favourites', kind: 'pizza', enabled: true, sortOrder: 1 },
  { id: 'signature', name: 'Signature Pizzas', description: 'Our chef’s own creations', kind: 'pizza', enabled: true, sortOrder: 2 },
  { id: 'meat', name: 'Meat Lovers', description: 'Loaded, smoky and generous', kind: 'pizza', enabled: true, sortOrder: 3 },
  { id: 'chicken', name: 'Chicken Pizzas', description: 'Grilled, spiced and saucy', kind: 'pizza', enabled: true, sortOrder: 4 },
  { id: 'vegetarian', name: 'Vegetarian Pizzas', description: 'Garden-fresh and meat-free', kind: 'pizza', enabled: true, sortOrder: 5 },
  { id: 'premium', name: 'Premium Pizzas', description: 'Imported cheeses and cured meats', kind: 'pizza', enabled: true, sortOrder: 6 },
  { id: 'sides', name: 'Sides', description: 'Made for sharing', kind: 'simple', enabled: true, sortOrder: 7 },
  { id: 'drinks', name: 'Drinks', description: 'Chilled and freshly made', kind: 'simple', enabled: true, sortOrder: 8 },
  { id: 'desserts', name: 'Desserts', description: 'Save room for these', kind: 'simple', enabled: true, sortOrder: 9 },
]

const P = bySize

export const products: Product[] = [
  // Classic
  { kind: 'pizza', id: 'margherita', categoryId: 'classic', name: 'Margherita', description: 'San Marzano tomato, fior di latte mozzarella, fresh basil and extra-virgin olive oil.', image: 'images/margherita', prices: P(65, 90, 120, 150), defaultToppings: ['tomatoes'], enabled: true, bestSeller: true, tags: ['Vegetarian'] },
  { kind: 'pizza', id: 'pepperoni', categoryId: 'classic', name: 'Pepperoni', description: 'A generous layer of cup-and-char pepperoni over tomato sauce and mozzarella.', image: 'images/pepperoni', prices: P(75, 105, 135, 170), defaultToppings: ['pepperoni'], enabled: true, bestSeller: true },
  { kind: 'pizza', id: 'tomato-basil', categoryId: 'classic', name: 'Tomato & Basil', description: 'Roasted cherry tomatoes, garlic, basil and a little parmesan on a thin, crisp base.', image: 'images/tomato-basil', prices: P(60, 85, 110, 140), defaultToppings: ['tomatoes'], enabled: true, tags: ['Vegetarian'] },
  // Signature
  { kind: 'pizza', id: 'suya-chicken', categoryId: 'signature', name: 'Suya Chicken', description: 'Suya-spiced grilled chicken, red onion, green pepper and a ginger-pepper drizzle.', image: 'images/suya-chicken', prices: P(85, 115, 150, 185), defaultToppings: ['chicken', 'onions', 'green-peppers'], enabled: true, bestSeller: true, tags: ['Spicy', 'Chef’s pick'] },
  { kind: 'pizza', id: 'capricciosa', categoryId: 'signature', name: 'Capricciosa', description: 'Seasoned beef, mushrooms, black olives and roasted tomatoes with basil.', image: 'images/capricciosa', prices: P(80, 110, 145, 180), defaultToppings: ['beef', 'mushrooms', 'olives', 'tomatoes'], enabled: true },
  { kind: 'pizza', id: 'diavola', categoryId: 'signature', name: 'Diavola', description: 'Spicy pepperoni, jalapeños, chilli oil and mozzarella. Not for the faint-hearted.', image: 'images/diavola', prices: P(80, 110, 145, 180), defaultToppings: ['pepperoni', 'jalapenos'], enabled: true, tags: ['Spicy'] },
  // Meat lovers
  { kind: 'pizza', id: 'meat-feast', categoryId: 'meat', name: 'Meat Feast', description: 'Pepperoni, beef, sausage and chicken on a rich tomato base. Seriously loaded.', image: 'images/meat-feast', prices: P(90, 125, 160, 200), defaultToppings: ['pepperoni', 'beef', 'sausage', 'chicken'], enabled: true, bestSeller: true },
  { kind: 'pizza', id: 'bbq-beef', categoryId: 'meat', name: 'Smoky BBQ Beef', description: 'Slow-cooked beef, smoky BBQ sauce, red onion and mozzarella.', image: 'images/bbq-beef', prices: P(85, 120, 155, 190), defaultToppings: ['beef', 'onions'], enabled: true },
  // Chicken
  { kind: 'pizza', id: 'bbq-chicken', categoryId: 'chicken', name: 'BBQ Chicken', description: 'Grilled chicken, BBQ sauce, red onion, green peppers and mozzarella.', image: 'images/bbq-chicken', prices: P(80, 110, 145, 180), defaultToppings: ['chicken', 'onions', 'green-peppers'], enabled: true, bestSeller: true },
  { kind: 'pizza', id: 'chicken-tikka', categoryId: 'chicken', name: 'Chicken Tikka', description: 'Tikka-marinated chicken, peppers, onions and a cool yoghurt-mint swirl.', image: 'images/chicken-tikka', prices: P(80, 110, 145, 180), defaultToppings: ['chicken', 'green-peppers', 'onions'], enabled: true, tags: ['Spicy'] },
  { kind: 'pizza', id: 'garlic-chicken', categoryId: 'chicken', name: 'Garlic Chicken White', description: 'Garlic cream base, grilled chicken, mushrooms and a three-cheese blend.', image: 'images/garlic-chicken', prices: P(80, 110, 145, 180), defaultToppings: ['chicken', 'mushrooms'], enabled: true },
  // Vegetarian
  { kind: 'pizza', id: 'veggie-supreme', categoryId: 'vegetarian', name: 'Veggie Supreme', description: 'Mushrooms, peppers, onions, olives and tomatoes on tomato sauce.', image: 'images/veggie-supreme', prices: P(70, 100, 130, 160), defaultToppings: ['mushrooms', 'green-peppers', 'onions', 'olives', 'tomatoes'], enabled: true, tags: ['Vegetarian'] },
  { kind: 'pizza', id: 'spinach-feta', categoryId: 'vegetarian', name: 'Spinach & Ricotta', description: 'Wilted spinach, dollops of ricotta, garlic and mozzarella with lemon zest.', image: 'images/spinach-feta', prices: P(70, 100, 130, 160), defaultToppings: [], enabled: true, tags: ['Vegetarian'] },
  { kind: 'pizza', id: 'four-cheese', categoryId: 'vegetarian', name: 'Quattro Formaggi', description: 'Mozzarella, gorgonzola, parmesan and smoked provolone. Pure, stretchy comfort.', image: 'images/four-cheese', prices: P(80, 110, 145, 180), defaultToppings: [], enabled: true, tags: ['Vegetarian'] },
  // Premium
  { kind: 'pizza', id: 'prosciutto-rocket', categoryId: 'premium', name: 'Prosciutto & Rocket', description: 'Imported prosciutto crudo, wild rocket, shaved parmesan and a balsamic glaze.', image: 'images/prosciutto-rocket', prices: P(105, 145, 185, 230), defaultToppings: ['tomatoes'], enabled: true },
  { kind: 'pizza', id: 'truffle-mushroom', categoryId: 'premium', name: 'Truffle Mushroom', description: 'Wild mushrooms, truffle cream, mozzarella, spinach and burrata to finish.', image: 'images/truffle-mushroom', prices: P(110, 150, 190, 235), defaultToppings: ['mushrooms'], enabled: true, tags: ['Vegetarian'] },
  // Sides
  { kind: 'simple', id: 'garlic-bread', categoryId: 'sides', name: 'Cheesy Garlic Bread', description: 'Stone-baked dough with garlic butter, herbs and melted mozzarella.', image: 'images/garlic-bread', variants: [{ id: 'reg', name: '6 pieces', price: 35 }, { id: 'lg', name: '10 pieces', price: 50 }], enabled: true, bestSeller: true },
  { kind: 'simple', id: 'wings', categoryId: 'sides', name: 'Chicken Wings', description: 'Crispy wings tossed in house hot sauce, served with a dip.', image: 'images/wings', variants: [{ id: '6', name: '6 wings', price: 55 }, { id: '12', name: '12 wings', price: 95 }], enabled: true },
  { kind: 'simple', id: 'chicken-tenders', categoryId: 'sides', name: 'Chicken Tenders', description: 'Buttermilk-fried tenders with garlic aioli.', image: 'images/chicken-tenders', variants: [{ id: '5', name: '5 pieces', price: 50 }], enabled: true },
  { kind: 'simple', id: 'suya-skewers', categoryId: 'sides', name: 'Suya Skewers', description: 'Flame-grilled suya skewers with onion and pepper.', image: 'images/suya-skewers', variants: [{ id: '3', name: '3 skewers', price: 45 }], enabled: true, tags: ['Spicy'] },
  { kind: 'simple', id: 'fries', categoryId: 'sides', name: 'Skin-on Fries', description: 'Crispy, salted, and dangerously addictive.', image: 'images/fries', variants: [{ id: 'reg', name: 'Regular', price: 25 }, { id: 'lg', name: 'Large', price: 35 }], enabled: true },
  { kind: 'simple', id: 'loaded-fries', categoryId: 'sides', name: 'Parmesan Truffle Fries', description: 'Fries with truffle oil, parmesan and parsley.', image: 'images/loaded-fries', variants: [{ id: 'reg', name: 'Regular', price: 40 }], enabled: true },
  // Drinks
  { kind: 'simple', id: 'lemonade', categoryId: 'drinks', name: 'Fresh Lemonade', description: 'Squeezed in-house with mint.', image: 'images/lemonade', variants: [{ id: '400', name: '400 ml', price: 25 }, { id: '1l', name: '1 litre', price: 50 }], enabled: true },
  { kind: 'simple', id: 'orange-juice', categoryId: 'drinks', name: 'Orange Juice', description: 'Freshly pressed local oranges.', image: 'images/orange-juice', variants: [{ id: '400', name: '400 ml', price: 25 }], enabled: true },
  { kind: 'simple', id: 'berry-cooler', categoryId: 'drinks', name: 'Berry Hibiscus Cooler', description: 'Sobolo-style hibiscus with berries and lime.', image: 'images/berry-cooler', variants: [{ id: '400', name: '400 ml', price: 28 }], enabled: true },
  { kind: 'simple', id: 'mint-sparkling', categoryId: 'drinks', name: 'Sparkling Lime & Mint', description: 'Soda water, lime and fresh mint. Zero sugar.', image: 'images/mint-sparkling', variants: [{ id: '400', name: '400 ml', price: 20 }], enabled: true },
  // Desserts
  { kind: 'simple', id: 'brownie', categoryId: 'desserts', name: 'Double Chocolate Brownie', description: 'Fudgy, warm and studded with chocolate chunks.', image: 'images/brownie', variants: [{ id: '1', name: 'Single', price: 30 }, { id: '3', name: 'Box of 3', price: 80 }], enabled: true },
  { kind: 'simple', id: 'choc-cake', categoryId: 'desserts', name: 'Chocolate Fudge Cake', description: 'Layers of dark chocolate sponge and ganache.', image: 'images/choc-cake', variants: [{ id: 'slice', name: 'Slice', price: 35 }], enabled: true },
  { kind: 'simple', id: 'sundae', categoryId: 'desserts', name: 'Cookies & Cream Sundae', description: 'Vanilla ice cream, crushed cookies and chocolate sauce.', image: 'images/sundae', variants: [{ id: 'reg', name: 'Regular', price: 35 }], enabled: true },
  { kind: 'simple', id: 'caramel-icecream', categoryId: 'desserts', name: 'Salted Caramel Gelato', description: 'Two scoops with a crisp wafer and caramel drizzle.', image: 'images/caramel-icecream', variants: [{ id: '2', name: '2 scoops', price: 30 }], enabled: true },
]
