'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { DespesaProfissionalSchema, DespesaProfissionalData, CATEGORIAS_DESPESA } from '@/lib/schemas/despesa-profissional'
import { criarDespesa, atualizarDespesa } from '@/app/(dashboard)/meu-financeiro/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Controller } from 'react-hook-form'
import { format } from 'date-fns'

interface Props {
  defaultValues?: Partial<DespesaProfissionalData>
  id?: string
}

export function DespesaForm({ defaultValues, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isEdit = !!id

  const { register, control, handleSubmit, formState: { errors } } = useForm<DespesaProfissionalData>({
    resolver: zodResolver(DespesaProfissionalSchema) as any,
    defaultValues: {
      status: 'PENDENTE',
      data: format(new Date(), 'yyyy-MM-dd'),
      ...defaultValues,
    },
  })

  function onSubmit(data: DespesaProfissionalData) {
    startTransition(async () => {
      const result = isEdit
        ? await atualizarDespesa(id, data)
        : await criarDespesa(data)

      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Despesa atualizada!' : 'Despesa registrada!')
      router.push('/meu-financeiro')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição *</Label>
        <Input id="descricao" placeholder="Ex: Resma de papel, material de escritório..." {...register('descricao')} />
        {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="valor">Valor (R$) *</Label>
          <Input id="valor" type="number" min="0.01" step="0.01" placeholder="0,00" {...register('valor', { valueAsNumber: true })} />
          {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data">Data *</Label>
          <Input id="data" type="date" {...register('data')} />
          {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Controller
            control={control}
            name="categoria"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoria && <p className="text-xs text-destructive">{errors.categoria.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacao">Observação</Label>
        <Textarea id="observacao" placeholder="Detalhes adicionais..." rows={2} {...register('observacao')} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Registrar Despesa'}
        </Button>
      </div>
    </form>
  )
}
