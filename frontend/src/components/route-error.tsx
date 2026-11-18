import { useRouter } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { useEffect } from 'react'

import { Button } from '#/components/ui/button'
import { errorMessage, useI18n } from '#/i18n'

export function RouteError({ error }: ErrorComponentProps) {
  const i18n = useI18n()
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()

  useEffect(() => {
    queryErrorResetBoundary.reset()
  }, [queryErrorResetBoundary])

  return (
    <div className="page-wrap py-20">
      <div className="mx-auto max-w-md rounded-3xl border p-8 text-center">
        <h1 className="text-xl font-semibold">{i18n.t('error.generic')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{errorMessage(i18n, error)}</p>
        <Button className="mt-6" onClick={() => router.invalidate()}>
          {i18n.t('error.retry')}
        </Button>
      </div>
    </div>
  )
}
