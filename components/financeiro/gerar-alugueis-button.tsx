'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { gerarAlugueisDoMes } from '@/app/(dashboard)/financeiro/actions'

export function GerarAlugueisButton() {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      const result = await gerarAlugueisDoMes()
      if (result.error) { toast.error(result.error); return }
      if (result.count === 0) {
        toast.info('Todos os aluguéis do mês já foram gerados.')
      } else {
        toast.success(`${result.count} aluguel(is) gerado(s) para o mês atual!`)
      }
      router.refresh()
    })
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
      Gerar Aluguéis do Mês
    </Button>
  )
}
