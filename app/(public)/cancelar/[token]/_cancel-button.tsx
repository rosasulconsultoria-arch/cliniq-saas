'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { atualizarStatusAgendamento } from '@/app/(dashboard)/agenda/actions'

interface Props {
  agendamentoId: string
}

export function CancelButton({ agendamentoId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancel() {
    startTransition(async () => {
      const result = await atualizarStatusAgendamento(agendamentoId, 'CANCELADO')
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Agendamento cancelado.')
      router.refresh()
    })
  }

  return (
    <Button
      variant="destructive"
      className="w-full h-12 font-semibold"
      onClick={handleCancel}
      disabled={isPending}
    >
      {isPending ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...</>
      ) : (
        <><XCircle className="mr-2 h-4 w-4" /> Confirmar Cancelamento</>
      )}
    </Button>
  )
}
