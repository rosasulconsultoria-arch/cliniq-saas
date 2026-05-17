'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (senha: string) => Promise<{ error?: string }>
  titulo?: string
  descricao?: string
  labelConfirmar?: string
}

export function ConfirmarSenhaDialog({
  open,
  onClose,
  onConfirm,
  titulo = 'Confirmar ação',
  descricao = 'Esta ação é irreversível. Digite sua senha para confirmar.',
  labelConfirmar = 'Confirmar',
}: Props) {
  const [senha, setSenha] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    if (!senha) { toast.error('Digite sua senha'); return }
    startTransition(async () => {
      const result = await onConfirm(senha)
      if (result?.error) { toast.error(result.error); return }
      setSenha('')
      onClose()
    })
  }

  function handleClose() {
    setSenha('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-destructive" />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>Sua senha</Label>
          <Input
            type="password"
            placeholder="Digite sua senha..."
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending || !senha}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {labelConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
