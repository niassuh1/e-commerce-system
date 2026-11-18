import { createContext, useContext, useMemo } from 'react'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

import { messages } from './messages'
import type { MessageKey } from './messages'

export type Locale = 'en' | 'ar'
export const LOCALE_COOKIE = 'hz_locale'

function parseLocale(value: string | undefined): Locale {
  return value === 'ar' ? 'ar' : 'en'
}

/** Reads the locale cookie on the server during SSR and from document.cookie in the browser. */
export const readLocale = createIsomorphicFn()
  .server(() => parseLocale(getCookie(LOCALE_COOKIE)))
  .client(() => parseLocale(document.cookie.match(/(?:^|; )hz_locale=([^;]+)/)?.[1]))

export function writeLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

type Vars = Record<string, string | number>

function createI18n(locale: Locale) {
  const tag = locale === 'ar' ? 'ar-SA' : 'en-SA'
  const numberFormat = new Intl.NumberFormat(tag)
  const moneyFormat = new Intl.NumberFormat(tag, { style: 'currency', currency: 'SAR' })
  // Gregorian calendar in both languages; Arabic keeps Arabic-Indic digits.
  const dateFormat = new Intl.DateTimeFormat(`${tag}-u-ca-gregory`, { dateStyle: 'medium' })
  const dateTimeFormat = new Intl.DateTimeFormat(`${tag}-u-ca-gregory`, { dateStyle: 'medium', timeStyle: 'short' })
  const monthFormat = new Intl.DateTimeFormat(`${tag}-u-ca-gregory`, { month: 'short', year: 'numeric' })
  const pluralRules = new Intl.PluralRules(tag)
  const table = messages[locale] ?? messages.en

  function t(key: MessageKey, vars: Vars = {}): string {
    const entry = table[key]
    let text: string
    if (typeof entry === 'string') {
      text = entry
    } else {
      const count = Number(vars.count ?? 0)
      text = entry[pluralRules.select(count)] ?? entry.other
    }
    return text.replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = vars[name]
      if (value === undefined) return `{${name}}`
      return typeof value === 'number' ? numberFormat.format(value) : value
    })
  }

  return {
    locale,
    dir: (locale === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    t,
    money: (value: string | number) => moneyFormat.format(Number(value)),
    number: (value: number) => numberFormat.format(value),
    date: (value: string) => dateFormat.format(new Date(value)),
    dateTime: (value: string) => dateTimeFormat.format(new Date(value)),
    month: (value: string) => monthFormat.format(new Date(value)),
    /** Backend errors arrive in English; translate the ones shoppers actually hit. */
    error(message: string): string {
      if (message === 'invalid_credentials') return t('auth.invalid')
      const stock = message.match(/^Only (\d+) of '(.+)' available\.$/)
      if (stock) return t('error.stock', { count: Number(stock[1]), name: stock[2] })
      if (/authentication credentials were not provided/i.test(message)) return t('error.signInRequired')
      return message || t('error.generic')
    },
  }
}

export type I18n = ReturnType<typeof createI18n>

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => createI18n(locale), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}

/** Turn a thrown server-function error into a translated message. */
export function errorMessage(i18n: I18n, error: unknown): string {
  return i18n.error(error instanceof Error ? error.message : String(error))
}
