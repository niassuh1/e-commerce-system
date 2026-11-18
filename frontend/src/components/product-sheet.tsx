import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { FieldError } from '#/components/auth-layout'
import { ImageUrlField } from '#/components/image-url-field'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { useI18n } from '#/i18n'
import type { Product } from '#/lib/types'
import { createProduct, updateProduct } from '#/server/functions'

type Draft = { name: string; price: string; quantity: string; image_url: string }

const empty: Draft = { name: '', price: '', quantity: '0', image_url: '' }

function toDraft(product: Product | null): Draft {
  if (!product) return empty
  return {
    name: product.name,
    price: product.price,
    quantity: String(product.quantity),
    image_url: product.image_url,
  }
}

/** Add or edit a product. Opens from the inline-end edge, so the product table stays visible. */
export function ProductSheet({
  storeId,
  product,
  open,
  onOpenChange,
}: {
  storeId: string
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const i18n = useI18n()
  const { t } = i18n
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<Draft>(toDraft(product))
  const [fields, setFields] = useState<Record<string, string>>({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(toDraft(product))
      setFields({})
    }
  }, [open, product])

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((prev) => ({ ...prev, [key]: event.target.value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    const price = draft.price.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    const quantity = draft.quantity.trim().replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    if (!draft.name.trim()) errors.name = t('pm.required')
    if (!/^\d+(\.\d{1,2})?$/.test(price)) errors.price = t('pm.priceInvalid')
    if (!/^\d+$/.test(quantity)) errors.quantity = t('pm.stockInvalid')
    if (draft.image_url && !/^https?:\/\/\S+$/.test(draft.image_url.trim())) errors.image_url = t('pm.urlInvalid')
    setFields(errors)
    if (Object.keys(errors).length) return

    const body = {
      storeId,
      name: draft.name.trim(),
      price,
      quantity: Number(quantity),
      image_url: draft.image_url.trim(),
    }
    setPending(true)
    try {
      const result = product
        ? await updateProduct({ data: { ...body, productId: product.id } })
        : await createProduct({ data: body })
      if (!result.ok) {
        setFields(Object.keys(result.fields).length ? result.fields : { name: i18n.error(result.message) })
        return
      }
      toast.success(product ? t('pm.saved') : t('pm.created'))
      await queryClient.invalidateQueries({ queryKey: ['stores', storeId, 'products'] })
      onOpenChange(false)
    } catch (error) {
      toast.error(i18n.error(error instanceof Error ? error.message : ''))
    } finally {
      setPending(false)
    }
  }

  const describe = (key: string) =>
    fields[key] ? { 'aria-invalid': true, 'aria-describedby': `product-${key}-error` } : {}

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={i18n.dir === 'rtl' ? 'left' : 'right'} className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{product ? t('pm.edit') : t('pm.add')}</SheetTitle>
          <SheetDescription>{product ? product.name : t('pm.addSubtitle')}</SheetDescription>
        </SheetHeader>
        <form id="product-form" onSubmit={submit} className="grid flex-1 content-start gap-6 overflow-y-auto p-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="product-name">{t('pm.name')}</Label>
            <Input id="product-name" value={draft.name} onChange={set('name')} maxLength={255} {...describe('name')} />
            <FieldError id="product-name-error" message={fields.name} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-price">{t('pm.price')}</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                dir="ltr"
                placeholder="0.00"
                value={draft.price}
                onChange={set('price')}
                className="tabular"
                {...describe('price')}
              />
              <FieldError id="product-price-error" message={fields.price} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-quantity">{t('pm.stock')}</Label>
              <Input
                id="product-quantity"
                inputMode="numeric"
                dir="ltr"
                value={draft.quantity}
                onChange={set('quantity')}
                className="tabular"
                {...describe('quantity')}
              />
              <FieldError id="product-quantity-error" message={fields.quantity} />
            </div>
          </div>
          <ImageUrlField
            id="product-image"
            label={t('pm.imageUrl')}
            hint={t('pm.imageHint')}
            value={draft.image_url}
            onChange={(image_url) => setDraft((prev) => ({ ...prev, image_url }))}
            error={fields.image_url}
          />
        </form>
        <SheetFooter className="flex-row justify-end border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('pm.cancel')}
          </Button>
          <Button type="submit" form="product-form" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" aria-hidden />}
            {product ? t('pm.save') : t('pm.create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
