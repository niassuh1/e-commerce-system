/** Shapes returned by the Django services. Money arrives as decimal strings. */

export type Store = {
  id: string
  name: string
  logo_url: string
  created_at: string
  owner_user: number | null
}

export type User = {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_superuser: boolean
  is_staff: boolean
  is_active: boolean
  stores: Store[]
}

export type Product = {
  id: string
  name: string
  image_url: string
  price: string
  quantity: number
  store: string
}

export type CartLine = {
  product_id: string
  name: string
  image_url: string
  price: string
  quantity: number
  line_total: string
  available: number
}

export type Cart = {
  store: Pick<Store, 'id' | 'name' | 'logo_url'>
  items: CartLine[]
  item_count: number
  subtotal: string
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** The forward stations of an order's line. Cancelled is a terminus, not a station. */
export const ORDER_STATIONS = ['pending', 'confirmed', 'shipped', 'delivered'] as const

/** Mirrors ALLOWED_TRANSITIONS in order_service/models.py */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
}

export function canCancel(status: OrderStatus) {
  return status === 'pending' || status === 'confirmed'
}

type OrderParties = {
  id: string
  buyer_user: number | null
  buyer_username: string | null
  buyer_store: string | null
  buyer_store_name: string | null
  store: string
  store_name: string
  store_logo_url: string
  status: OrderStatus
  cancel_reason: string
  total: string
  created_at: string
  updated_at: string
}

export type OrderSummary = OrderParties & { item_count: number }

export type OrderItem = {
  id: number
  product: string | null
  product_name: string
  image_url: string
  unit_price: string
  quantity: number
  total_sum: string
}

export type Order = OrderParties & { items: OrderItem[] }

export const ORDER_VIEWS = ['all', 'active', 'delivered', 'cancelled'] as const
export type OrderView = (typeof ORDER_VIEWS)[number]

export function filterOrders<T extends { status: OrderStatus }>(orders: T[], view: OrderView): T[] {
  if (view === 'active') return orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled')
  if (view === 'delivered') return orders.filter((order) => order.status === 'delivered')
  if (view === 'cancelled') return orders.filter((order) => order.status === 'cancelled')
  return orders
}
