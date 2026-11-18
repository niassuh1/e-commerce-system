import { useEffect, useState } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { LogOutIcon, MenuIcon, PackageIcon, SearchIcon, StoreIcon } from 'lucide-react'
import { toast } from 'sonner'

import { CartPopover } from '#/components/cart-popover'
import { Logo } from '#/components/store-avatar'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { useI18n, writeLocale } from '#/i18n'
import type { User } from '#/lib/types'
import { cn } from '#/lib/utils'
import { logout } from '#/server/functions'

const NAV = [
  { to: '/', key: 'nav.stores' },
  { to: '/orders', key: 'nav.orders' },
  { to: '/dashboard', key: 'nav.myStores' },
] as const

const circle =
  'relative grid size-10 shrink-0 place-items-center rounded-full border border-input bg-background text-foreground transition-colors hover:bg-pill'

export function SiteHeader({ user }: { user: User | null }) {
  const i18n = useI18n()
  const { t } = i18n
  const router = useRouter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useRouterState({ select: (state) => state.location })
  const pathname = location.pathname
  const [menuOpen, setMenuOpen] = useState(false)
  const urlQuery = pathname === '/' ? ((location.search as { q?: string }).q ?? '') : ''
  const [query, setQuery] = useState(urlQuery)
  useEffect(() => setQuery(urlQuery), [urlQuery])

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' || (pathname.startsWith('/stores') && pathname !== '/stores/new') : pathname.startsWith(to)

  async function switchLanguage() {
    writeLocale(i18n.locale === 'ar' ? 'en' : 'ar')
    await router.invalidate()
  }

  async function signOut() {
    await logout()
    queryClient.clear()
    await router.invalidate()
    toast(t('auth.signedOut'))
    navigate({ to: '/' })
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}` || user.username.slice(0, 2).toUpperCase()
    : ''

  return (
    <header className="page-wrap flex h-20 items-center gap-4">
      <Link to="/" className="flex shrink-0 items-center gap-2 text-foreground no-underline">
        <Logo />
        <span className="text-xl font-semibold tracking-tight">{t('brand')}</span>
      </Link>

      <nav aria-label={t('nav.main')} className="mx-auto hidden items-center gap-1.5 md:flex">
        {NAV.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 items-center rounded-full px-5 text-sm no-underline transition-colors',
                active ? 'bg-foreground text-background' : 'bg-pill text-foreground hover:bg-accent',
              )}
            >
              {t(item.key)}
            </Link>
          )
        })}
      </nav>

      <div className="ms-auto flex items-center gap-2 md:ms-0">
        <form
          role="search"
          className="relative hidden lg:block"
          onSubmit={(event) => {
            event.preventDefault()
            navigate({ to: '/', search: { q: query.trim() || undefined } })
          }}
        >
          <SearchIcon
            aria-hidden
            className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('home.search')}
            aria-label={t('home.search')}
            className="h-10 w-56 rounded-full border border-input bg-background ps-10 pe-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
          />
        </form>

        <button
          type="button"
          onClick={switchLanguage}
          aria-label={t('nav.switchLanguageLabel')}
          lang={i18n.locale === 'ar' ? 'en' : 'ar'}
          className={cn(circle, 'w-auto px-3.5 text-sm')}
        >
          {i18n.locale === 'ar' ? 'EN' : 'عربي'}
        </button>

        {user ? (
          <>
            <CartPopover className={circle} />

            <DropdownMenu dir={i18n.dir}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full bg-foreground text-xs font-medium text-background transition-opacity hover:opacity-85"
                >
                  <span className="sr-only">{user.username}</span>
                  <span aria-hidden>{initials}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-xs text-muted-foreground">{t('nav.signedInAs')}</span>
                  <span className="block truncate font-medium">{user.username}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/orders">
                    <PackageIcon /> {t('nav.orders')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl">
                  <Link to="/dashboard">
                    <StoreIcon /> {t('nav.myStores')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="rounded-xl">
                  <LogOutIcon className="rtl:rotate-180" /> {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/login" search={{ redirect: undefined }}>
                {t('nav.signIn')}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/register" search={{ redirect: undefined }}>
                {t('nav.signUp')}
              </Link>
            </Button>
          </>
        )}

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button type="button" className={cn(circle, 'md:hidden')} aria-label={t('nav.menu')}>
              <MenuIcon className="size-[18px]" />
            </button>
          </SheetTrigger>
          <SheetContent side={i18n.dir === 'rtl' ? 'left' : 'right'} className="w-72">
            <SheetHeader>
              <SheetTitle>{t('nav.menu')}</SheetTitle>
            </SheetHeader>
            <nav aria-label={t('nav.main')} className="grid gap-1.5 px-4">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'rounded-full px-5 py-3 text-base no-underline',
                    isActive(item.to) ? 'bg-foreground text-background' : 'bg-pill text-foreground',
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
              {!user && (
                <Link
                  to="/login"
                  search={{ redirect: undefined }}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full bg-pill px-5 py-3 text-base text-foreground no-underline"
                >
                  {t('nav.signIn')}
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
