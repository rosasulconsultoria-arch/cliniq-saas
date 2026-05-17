'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deletarDespesa } from '@/app/(dashboard)/meu-financeiro/actions'
import { useRouter } from 'next/navigation'

export function DeleteDespesaButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm('Excluir esta despesa?')) return
    startTransition(async () => {
      const result = await deletarDespesa(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Despesa excluída!')
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  )
}
