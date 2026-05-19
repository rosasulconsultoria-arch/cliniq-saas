'use client'

import { useTransition, useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PacienteSchema, type PacienteFormData } from '@/lib/schemas/paciente'
import { criarPaciente, atualizarPaciente } from '@/app/(dashboard)/pacientes/actions'
import { mascaraCPF, mascaraTelefone, calcularIdade } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

interface Props {
  defaultValues?: Partial<PacienteFormData>
  isEdit?: boolean
  id?: string
}

export function PacienteForm({ defaultValues, isEdit = false, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [idade, setIdade] = useState<number | null>(null)

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<PacienteFormData>({
    resolver: zodResolver(PacienteSchema) as any,
    defaultValues: { ativo: true, ...defaultValues },
  })

  const dataNascimento = watch('dataNascimento')

  useEffect(() => {
    if (dataNascimento) {
      try {
        setIdade(calcularIdade(new Date(dataNascimento)))
      } catch {
        setIdade(null)
      }
    } else {
      setIdade(null)
    }
  }, [dataNascimento])

  function onSubmit(data: PacienteFormData) {
    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarPaciente(id, data)
        : await criarPaciente(data)

      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Paciente atualizado!' : 'Paciente cadastrado!')
      router.push('/pacientes')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Dados pessoais */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</h3>
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome completo *</Label>
          <Input id="nome" placeholder="Maria da Silva" {...register('nome')} />
          {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cpf">CPF</Label>
            <Controller
              control={control}
              name="cpf"
              render={({ field }) => (
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(mascaraCPF(e.target.value))}
                  maxLength={14}
                />
              )}
            />
            {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefone">Telefone *</Label>
            <Controller
              control={control}
              name="telefone"
              render={({ field }) => (
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(mascaraTelefone(e.target.value))}
                  maxLength={15}
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="maria@email.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
      </section>

      <Separator />

      {/* Informações adicionais */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações Adicionais</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
            <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
            {idade !== null && (
              <p className="text-xs text-muted-foreground">{idade} anos</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Gênero</Label>
            <Controller
              control={control}
              name="genero"
              render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Não binário">Não binário</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {/* Localização */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" placeholder="Centro" {...register('bairro')} />
          </div>
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" placeholder="São Paulo" {...register('cidade')} />
          </div>
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <Input id="estado" placeholder="SP" maxLength={2}
              {...register('estado', { onChange: e => e.target.value = e.target.value.toUpperCase() })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea id="observacoes" placeholder="Informações relevantes sobre o paciente..." rows={4} {...register('observacoes')} />
        </div>
      </section>

      <Separator />

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Paciente ativo</p>
          <p className="text-xs text-muted-foreground">Pacientes inativos não aparecem nas buscas</p>
        </div>
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Cadastrar Paciente'}
        </Button>
      </div>
    </form>
  )
}
