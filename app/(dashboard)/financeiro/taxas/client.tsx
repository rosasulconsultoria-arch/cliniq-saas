'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Building2, Globe, MapPin } from 'lucide-react'
import { criarTaxa, atualizarTaxa, deletarTaxa, toggleTaxa } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Taxa {
  id: string; nome: string; tipo: string
  aliquota: number | null; valorFixo: number | null
  descricao: string | null; ativo: boolean
}

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  tipo: z.enum(['MUNICIPAL', 'FEDERAL', 'ESTADUAL']),
  aliquota: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).max(100).optional()),
  valorFixo: z.preprocess(v => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).optional()),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  MUNICIPAL: { label: 'Municipal', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <MapPin className="h-3 w-3" /> },
  FEDERAL:   { label: 'Federal',   color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Globe className="h-3 w-3" /> },
  ESTADUAL:  { label: 'Estadual',  color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <Building2 className="h-3 w-3" /> },
}

export function TaxasClient({ taxas: initial }: { taxas: Taxa[] }) {
  const router = useRouter()
  const [taxas, setTaxas] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Taxa | null>(null)
  const [isPending, startTransition] = useTransition()

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { tipo: 'FEDERAL', ativo: true },
  })

  function abrirNova() {
    setEditando(null)
    reset({ nome: '', tipo: 'FEDERAL', aliquota: undefined, valorFixo: undefined, descricao: '', ativo: true })
    setDialogOpen(true)
  }

  function abrirEditar(t: Taxa) {
    setEditando(t)
    reset({ nome: t.nome, tipo: t.tipo as any, aliquota: t.aliquota ?? undefined, valorFixo: t.valorFixo ?? undefined, descricao: t.descricao ?? '', ativo: t.ativo })
    setDialogOpen(true)
  }

  function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = editando ? await atualizarTaxa(editando.id, data) : await criarTaxa(data)
      if (result?.error) { toast.error(result.error); return }
      toast.success(editando ? 'Taxa atualizada!' : 'Taxa cadastrada!')
      setDialogOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return
    startTransition(async () => {
      const result = await deletarTaxa(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Taxa excluída.')
      router.refresh()
    })
  }

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await toggleTaxa(id, !ativo)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Taxas e Impostos</h2>
          <p className="text-sm text-muted-foreground">Cadastre alíquotas municipais, estaduais e federais da clínica</p>
        </div>
        <Button onClick={abrirNova} size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Nova Taxa
        </Button>
      </div>

      {taxas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground text-sm">
          Nenhuma taxa cadastrada ainda. Clique em "Nova Taxa" para começar.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Âmbito</TableHead>
                <TableHead>Alíquota</TableHead>
                <TableHead>Valor Fixo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxas.map(t => {
                const cfg = TIPO_CONFIG[t.tipo] ?? TIPO_CONFIG.FEDERAL
                return (
                  <TableRow key={t.id} className={!t.ativo ? 'opacity-50' : undefined}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {t.aliquota != null ? `${t.aliquota.toFixed(2)}%` : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {t.valorFixo != null ? `R$ ${t.valorFixo.toFixed(2).replace('.', ',')}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {t.descricao || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={t.ativo} onCheckedChange={() => handleToggle(t.id, t.ativo)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id, t.nome)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Taxa' : 'Nova Taxa / Imposto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input placeholder="Ex: ISS, IRPF, INSS, PIS…" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Âmbito *</Label>
              <Controller control={control} name="tipo" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FEDERAL">Federal (IRPF, IRPJ, CSLL, PIS, COFINS, INSS…)</SelectItem>
                    <SelectItem value="ESTADUAL">Estadual (ICMS…)</SelectItem>
                    <SelectItem value="MUNICIPAL">Municipal (ISS…)</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Alíquota (%)</Label>
                <Input type="number" min="0" max="100" step="0.01" placeholder="Ex: 5.00" {...register('aliquota')} />
                {errors.aliquota && <p className="text-xs text-destructive">{errors.aliquota.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Valor Fixo (R$)</Label>
                <Input type="number" min="0" step="0.01" placeholder="Ex: 100.00" {...register('valorFixo')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} placeholder="Informações adicionais sobre esta taxa…" {...register('descricao')} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Taxa ativa</p>
                <p className="text-xs text-muted-foreground">Taxas inativas ficam ocultas nos cálculos</p>
              </div>
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
