import { redirect } from '@tanstack/react-router'
import type { ParsedLocation } from '@tanstack/react-router'

import type { User } from './types'

/** Use in a route's beforeLoad: sends signed-out visitors to /login and back afterwards. */
export function requireUser(context: { user: User | null }, location: ParsedLocation): User {
  if (!context.user) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
  return context.user
}

/** Only allow same-site relative redirects after sign-in. */
export function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return '/'
  return target
}
