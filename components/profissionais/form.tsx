'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ProfissionalSchema, type ProfissionalFormData } from '@/lib/schemas/profissional'
import { criarProfissional, atualizarProfissional } from '@/app/(dashboard)/profissionais/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { CopyLinkField } from '@/components/copy-button'

interface Props {
  defaultValues?: Partial<ProfissionalFormData>
  isEdit?: boolean
  id?: string
  slugAgendamento?: string
}

export function ProfissionalForm({ defaultValues, isEdit = false, id, slugAgendamento }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfissionalFormData>({
    resolver: zodResolver(ProfissionalSchema) as any,
    defaultValues: { tipoVinculo: 'COMISSIONADO', ativo: true, ...defaultValues },
  })

  const tipoVinculo = watch('tipoVinculo')

  function onSubmit(data: ProfissionalFormData) {
    if (data.tipoVinculo === 'COMISSIONADO') data.valorAluguelMensal = null
    if (data.tipoVinculo === 'LOCATARIO') data.comissaoPercentual = null

    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarProfissional(id, data)
        : await criarProfissional(data)

      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Profissional atualizado!' : 'Profissional cadastrado!')
      router.push('/profissionais')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Dados de acesso */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados de Acesso</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" placeholder="Dr. João Silva" {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" placeholder="joao@clinica.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <Label htmlFor="senha">{isEdit ? 'Nova senha' : 'Senha *'}</Label>
          <Input id="senha" type="password" placeholder={isEdit ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'} {...register('senha')} />
          {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
        </div>
      </section>

      <Separator />

      {/* Dados profissionais */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Profissionais</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="especialidade">Especialidade *</Label>
            <Input id="especialidade" placeholder="Psicologia Clínica" {...register('especialidade')} />
            {errors.especialidade && <p className="text-xs text-destructive">{errors.especialidade.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crp">CRP</Label>
            <Input id="crp" placeholder="00/00000" {...register('crp')} />
          </div>
        </div>
        <div className="space-y-1.5 max-w-xs">
          <Label htmlFor="valorConsultaPadrao">Valor padrão da consulta (R$)</Label>
          <Input id="valorConsultaPadrao" type="number" min="0" step="0.01" placeholder="150.00" {...register('valorConsultaPadrao', { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground">Preenchido automaticamente ao criar agendamentos</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" placeholder="Breve apresentação para o perfil público..." rows={3} {...register('bio')} />
        </div>
      </section>

      <Separator />

      {/* Tipo de vínculo */}
      <section className="space-y-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Vínculo</h3>
        <Controller
          control={control}
          name="tipoVinculo"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="COMISSIONADO" id="comissionado" />
                <Label htmlFor="comissionado" className="cursor-pointer">Comissionado <span className="text-muted-foreground text-xs">(% por consulta)</span></Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="LOCATARIO" id="locatario" />
                <Label htmlFor="locatario" className="cursor-pointer">Locatário <span className="text-muted-foreground text-xs">(aluguel fixo)</span></Label>
              </div>
            </RadioGroup>
          )}
        />

        {tipoVinculo === 'COMISSIONADO' && (
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="comissaoPercentual">Percentual de Comissão (%) *</Label>
            <Input id="comissaoPercentual" type="number" min="0" max="100" step="0.1" placeholder="30" {...register('comissaoPercentual', { valueAsNumber: true })} />
            {errors.comissaoPercentual && <p className="text-xs text-destructive">{errors.comissaoPercentual.message}</p>}
          </div>
        )}

        {tipoVinculo === 'LOCATARIO' && (
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="valorAluguelMensal">Aluguel Mensal (R$) *</Label>
            <Input id="valorAluguelMensal" type="number" min="0" step="0.01" placeholder="800.00" {...register('valorAluguelMensal', { valueAsNumber: true })} />
            {errors.valorAluguelMensal && <p className="text-xs text-destructive">{errors.valorAluguelMensal.message}</p>}
          </div>
        )}
      </section>

      <Separator />

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Profissional ativo</p>
          <p className="text-xs text-muted-foreground">Inativo não recebe novos agendamentos</p>
        </div>
        <Controller
          control={control}
          name="ativo"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      {isEdit && slugAgendamento && (
        <CopyLinkField
          value={`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/agendar/${slugAgendamento}`}
          label="Link de Agendamento Público"
        />
      )}

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Cadastrar Profissional'}
        </Button>
      </div>
    </form>
  )
}
