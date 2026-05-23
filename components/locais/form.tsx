'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { LocalSchema, type LocalFormData } from '@/lib/schemas/local'
import { criarLocal, atualizarLocal } from '@/app/(dashboard)/locais/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface Props {
  defaultValues?: Partial<LocalFormData>
  isEdit?: boolean
  id?: string
}

const TIPOS = [
  { value: 'SALA',       label: 'Sala',       icon: '🏢' },
  { value: 'ONLINE',     label: 'Online',      icon: '🎥' },
  { value: 'DOMICILIAR', label: 'Domiciliar',  icon: '🏠' },
  { value: 'EXTERNO',    label: 'Externo',     icon: '📍' },
] as const

export function LocalForm({ defaultValues, isEdit = false, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<LocalFormData>({
    resolver: zodResolver(LocalSchema) as any,
    defaultValues: { tipo: 'SALA', ativa: true, ...defaultValues },
  })

  const tipo = watch('tipo')

  function onSubmit(data: LocalFormData) {
    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarLocal(id, data)
        : await criarLocal(data)
      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Local atualizado!' : 'Local cadastrado!')
      router.push('/locais')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" placeholder="Ex: Sala 01, Consultório Online" {...register('nome')} />
        {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Tipo *</Label>
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => field.onChange(t.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors ${
                    field.value === t.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {(tipo === 'SALA' || tipo === 'EXTERNO') && (
        <div className="space-y-1.5">
          <Label htmlFor="endereco">Endereço</Label>
          <Input id="endereco" placeholder="Rua, número, sala..." {...register('endereco')} />
        </div>
      )}

      {tipo === 'SALA' && (
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="capacidade">Capacidade (pessoas)</Label>
          <Input id="capacidade" type="number" min="1" {...register('capacidade', { valueAsNumber: true })} />
        </div>
      )}

      {tipo === 'ONLINE' && (
        <div className="space-y-1.5">
          <Label htmlFor="linkPadrao">Link de videoconferência</Label>
          <Input id="linkPadrao" placeholder="https://meet.google.com/..." {...register('linkPadrao')} />
          {errors.linkPadrao && <p className="text-xs text-destructive">{errors.linkPadrao.message}</p>}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="instrucoes">Instruções ao paciente</Label>
        <Textarea id="instrucoes" placeholder="Confirmar endereço 24h antes, entrar pelo portão lateral..." rows={3} {...register('instrucoes')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="descricao">Notas internas</Label>
        <Textarea id="descricao" placeholder="Descrição e recursos disponíveis..." rows={2} {...register('descricao')} />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Local ativo</p>
          <p className="text-xs text-muted-foreground">Locais inativos não aparecem no agendamento</p>
        </div>
        <Controller control={control} name="ativa"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Cadastrar Local'}
        </Button>
      </div>
    </form>
  )
}
