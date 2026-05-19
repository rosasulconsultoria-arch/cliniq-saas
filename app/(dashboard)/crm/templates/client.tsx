'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, MessageCircle, Mail, HelpCircle } from 'lucide-react'
import { criarTemplate, atualizarTemplate, deletarTemplate } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Template { id: string; titulo: string; canal: string; assunto: string | null; corpo: string; ativo: boolean }

const VARIAVEIS = [
  { key: '{{nome}}', desc: 'Nome do paciente' },
  { key: '{{cidade}}', desc: 'Cidade do paciente' },
  { key: '{{bairro}}', desc: 'Bairro do paciente' },
  { key: '{{servico}}', desc: 'Último serviço utilizado' },
  { key: '{{ultima_consulta}}', desc: 'Data da última consulta' },
]

export function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Template | null>(null)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ titulo: '', canal: 'WHATSAPP', assunto: '', corpo: '', ativo: true })

  function abrirNovo() {
    setEditando(null)
    setForm({ titulo: '', canal: 'WHATSAPP', assunto: '', corpo: '', ativo: true })
    setOpen(true)
  }

  function abrirEditar(t: Template) {
    setEditando(t)
    setForm({ titulo: t.titulo, canal: t.canal, assunto: t.assunto ?? '', corpo: t.corpo, ativo: t.ativo })
    setOpen(true)
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.corpo.trim()) { toast.error('Preencha título e mensagem'); return }
    startTransition(async () => {
      const result = editando
        ? await atualizarTemplate(editando.id, { ...form, assunto: form.assunto || undefined })
        : await criarTemplate({ ...form, assunto: form.assunto || undefined })
      if (result?.error) { toast.error(result.error); return }
      toast.success(editando ? 'Template atualizado!' : 'Template criado!')
      setOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"?`)) return
    startTransition(async () => {
      await deletarTemplate(id)
      toast.success('Template excluído.')
      router.refresh()
    })
  }

  function inserirVariavel(varKey: string) {
    setForm(f => ({ ...f, corpo: f.corpo + varKey }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Templates de Mensagem</h2>
          <p className="text-sm text-muted-foreground">Crie mensagens reutilizáveis com variáveis personalizadas</p>
        </div>
        <Button onClick={abrirNovo} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Novo Template</Button>
      </div>

      {/* Variáveis disponíveis */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Variáveis disponíveis nas mensagens</p>
        <div className="flex flex-wrap gap-2">
          {VARIAVEIS.map(v => (
            <TooltipProvider key={v.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="text-xs bg-background border rounded px-2 py-1 font-mono cursor-default">{v.key}</code>
                </TooltipTrigger>
                <TooltipContent><p>{v.desc}</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum template criado. Clique em "Novo Template" para começar.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {initial.map(t => (
            <div key={t.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{t.titulo}</p>
                  {t.assunto && <p className="text-xs text-muted-foreground truncate">Assunto: {t.assunto}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id, t.titulo)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/40 rounded p-2 font-mono">{t.corpo}</p>
              <div className="flex items-center gap-2">
                <Badge variant={t.canal === 'WHATSAPP' ? 'default' : 'secondary'} className="text-xs gap-1">
                  {t.canal === 'WHATSAPP' ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                  {t.canal === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                </Badge>
                {!t.ativo && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input placeholder="Ex: Mensagem de retorno" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Canal *</Label>
                <Select value={form.canal} onValueChange={v => setForm(f => ({ ...f, canal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.canal === 'EMAIL' && (
              <div className="space-y-1.5">
                <Label>Assunto do Email</Label>
                <Input placeholder="Ex: Sentimos sua falta!" value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Mensagem *</Label>
                <div className="flex gap-1">
                  {VARIAVEIS.map(v => (
                    <button key={v.key} type="button" title={v.desc}
                      onClick={() => inserirVariavel(v.key)}
                      className="text-[10px] bg-muted hover:bg-muted/70 border rounded px-1.5 py-0.5 font-mono transition-colors">
                      {v.key.replace(/\{\{|\}\}/g, '')}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea rows={5} placeholder="Olá {{nome}}, temos saudades! Que tal agendar sua próxima consulta?" value={form.corpo} onChange={e => setForm(f => ({ ...f, corpo: e.target.value }))} className="font-mono text-sm" />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editando ? 'Salvar' : 'Criar Template'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
