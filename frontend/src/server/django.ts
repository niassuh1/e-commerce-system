/**
 * Server-only client for the Django services.
 *
 * The browser never talks to Django directly: server functions call these helpers,
 * which read the JWT from httpOnly cookies, refresh it when it expires, and turn
 * DRF error payloads into readable messages.
 */
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

type Service = 'store' | 'auth' | 'product' | 'cart' | 'order'

const SERVICE_URLS: Record<Service, string> = {
  store: process.env.DJANGO_STORE_URL ?? 'http://127.0.0.1:8000/api/store/v1',
  auth: process.env.DJANGO_AUTH_URL ?? 'http://127.0.0.1:8001/api/auth/v1',
  product: process.env.DJANGO_PRODUCT_URL ?? 'http://127.0.0.1:8002/api/product/v1',
  cart: process.env.DJANGO_CART_URL ?? 'http://127.0.0.1:8003/api/cart/v1',
  order: process.env.DJANGO_ORDER_URL ?? 'http://127.0.0.1:8004/api/order/v1',
}

const ACCESS_COOKIE = 'hz_access'
const REFRESH_COOKIE = 'hz_refresh'

const cookieBase = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function storeTokens(tokens: { access: string; refresh?: string }) {
  // Lifetimes match SIMPLE_JWT in the Django settings (8 hours / 7 days).
  setCookie(ACCESS_COOKIE, tokens.access, { ...cookieBase, maxAge: 60 * 60 * 8 })
  if (tokens.refresh) {
    setCookie(REFRESH_COOKIE, tokens.refresh, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 })
  }
}

export function clearTokens() {
  deleteCookie(ACCESS_COOKIE, { path: '/' })
  deleteCookie(REFRESH_COOKIE, { path: '/' })
}

export function hasTokens() {
  return Boolean(getCookie(ACCESS_COOKIE) || getCookie(REFRESH_COOKIE))
}

export class DjangoError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'DjangoError'
    this.status = status
    this.fields = fields
  }
}

/** Flatten DRF's error shapes ({detail}, {field: [msg]}, {non_field_errors}, {items: [...]}) */
function parseError(status: number, body: unknown): DjangoError {
  if (!body || typeof body !== 'object') {
    return new DjangoError(status, status >= 500 ? 'The service is unavailable. Try again shortly.' : 'Request failed.')
  }
  const fields: Record<string, string> = {}
  let message = ''
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    const text = Array.isArray(value) ? value.map(String).join(' ') : String(value)
    if (key === 'detail' || key === 'non_field_errors' || key === 'items' || key === 'cart') {
      message ||= text
    } else {
      fields[key] = text
    }
  }
  message ||= Object.values(fields)[0] ?? 'Request failed.'
  return new DjangoError(status, message, fields)
}

async function refreshAccess(): Promise<string | null> {
  const refresh = getCookie(REFRESH_COOKIE)
  if (!refresh) return null
  const response = await fetch(`${SERVICE_URLS.auth}/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) {
    clearTokens()
    return null
  }
  const data = (await response.json()) as { access: string; refresh?: string }
  storeTokens(data)
  return data.access
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  storeId?: string
  /** Send the user's token. Defaults to true; public reads can turn it off. */
  auth?: boolean
}

export async function django<T>(service: Service, path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, storeId, auth = true } = options

  const send = (token: string | undefined) => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (storeId) headers['x-store-id'] = storeId
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(`${SERVICE_URLS[service]}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  }

  let token = auth ? getCookie(ACCESS_COOKIE) : undefined
  if (auth && !token && getCookie(REFRESH_COOKIE)) token = (await refreshAccess()) ?? undefined

  let response: Response
  try {
    response = await send(token)
    if (response.status === 401 && auth && getCookie(REFRESH_COOKIE)) {
      const fresh = await refreshAccess()
      if (fresh) response = await send(fresh)
    }
  } catch {
    throw new DjangoError(503, `Can't reach the ${service} service. Is the backend running?`)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : undefined
  if (!response.ok) throw parseError(response.status, data)
  return data as T
}

/**
 * Server functions serialize thrown errors by message only. Form actions return
 * field errors as data instead, so the form can place them next to each input.
 */
export type FormResult<T> = { ok: true; data: T } | { ok: false; message: string; fields: Record<string, string> }

export async function asFormResult<T>(run: () => Promise<T>): Promise<FormResult<T>> {
  try {
    return { ok: true, data: await run() }
  } catch (error) {
    if (error instanceof DjangoError) return { ok: false, message: error.message, fields: error.fields }
    throw error
  }
}
