'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { criarBloqueio, deletarBloqueio } from '@/app/(dashboard)/agenda/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Bloqueio {
  id: string
  dataHoraInicio: string
  dataHoraFim: string
  motivo: string | null
}

interface Props {
  profissionalId: string
  bloqueiosIniciais: Bloqueio[]
}

export function BloqueioTab({ profissionalId, bloqueiosIniciais }: Props) {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(bloqueiosIniciais)
  const [form, setForm] = useState({ dataHoraInicio: '', dataHoraFim: '', motivo: '' })
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!form.dataHoraInicio || !form.dataHoraFim) { toast.error('Preencha as datas'); return }
    startTransition(async () => {
      const result = await criarBloqueio(profissionalId, form)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Bloqueio criado!')
      setForm({ dataHoraInicio: '', dataHoraFim: '', motivo: '' })
      // Refresh list — in a real app would refetch
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletarBloqueio(id)
      setBloqueios((prev) => prev.filter((b) => b.id !== id))
      toast.success('Bloqueio removido')
    })
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
        <p className="text-sm font-medium">Novo Bloqueio</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Início</Label>
            <Input type="datetime-local" value={form.dataHoraInicio} onChange={(e) => setForm((f) => ({ ...f, dataHoraInicio: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fim</Label>
            <Input type="datetime-local" value={form.dataHoraFim} onChange={(e) => setForm((f) => ({ ...f, dataHoraFim: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Motivo (opcional)</Label>
          <Input placeholder="Ex: Férias, Congresso..." value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
        </div>
        <Button type="button" onClick={handleAdd} disabled={isPending} size="sm">
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Criar Bloqueio
        </Button>
      </div>

      {/* List */}
      {bloqueios.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
          Nenhum bloqueio cadastrado.
        </p>
      ) : (
        <div className="space-y-2">
          {bloqueios.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border p-3 bg-card">
              <div>
                <p className="text-sm font-medium">
                  {format(parseISO(b.dataHoraInicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  {' '} — {' '}
                  {format(parseISO(b.dataHoraFim), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
                {b.motivo && <p className="text-xs text-muted-foreground">{b.motivo}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
