'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Key, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { salvarAsaasApiKey } from '@/app/(dashboard)/profissionais/[id]/asaas-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  profissionalId: string
  apiKeyAtual: string | null
}

export function AsaasConfig({ profissionalId, apiKeyAtual }: Props) {
  const [apiKey, setApiKey] = useState(apiKeyAtual ?? '')
  const [show, setShow] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await salvarAsaasApiKey(profissionalId, apiKey.trim())
      if (result?.error) { toast.error(result.error); return }
      toast.success('API key do Asaas salva!')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border text-sm">
        <Key className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Integração Asaas</p>
          <p className="text-muted-foreground">
            Cole a API key da conta Asaas do profissional. Ela será usada para gerar cobranças (PIX, boleto ou cartão) diretamente nos agendamentos.
          </p>
          <a
            href="https://www.asaas.com/userConfig/index#api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline text-xs"
          >
            Onde encontrar a API key →
          </a>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="asaasKey">API Key do Asaas</Label>
          <div className="relative">
            <Input
              id="asaasKey"
              type={show ? 'text' : 'password'}
              placeholder="$aact_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShow(!show)}
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {apiKeyAtual && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> API key configurada
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending} size="sm">
            {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
          {apiKey && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setApiKey(''); startTransition(async () => { await salvarAsaasApiKey(profissionalId, ''); toast.success('API key removida') }) }}
            >
              Remover
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
