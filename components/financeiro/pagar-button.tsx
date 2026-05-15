'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface Props {
  onPagar: () => Promise<{ error?: string }>
  label?: string
}

export function PagarButton({ onPagar, label = 'Marcar como pago' }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await onPagar()
      if (result?.error) { toast.error(result.error); return }
      toast.success('Pago com sucesso!')
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs px-2"
      onClick={handleClick}
      disabled={isPending}
      title={label}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
    </Button>
  )
}
