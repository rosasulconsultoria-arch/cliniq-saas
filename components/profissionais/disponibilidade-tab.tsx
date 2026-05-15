'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { salvarDisponibilidade } from '@/app/(dashboard)/agenda/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const DIAS_SEMANA = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

interface Disponibilidade {
  id?: string
  diaSemana: number
  horaInicio: string
  horaFim: string
}

interface Props {
  profissionalId: string
  disponibilidadesIniciais: Disponibilidade[]
}

export function DisponibilidadeTab({ profissionalId, disponibilidadesIniciais }: Props) {
  const [items, setItems] = useState<Disponibilidade[]>(disponibilidadesIniciais)
  const [isPending, startTransition] = useTransition()

  function add() {
    setItems((prev) => [...prev, { diaSemana: 1, horaInicio: '08:00', horaFim: '18:00' }])
  }

  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function update(idx: number, field: keyof Disponibilidade, value: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function save() {
    startTransition(async () => {
      const result = await salvarDisponibilidade(profissionalId, items.map(({ id, ...rest }) => rest))
      if (result?.error) { toast.error(result.error); return }
      toast.success('Disponibilidade salva!')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Horários de atendimento</p>
          <p className="text-xs text-muted-foreground">Configure os dias e horários em que o profissional atende</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1.5" /> Adicionar
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
          Nenhum horário configurado. Clique em "Adicionar" para começar.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-end gap-3 p-3 rounded-lg border bg-card">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Dia da semana</Label>
              <Select value={String(item.diaSemana)} onValueChange={(v) => update(idx, 'diaSemana', Number(v))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map((d) => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-24">
              <Label className="text-xs">Início</Label>
              <Input type="time" value={item.horaInicio} onChange={(e) => update(idx, 'horaInicio', e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1 w-24">
              <Label className="text-xs">Fim</Label>
              <Input type="time" value={item.horaFim} onChange={(e) => update(idx, 'horaFim', e.target.value)} className="h-8 text-xs" />
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(idx)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Disponibilidade
          </Button>
        </div>
      )}
    </div>
  )
}
