'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cancelarAssinatura } from './actions'

export function BillingCancelDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  const handleCancelar = () => {
    setErro(null)
    startTransition(async () => {
      const result = await cancelarAssinatura()
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setErro(result.error ?? 'Erro desconhecido')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
          <XCircle className="h-4 w-4" />
          Cancelar assinatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar assinatura</DialogTitle>
          <DialogDescription>
            Ao cancelar, você perderá o acesso ao sistema ao fim do período pago. Esta ação pode ser desfeita
            antes do vencimento.
          </DialogDescription>
        </DialogHeader>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleCancelar} disabled={isPending}>
            {isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
