'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Tag } from 'lucide-react'
import { criarServico, atualizarServico, deletarServico } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Controller } from 'react-hook-form'

interface Servico {
  id: string; nome: string; descricao: string | null; ativo: boolean
  _count: { agendamentos: number }
}

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

export function ServicosClient({ servicos: initial, isAdmin }: { servicos: Servico[]; isAdmin: boolean }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Servico | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { ativo: true },
  })

  function abrirNovo() {
    setEditando(null)
    reset({ nome: '', descricao: '', ativo: true })
    setDialogOpen(true)
  }

  function abrirEditar(s: Servico) {
    setEditando(s)
    reset({ nome: s.nome, descricao: s.descricao ?? '', ativo: s.ativo })
    setDialogOpen(true)
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = editando ? await atualizarServico(editando.id, data) : await criarServico(data)
      if (result?.error) { toast.error(result.error); return }
      toast.success(editando ? 'Serviço atualizado!' : 'Serviço cadastrado!')
      setDialogOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return
    startTransition(async () => {
      const result = await deletarServico(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Serviço excluído.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Serviços</h2>
          <p className="text-sm text-muted-foreground">Serviços prestados que podem ser vinculados a agendamentos</p>
        </div>
        {isAdmin && (
          <Button onClick={abrirNovo} size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Novo Serviço
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {initial.map(s => (
          <div key={s.id} className={`rounded-xl border bg-card p-4 space-y-2 ${!s.ativo ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="font-medium text-sm truncate">{s.nome}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id, s.nome)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {s.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{s.descricao}</p>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">{s._count.agendamentos} agendamento(s)</span>
              <Badge variant={s.ativo ? 'default' : 'secondary'} className="text-xs">
                {s.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {initial.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          Nenhum serviço cadastrado.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Avaliação Neuropsicológica" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} placeholder="Detalhes sobre o serviço…" {...register('descricao')} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <p className="text-sm font-medium">Serviço ativo</p>
              <Controller control={control} name="ativo" render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
