'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { pagarComissao, pagarAluguel } from '@/app/(dashboard)/financeiro/actions'
import { format } from 'date-fns'

const FORMAS = ['Pix', 'Transferência Bancária', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']

type Tipo = 'comissao' | 'aluguel'

interface Props {
  id: string
  tipo: Tipo
  descricao: string
  valor: string
}

export function ReceberPagamentoButton({ id, tipo, descricao, valor }: Props) {
  const [open, setOpen] = useState(false)
  const [forma, setForma] = useState('')
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [obs, setObs] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    if (!forma) { toast.error('Selecione a forma de recebimento'); return }
    if (!data) { toast.error('Informe a data'); return }

    startTransition(async () => {
      const fn = tipo === 'comissao' ? pagarComissao : pagarAluguel
      const result = await fn(id, forma, data, obs || undefined)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Recebimento registrado!')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs px-2"
        onClick={() => setOpen(true)}
        title="Registrar recebimento"
      >
        <CheckCircle className="h-3.5 w-3.5 mr-1" />
        Receber
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div>
              <p className="text-sm font-medium">{descricao}</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{valor}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de recebimento *</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger>
                  <SelectValue placeholder="Como foi recebido?" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data do recebimento *</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Textarea
                placeholder="Ex: comprovante PIX recebido, número do depósito..."
                rows={2}
                value={obs}
                onChange={e => setObs(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isPending || !forma || !data}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
