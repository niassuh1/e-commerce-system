import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PageHeader } from '#/components/bits'
import { StoreForm } from '#/components/store-form'
import { useI18n } from '#/i18n'
import { requireUser } from '#/lib/auth'
import { createStore } from '#/server/functions'

export const Route = createFileRoute('/stores/new')({
  beforeLoad: ({ context, location }) => ({ user: requireUser(context, location) }),
  component: NewStorePage,
})

function NewStorePage() {
  const { t } = useI18n()
  const router = useRouter()
  const queryClient = useQueryClient()

  return (
    <div className="page-wrap pt-4">
      <PageHeader title={t('ns.title')} description={t('ns.subtitle')} />
      <div className="mt-8">
        <StoreForm
          initial={{ name: '', logo_url: '' }}
          submitLabel={t('ns.submit')}
          onSubmit={async (values) => {
            const result = await createStore({ data: values })
            if (result.ok) {
              toast.success(t('ns.created', { name: result.data.name }))
              await queryClient.invalidateQueries({ queryKey: ['stores'] })
              queryClient.removeQueries({ queryKey: ['session'] })
              await router.invalidate()
              await router.navigate({ to: '/dashboard/$storeId', params: { storeId: result.data.id } })
            }
            return result
          }}
        />
      </div>
    </div>
  )
}
