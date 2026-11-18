import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { StoreForm } from '#/components/store-form'
import { useI18n } from '#/i18n'
import { updateStore } from '#/server/functions'

export const Route = createFileRoute('/dashboard/$storeId/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { t } = useI18n()
  const { store } = Route.useRouteContext()
  const router = useRouter()
  const queryClient = useQueryClient()

  return (
    <section className="max-w-xl">
      <h2 className="text-xl font-semibold">{t('ss.title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t('ss.subtitle')}</p>
      <div className="mt-6">
        <StoreForm
          key={store.id}
          storeId={store.id}
          initial={{ name: store.name, logo_url: store.logo_url }}
          submitLabel={t('ss.save')}
          onSubmit={async (values) => {
            const result = await updateStore({ data: { storeId: store.id, ...values } })
            if (result.ok) {
              toast.success(t('ss.saved'))
              await queryClient.invalidateQueries({ queryKey: ['stores'] })
              queryClient.removeQueries({ queryKey: ['session'] })
              await router.invalidate()
            }
            return result
          }}
        />
      </div>
    </section>
  )
}
