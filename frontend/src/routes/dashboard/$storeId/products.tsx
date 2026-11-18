import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { MoreHorizontalIcon, PackagePlusIcon, PencilIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { EmptyState, ProductImage } from '#/components/bits'
import { ProductSheet } from '#/components/product-sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '#/components/ui/table'
import { errorMessage, useI18n } from '#/i18n'
import { productsQuery } from '#/lib/queries'
import type { Product } from '#/lib/types'
import { deleteProduct } from '#/server/functions'

export const Route = createFileRoute('/dashboard/$storeId/products')({
  validateSearch: z.object({ new: z.boolean().optional() }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(productsQuery(params.storeId)),
  component: ProductsPage,
})

function ProductsPage() {
  const i18n = useI18n()
  const { t, money, number } = i18n
  const { storeId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data: products } = useSuspenseQuery(productsQuery(storeId))

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [sheetOpen, setSheetOpen] = useState(Boolean(search.new))
  const [deleting, setDeleting] = useState<Product | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return needle ? products.filter((product) => product.name.toLocaleLowerCase().includes(needle)) : products
  }, [products, query])

  const remove = useMutation({
    mutationFn: (product: Product) => deleteProduct({ data: { storeId, productId: product.id } }),
    onSuccess: () => {
      toast.success(t('pm.deleted'))
      return queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'products'] })
    },
    onError: (error) => toast.error(errorMessage(i18n, error)),
  })

  function openSheet(product: Product | null) {
    setEditing(product)
    setSheetOpen(true)
  }

  function onSheetChange(open: boolean) {
    setSheetOpen(open)
    if (!open && search.new) navigate({ search: {}, replace: true })
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t('dash.products')}</h2>
          <p className="text-sm text-muted-foreground">{t('pm.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {products.length > 0 && (
            <div className="relative w-full sm:w-64">
              <SearchIcon
                aria-hidden
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('pm.search')}
                aria-label={t('pm.search')}
                className="ps-9"
              />
            </div>
          )}
          <Button onClick={() => openSheet(null)}>
            <PlusIcon aria-hidden />
            {t('pm.add')}
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<PackagePlusIcon className="size-6" aria-hidden />}
          title={t('pm.empty')}
          description={t('pm.emptyHint')}
          action={<Button onClick={() => openSheet(null)}>{t('pm.add')}</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState className="mt-6" title={t('store.noResults', { query })} />
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="ps-5">{t('pm.name')}</TableHead>
                <TableHead className="text-end">{t('cart.price')}</TableHead>
                <TableHead className="text-end">{t('pm.stock')}</TableHead>
                <TableHead className="w-px pe-5">
                  <span className="sr-only">{t('pm.edit')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="ps-5">
                    <button
                      type="button"
                      onClick={() => openSheet(product)}
                      className="flex items-center gap-3 rounded-md text-start"
                    >
                      <ProductImage src={product.image_url} alt="" className="size-10 shrink-0 rounded-2xl" />
                      <span className="max-w-[32ch] truncate font-medium hover:underline">{product.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="tabular text-end">{money(product.price)}</TableCell>
                  <TableCell className="text-end">
                    <span className="inline-flex items-center justify-end gap-2">
                      {product.quantity === 0 ? (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
                          {t('pm.out')}
                        </span>
                      ) : product.quantity <= 5 ? (
                        <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                          {t('pm.low')}
                        </span>
                      ) : null}
                      <span className="tabular w-10">{number(product.quantity)}</span>
                    </span>
                  </TableCell>
                  <TableCell className="pe-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('pm.actionsFor', { name: product.name })}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openSheet(product)}>
                          <PencilIcon /> {t('pm.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(product)}>
                          <Trash2Icon /> {t('pm.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductSheet storeId={storeId} product={editing} open={sheetOpen} onOpenChange={onSheetChange} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pm.deleteTitle', { name: deleting?.name ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('pm.deleteBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('pm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleting && remove.mutate(deleting)}
            >
              {t('pm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
