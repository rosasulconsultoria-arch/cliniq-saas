'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SucessoClientProps {
  nomeClinica: string
  slug: string
  nomePlano: string
  trialEndsAt: string
  clinicaUrl: string
  isProduction: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(text)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button
      onClick={copiar}
      className="ml-2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      title="Copiar URL"
    >
      {copiado ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export function SucessoClient({
  nomeClinica,
  slug,
  nomePlano,
  trialEndsAt,
  clinicaUrl,
  isProduction,
}: SucessoClientProps) {
  const router = useRouter()

  const handleAcessar = () => {
    if (isProduction) {
      window.location.href = `${clinicaUrl}/dashboard`
    } else {
      router.push('/dashboard')
    }
  }

  const urlExibida = isProduction ? clinicaUrl : `${clinicaUrl} (dev: slug = ${slug})`

  return (
    <div className="flex flex-col items-center gap-8 py-8 text-center">
      <div className="rounded-full bg-emerald-50 p-6 dark:bg-emerald-950">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Tudo pronto! Sua clínica está ativa.</h1>
        <p className="text-muted-foreground">
          Clínica <strong>{nomeClinica}</strong> criada com sucesso.
        </p>
      </div>

      <div className="w-full rounded-xl border bg-card p-6 text-left">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              URL da sua clínica
            </p>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="font-mono text-sm">{urlExibida}</span>
              <CopyButton text={clinicaUrl} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trial ativo até
              </p>
              <p className="font-semibold">{trialEndsAt}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Plano
              </p>
              <p className="font-semibold">{nomePlano}</p>
            </div>
          </div>
        </div>
      </div>

      <Button size="lg" className="w-full gap-2" onClick={handleAcessar}>
        Acessar minha clínica
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-sm text-muted-foreground">
        Próximos passos: configure seu logo, adicione seus profissionais e comece a usar.
      </p>
    </div>
  )
}
