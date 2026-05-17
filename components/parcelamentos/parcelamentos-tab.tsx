'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, ChevronDown, ChevronUp, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/utils'
import { ParcelamentoForm } from './parcelamento-form'
import { ConfirmarSenhaDialog } from '@/components/confirmar-senha-dialog'
import { cancelarParcelamento } from '@/app/(dashboard)/profissionais/[id]/parcelamentos/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Parcela {
  id: string
  numero: number
  dataVencimento: string
  valor: number
  status: string
  dataPagamento: string | null
}

interface ParcelamentoItem {
  id: string
  descricao: string
  valorTotal: number
  valorLiquido: number
  taxaCartao: number
  bandeira: string
  tipoPagamento: string
  totalParcelas: number
  status: string
  createdAt: string
  parcelas: Parcela[]
}

interface Props {
  profissionalId: string
  parcelamentos: ParcelamentoItem[]
}

export function ParcelamentosTab({ profissionalId, parcelamentos }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const router = useRouter()

  const ativos = parcelamentos.filter(p => p.status === 'ATIVO')
  const totalPrevisto = ativos.reduce((s, p) => s + p.valorLiquido, 0)
  const totalRecebido = ativos.reduce((s, p) =>
    s + p.parcelas.filter(x => x.status === 'PAGO').reduce((a, x) => a + x.valor, 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Previsto: <span className="font-semibold text-indigo-600">{formatBRL(totalPrevisto)}</span>
            {' '}· Recebido: <span className="font-semibold text-emerald-600">{formatBRL(totalRecebido)}</span>
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Parcelamento
        </Button>
      </div>

      {parcelamentos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p className="text-sm">Nenhum parcelamento registrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {parcelamentos.map(p => {
            const pagas = p.parcelas.filter(x => x.status === 'PAGO').length
            const isExpanded = expandido === p.id
            return (
              <Card key={p.id} className="shadow-sm">
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{p.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.bandeira} · {p.tipoPagamento === 'CREDITO' ? 'Crédito' : 'Débito'}
                        {p.taxaCartao > 0 && ` · Taxa ${p.taxaCartao}%`}
                        {' '}· {p.totalParcelas}x de {formatBRL(p.valorLiquido / p.totalParcelas)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={p.status === 'ATIVO' ? 'border-blue-400 text-blue-600' : 'border-red-400 text-red-500'}>
                        {p.status === 'ATIVO' ? `${pagas}/${p.totalParcelas} pagas` : 'Cancelado'}
                      </Badge>
                      {p.status === 'ATIVO' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setCancelId(p.id)} title="Cancelar parcelamento">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setExpandido(isExpanded ? null : p.id)}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs mt-1">
                    <span>Bruto: {formatBRL(p.valorTotal)}</span>
                    <span className="text-emerald-600">Líquido: {formatBRL(p.valorLiquido)}</span>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Recebimento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.parcelas.map(parc => (
                          <TableRow key={parc.id}>
                            <TableCell className="text-sm">{parc.numero}/{p.totalParcelas}</TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {format(parseISO(parc.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatBRL(parc.valor)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={parc.status === 'PAGO' ? 'border-green-400 text-green-600' : 'border-amber-400 text-amber-600'}>
                                {parc.status === 'PAGO' ? 'Recebido' : 'Pendente'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {parc.dataPagamento ? format(parseISO(parc.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ParcelamentoForm profissionalId={profissionalId} open={formOpen} onClose={() => { setFormOpen(false); router.refresh() }} />

      <ConfirmarSenhaDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        titulo="Cancelar Parcelamento"
        descricao="Esta ação cancelará o parcelamento. Parcelas pendentes não serão mais cobradas. Digite sua senha para confirmar."
        labelConfirmar="Cancelar Parcelamento"
        onConfirm={async (senha) => {
          const result = await cancelarParcelamento(cancelId!, profissionalId, senha)
          if (!result.error) { setCancelId(null); router.refresh() }
          return result
        }}
      />
    </div>
  )
}
