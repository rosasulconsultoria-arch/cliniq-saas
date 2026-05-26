'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PeriodicityToggle, type Periodicidade } from '@/components/signup/PeriodicityToggle'
import { PlanCard } from '@/components/signup/PlanCard'
import { getAllPlans } from '@/lib/plans'
import { escolherPlano } from '../actions'

export default function PlanoPage() {
  const router = useRouter()
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('ANUAL')
  const [loadingPlano, setLoadingPlano] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const planos = getAllPlans()

  const handleSelect = (planoId: string, per: Periodicidade) => {
    setLoadingPlano(planoId)
    startTransition(async () => {
      const result = await escolherPlano({ planoId, periodicidade: per })
      if (result.success) {
        router.push('/signup/clinica')
      }
      setLoadingPlano(null)
    })
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Comece seu trial gratuito de 14 dias</h1>
        <p className="text-muted-foreground">
          Sem compromisso. Cancele quando quiser nos primeiros 14 dias.
        </p>
      </div>

      <PeriodicityToggle value={periodicidade} onChange={setPeriodicidade} />

      <div className="grid w-full grid-cols-1 items-center gap-6 md:grid-cols-3">
        {planos.map((plano) => (
          <PlanCard
            key={plano.id}
            plano={plano}
            periodicidade={periodicidade}
            onSelect={handleSelect}
            loading={loadingPlano === plano.id}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Não cobramos nada nos primeiros 14 dias. Cancele a qualquer momento.
      </p>
    </div>
  )
}
