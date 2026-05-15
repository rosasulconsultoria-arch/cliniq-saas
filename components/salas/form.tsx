'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SalaSchema, type SalaFormData } from '@/lib/schemas/sala'
import { criarSala, atualizarSala } from '@/app/(dashboard)/salas/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface Props {
  defaultValues?: Partial<SalaFormData>
  isEdit?: boolean
  id?: string
}

export function SalaForm({ defaultValues, isEdit = false, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SalaFormData>({
    resolver: zodResolver(SalaSchema) as any,
    defaultValues: { capacidade: 1, ativa: true, ...defaultValues },
  })

  function onSubmit(data: SalaFormData) {
    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarSala(id, data)
        : await criarSala(data)

      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Sala atualizada!' : 'Sala cadastrada!')
      router.push('/salas')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome da sala *</Label>
        <Input id="nome" placeholder="Sala 01" {...register('nome')} />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label htmlFor="capacidade">Capacidade (pessoas) *</Label>
        <Input id="capacidade" type="number" min="1" {...register('capacidade', { valueAsNumber: true })} />
        {errors.capacidade && <p className="text-xs text-destructive">{errors.capacidade.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" placeholder="Descrição e recursos disponíveis na sala..." rows={3} {...register('descricao')} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Sala ativa</p>
          <p className="text-xs text-muted-foreground">Salas inativas não podem ser agendadas</p>
        </div>
        <Controller
          control={control}
          name="ativa"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Cadastrar Sala'}
        </Button>
      </div>
    </form>
  )
}
