'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import type { PlanoConfig } from '@/lib/plans'
import type { Periodicidade } from './PeriodicityToggle'

interface PlanCardProps {
  plano: PlanoConfig
  periodicidade: Periodicidade
  onSelect: (planoId: string, periodicidade: Periodicidade) => void
  loading?: boolean
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatLimit(val: number | 'ilimitado'): string {
  return val === 'ilimitado' ? 'Ilimitado' : String(val)
}

const FEATURE_LABELS: Record<string, string> = {
  taxasImpostos: 'Taxas e impostos',
  alugueis: 'Aluguéis de sala',
  filtrosAvancados: 'Filtros avançados',
  exportacaoRelatorios: 'Exportação de relatórios',
  relatoriosAvancados: 'Relatórios avançados',
  whatsapp: 'Integração WhatsApp',
  suporteChat: 'Suporte via chat',
  suporteTelefone: 'Suporte telefônico',
  slaGarantido: 'SLA garantido',
  onboardingAssistido: 'Onboarding assistido',
  treinamentoEquipe: 'Treinamento de equipe',
  multiTenantPaiFilho: 'Multi-clínica (pai/filho)',
  apiPublica: 'API pública',
  campanhasMassa: 'Campanhas em massa',
  mapaPacientes: 'Mapa de pacientes',
}

export function PlanCard({ plano, periodicidade, onSelect, loading }: PlanCardProps) {
  const isDestaque = plano.destaque === true
  const isAnual = periodicidade === 'ANUAL'
  const price = isAnual ? plano.precos.anual : plano.precos.mensal

  const activeFeatures = Object.entries(plano.features)
    .filter(([, active]) => active)
    .slice(0, 6)
    .map(([key]) => FEATURE_LABELS[key] ?? key)

  const savings = isAnual
    ? plano.precos.mensal.cents * 12 - plano.precos.anual.cents
    : 0

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        isDestaque
          ? 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary scale-[1.03] z-10 bg-background'
          : 'border-border shadow-sm bg-background hover:shadow-md'
      }`}
    >
      {isDestaque && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md">
            Mais escolhido
          </Badge>
        </div>
      )}

      <div className={`flex flex-col gap-4 p-6 ${isDestaque ? 'pt-8' : ''}`}>
        <div>
          <h3 className="text-lg font-bold text-foreground">{plano.nome}</h3>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-1">
            <span className="text-3xl font-extrabold text-foreground">
              {formatCents(isAnual ? plano.precos.anual.mensalEquivalenteCents : plano.precos.mensal.cents)}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">/mês</span>
          </div>
          {isAnual ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-muted-foreground">
                cobrado como {formatCents(plano.precos.anual.cents)}/ano ou 12x sem juros
              </p>
              {savings > 0 && (
                <Badge
                  variant="secondary"
                  className="w-fit border-green-200 bg-green-100 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  Economize {formatCents(savings)}/ano
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">por mês</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span>👥 {formatLimit(plano.limites.profissionais)} profissional(is)</span>
          <span>
            📅{' '}
            {plano.limites.agendamentosMes === 'ilimitado'
              ? 'Agendamentos ilimitados'
              : `${plano.limites.agendamentosMes} agendamentos/mês`}
          </span>
          <span>📍 {formatLimit(plano.limites.locais)} local(is)</span>
        </div>

        <div className="border-t pt-4">
          <ul className="flex flex-col gap-2">
            {activeFeatures.map((label) => (
              <li key={label} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                <span>{label}</span>
              </li>
            ))}
            {activeFeatures.length === 0 && (
              <>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Agenda completa</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Gestão de pacientes</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span>Financeiro básico</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <Button
          className={`mt-auto w-full ${isDestaque ? '' : 'variant-outline'}`}
          variant={isDestaque ? 'default' : 'outline'}
          disabled={loading}
          onClick={() => onSelect(plano.id, periodicidade)}
        >
          {loading ? 'Aguardando...' : 'Começar trial gratuito de 14 dias'}
        </Button>
      </div>
    </div>
  )
}
