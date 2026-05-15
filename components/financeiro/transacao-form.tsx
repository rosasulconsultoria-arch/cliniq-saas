'use client'

import { useTransition, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { TransacaoSchema, type TransacaoFormData } from '@/lib/schemas/transacao'
import { criarTransacao, atualizarTransacao } from '@/app/(dashboard)/financeiro/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface Categoria { id: string; nome: string; tipo: string; cor: string }
interface Profissional { id: string; nome: string }

interface Props {
  defaultValues?: Partial<TransacaoFormData>
  tipoInicial?: 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'
  categorias: Categoria[]
  profissionais: Profissional[]
  isEdit?: boolean
  id?: string
}

const FORMA_PAGAMENTO = ['PIX', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Dinheiro', 'Transferência', 'Outro']

export function TransacaoForm({ defaultValues, tipoInicial, categorias, profissionais, isEdit = false, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const hoje = format(new Date(), 'yyyy-MM-dd')

  const form = useForm<TransacaoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(TransacaoSchema) as any,
    defaultValues: {
      tipo: tipoInicial ?? 'RECEITA',
      status: 'PENDENTE',
      data: hoje,
      ...defaultValues,
    },
  })

  const { register, control, watch, handleSubmit, setValue, formState: { errors } } = form
  const tipo = watch('tipo')
  const status = watch('status')

  // Filter categorias by tipo
  const categoriasFiltradas = categorias.filter(c => c.tipo === tipo)

  // Reset categoria when tipo changes
  useEffect(() => {
    if (!isEdit) setValue('categoriaId', '')
  }, [tipo, setValue, isEdit])

  function onSubmit(data: TransacaoFormData) {
    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarTransacao(id, data)
        : await criarTransacao(data)
      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Transação atualizada!' : 'Transação criada!')
      router.back()
      router.refresh()
    })
  }

  const backHref = tipo === 'RECEITA' ? '/financeiro/receitas' : tipo === 'DESPESA' ? '/financeiro/despesas' : '/financeiro/investimentos'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Tipo */}
      {!isEdit && (
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                  <SelectItem value="INVESTIMENTO">Investimento</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      )}

      {/* Descrição + Categoria */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <Input placeholder="Ex: Pagamento consulta" {...register('descricao')} />
          {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Controller
            control={control}
            name="categoriaId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                        {c.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoriaId && <p className="text-xs text-destructive">{errors.categoriaId.message}</p>}
        </div>
      </div>

      {/* Valor + Data */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Valor (R$) *</Label>
          <Input type="number" min="0" step="0.01" placeholder="0.00" {...register('valor', { valueAsNumber: true })} />
          {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" {...register('data')} />
          {errors.data && <p className="text-xs text-destructive">{errors.data.message}</p>}
        </div>
      </div>

      {/* Status + Forma de pagamento */}
      <div className="grid gap-4 sm:grid-cols-2">
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
        <div className="space-y-1.5">
          <Label>Forma de Pagamento</Label>
          <Controller
            control={control}
            name="formaPagamento"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {FORMA_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {status === 'PAGO' && (
        <div className="space-y-1.5 max-w-xs">
          <Label>Data de Pagamento</Label>
          <Input type="date" {...register('dataPagamento')} />
        </div>
      )}

      <Separator />

      {/* Profissional vinculado */}
      <div className="space-y-1.5">
        <Label>Profissional vinculado (opcional)</Label>
        <Controller
          control={control}
          name="profissionalId"
          render={({ field }) => (
            <Select value={field.value ?? 'nenhum'} onValueChange={v => field.onChange(v === 'nenhum' ? null : v)}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {profissionais.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea placeholder="Informações adicionais..." rows={2} {...register('observacoes')} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Criar Transação'}
        </Button>
      </div>
    </form>
  )
}
