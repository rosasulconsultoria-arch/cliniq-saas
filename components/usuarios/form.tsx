'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { UsuarioSchema, type UsuarioFormData } from '@/lib/schemas/usuario'
import { criarUsuario, atualizarUsuario } from '@/app/(dashboard)/usuarios/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  defaultValues?: Partial<UsuarioFormData>
  isEdit?: boolean
  id?: string
}

export function UsuarioForm({ defaultValues, isEdit = false, id }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UsuarioFormData>({
    resolver: zodResolver(UsuarioSchema) as any,
    defaultValues: { role: 'RECEPCAO', active: true, ...defaultValues },
  })

  function onSubmit(data: UsuarioFormData) {
    startTransition(async () => {
      const result = isEdit && id
        ? await atualizarUsuario(id, data)
        : await criarUsuario(data)

      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Usuário atualizado!' : 'Usuário cadastrado!')
      router.push('/usuarios')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome completo *</Label>
        <Input id="name" placeholder="Ana Souza" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" placeholder="ana@clinica.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{isEdit ? 'Nova senha' : 'Senha *'}</Label>
        <Input
          id="password"
          type="password"
          placeholder={isEdit ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
          {...register('password')}
        />
        {isEdit && <p className="text-xs text-muted-foreground">Deixe em branco para não alterar a senha atual</p>}
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Perfil de acesso *</Label>
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador — Acesso total</SelectItem>
                <SelectItem value="PROFISSIONAL">Profissional — Agenda e pacientes próprios</SelectItem>
                <SelectItem value="RECEPCAO">Recepção — Agenda e cadastros, sem financeiro</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Usuário ativo</p>
          <p className="text-xs text-muted-foreground">Usuários inativos não conseguem fazer login</p>
        </div>
        <Controller
          control={control}
          name="active"
          render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Cadastrar Usuário'}
        </Button>
      </div>
    </form>
  )
}
