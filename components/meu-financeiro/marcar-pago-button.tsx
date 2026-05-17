'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  marcarDespesaPaga,
  marcarAluguelPago,
  marcarComissaoPaga,
} from '@/app/(dashboard)/meu-financeiro/actions'

const FORMAS = [
  { value: 'Pix', label: 'Pix' },
  { value: 'Depósito Bancário', label: 'Depósito Bancário' },
  { value: 'Cartão de Crédito', label: 'Cartão de Crédito' },
  { value: 'Cartão de Débito', label: 'Cartão de Débito' },
  { value: 'Dinheiro', label: 'Dinheiro' },
]

type Tipo = 'despesa' | 'aluguel' | 'comissao'

interface Props {
  id: string
  tipo: Tipo
  descricao: string
}

export function MarcarPagoButton({ id, tipo, descricao }: Props) {
  const [open, setOpen] = useState(false)
  const [forma, setForma] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    if (!forma) { toast.error('Selecione a forma de pagamento'); return }

    startTransition(async () => {
      const fn =
        tipo === 'despesa' ? marcarDespesaPaga :
        tipo === 'aluguel' ? marcarAluguelPago :
        marcarComissaoPaga

      const result = await fn(id, forma)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Pagamento registrado!')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs border-emerald-400 text-emerald-600 hover:bg-emerald-50"
        onClick={() => setOpen(true)}
      >
        <CheckCircle className="h-3.5 w-3.5 mr-1" />
        Quitar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{descricao}</p>
            <div className="space-y-1.5">
              <Label>Forma de pagamento *</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione como foi pago..." />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={isPending || !forma}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
