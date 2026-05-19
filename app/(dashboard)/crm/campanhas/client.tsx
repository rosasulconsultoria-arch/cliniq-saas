'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Send, MessageCircle, Mail, Loader2, ExternalLink, Copy, CheckCheck } from 'lucide-react'
import { criarCampanha, getCrmPacientes, personalizarMensagem } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Template { id: string; titulo: string; canal: string; assunto: string | null; corpo: string }
interface Servico { id: string; nome: string }
interface Campanha { id: string; titulo: string; canal: string; status: string; totalEnviado: number; criadaEm: Date }

type Paciente = Awaited<ReturnType<typeof getCrmPacientes>>[number]

export function CampanhasClient({ campanhas, templates, servicos }: {
  campanhas: Campanha[]
  templates: Template[]
  servicos: Servico[]
}) {
  const router = useRouter()
  const [step, setStep] = useState<'config' | 'preview' | 'dispatch'>('config')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [enviados, setEnviados] = useState<Set<string>>(new Set())

  // Form state
  const [titulo, setTitulo] = useState('')
  const [canal, setCanal] = useState('WHATSAPP')
  const [templateId, setTemplateId] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [assunto, setAssunto] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [filtroServico, setFiltroServico] = useState('')

  const [destinatarios, setDestinatarios] = useState<Paciente[]>([])
  const [loadingRecipients, startLoadRecipients] = useTransition()

  function abrirNova() {
    setStep('config')
    setTitulo('')
    setCanal('WHATSAPP')
    setTemplateId('')
    setMensagem('')
    setAssunto('')
    setFiltroCidade('')
    setFiltroServico('')
    setDestinatarios([])
    setEnviados(new Set())
    setOpen(true)
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const t = templates.find(t => t.id === id)
    if (t) { setMensagem(t.corpo); setAssunto(t.assunto ?? ''); setCanal(t.canal) }
  }

  function handleBuscarDestinatarios() {
    startLoadRecipients(async () => {
      const pacientes = await getCrmPacientes({
        cidade: filtroCidade || undefined,
        servicoId: filtroServico || undefined,
      })
      const filtrados = canal === 'WHATSAPP'
        ? pacientes.filter(p => p.telefone)
        : pacientes.filter(p => p.email)
      setDestinatarios(filtrados)
      setStep('preview')
    })
  }

  function getMensagemPersonalizada(p: Paciente) {
    return personalizarMensagem(mensagem, {
      nome: p.nome,
      cidade: p.cidade ?? '',
      bairro: p.bairro ?? '',
      servico: p.servicos[0] ?? '',
      ultimaConsulta: p.ultimaConsulta ? format(new Date(p.ultimaConsulta), 'dd/MM/yyyy', { locale: ptBR }) : '',
    })
  }

  function abrirWhatsApp(p: Paciente) {
    const msg = encodeURIComponent(getMensagemPersonalizada(p))
    const tel = p.telefone!.replace(/\D/g, '')
    window.open(`https://wa.me/55${tel}?text=${msg}`, '_blank')
    setEnviados(s => new Set([...s, p.id]))
  }

  function copiarMensagem(p: Paciente) {
    navigator.clipboard.writeText(getMensagemPersonalizada(p))
    toast.success('Mensagem copiada!')
  }

  async function handleSalvar() {
    if (!titulo.trim() || !mensagem.trim()) { toast.error('Preencha título e mensagem'); return }
    startTransition(async () => {
      const result = await criarCampanha({
        titulo,
        canal,
        mensagem,
        assunto: assunto || undefined,
        filtros: JSON.stringify({ cidade: filtroCidade, servico: filtroServico }),
        totalEnviado: enviados.size,
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success(`Campanha salva! ${enviados.size} mensagem(ns) enviada(s).`)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Campanhas de Relacionamento</h2>
          <p className="text-sm text-muted-foreground">Envie mensagens segmentadas para seus pacientes</p>
        </div>
        <Button onClick={abrirNova} size="sm"><Plus className="h-4 w-4 mr-1.5" /> Nova Campanha</Button>
      </div>

      {campanhas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhuma campanha criada ainda.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Campanha</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Canal</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Enviados</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {campanhas.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="p-3 font-medium">{c.titulo}</td>
                  <td className="p-3">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {c.canal === 'WHATSAPP' ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                      {c.canal === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">{c.totalEnviado}</td>
                  <td className="p-3 text-muted-foreground">
                    {format(new Date(c.criadaEm), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === 'config' ? 'Nova Campanha' : step === 'preview' ? `Destinatários (${destinatarios.length})` : 'Disparar Mensagens'}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Config */}
          {step === 'config' && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Título da campanha *</Label>
                <Input placeholder="Ex: Retorno após 60 dias" value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Canal *</Label>
                  <Select value={canal} onValueChange={setCanal}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Usar template (opcional)</Label>
                  <Select value={templateId} onValueChange={handleTemplateChange}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.canal === canal).map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {canal === 'EMAIL' && (
                <div className="space-y-1.5">
                  <Label>Assunto do email</Label>
                  <Input placeholder="Ex: Sentimos sua falta!" value={assunto} onChange={e => setAssunto(e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Mensagem * <span className="text-muted-foreground text-xs">(use {'{{nome}}'}, {'{{cidade}}'}, {'{{servico}}'}, {'{{ultima_consulta}}'})</span></Label>
                <Textarea rows={4} value={mensagem} onChange={e => setMensagem(e.target.value)} className="font-mono text-sm" placeholder="Olá {{nome}}, temos saudades! 😊" />
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar destinatários</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cidade</Label>
                    <Input placeholder="Ex: São Paulo" value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Serviço utilizado</Label>
                    <Select value={filtroServico} onValueChange={setFiltroServico}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {servicos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleBuscarDestinatarios} disabled={loadingRecipients || !mensagem.trim()}>
                  {loadingRecipients && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buscar Destinatários
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4 pt-2">
              {destinatarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum paciente encontrado com {canal === 'WHATSAPP' ? 'WhatsApp' : 'e-mail'} para os filtros selecionados.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {destinatarios.slice(0, 3).map(p => (
                    <div key={p.id} className="rounded-lg border p-3 space-y-1">
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono bg-muted/40 p-2 rounded">
                        {getMensagemPersonalizada(p)}
                      </p>
                    </div>
                  ))}
                  {destinatarios.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">+ {destinatarios.length - 3} destinatários</p>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-between pt-1">
                <Button variant="outline" onClick={() => setStep('config')}>Voltar</Button>
                <Button onClick={() => setStep('dispatch')} disabled={destinatarios.length === 0}>
                  Continuar para Disparo ({destinatarios.length})
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Dispatch */}
          {step === 'dispatch' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{enviados.size}/{destinatarios.length} enviados</span>
                <div className="w-48 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${(enviados.size / destinatarios.length) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {destinatarios.map(p => (
                  <div key={p.id} className={`rounded-lg border p-3 flex items-start gap-3 transition-colors ${enviados.has(p.id) ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{canal === 'WHATSAPP' ? p.telefone : p.email}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 font-mono">
                        {getMensagemPersonalizada(p)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Copiar mensagem" onClick={() => copiarMensagem(p)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {canal === 'WHATSAPP' ? (
                        <Button size="sm" variant={enviados.has(p.id) ? 'outline' : 'default'}
                          className="text-xs h-8 gap-1" onClick={() => abrirWhatsApp(p)}>
                          {enviados.has(p.id) ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <ExternalLink className="h-3.5 w-3.5" />}
                          {enviados.has(p.id) ? 'Enviado' : 'WhatsApp'}
                        </Button>
                      ) : (
                        <Button size="sm" variant={enviados.has(p.id) ? 'outline' : 'default'}
                          className="text-xs h-8 gap-1"
                          onClick={() => { setEnviados(s => new Set([...s, p.id])); toast.info(`Email para ${p.nome} marcado`) }}>
                          {enviados.has(p.id) ? <CheckCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Send className="h-3.5 w-3.5" />}
                          {enviados.has(p.id) ? 'Enviado' : 'Email'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-between pt-1">
                <Button variant="outline" onClick={() => setStep('preview')}>Voltar</Button>
                <Button onClick={handleSalvar} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Campanha
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
