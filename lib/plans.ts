import type { PlanoTenant, Periodicidade as PeriodicidadePrisma } from '@prisma/client'

// PlanoId é alias direto do enum Prisma — sem duplicação
export type PlanoId = PlanoTenant

// Periodicidade exposta como union lowercase para ergonomia no TS
export type Periodicidade = 'mensal' | 'anual'

// Mapeamento entre union TS e enum Prisma
export const toPeriodicidadePrisma: Record<Periodicidade, PeriodicidadePrisma> = {
  mensal: 'MENSAL',
  anual: 'ANUAL',
}

export type FeatureKey =
  | 'taxasImpostos'
  | 'alugueis'
  | 'filtrosAvancados'
  | 'exportacaoRelatorios'
  | 'relatoriosAvancados'
  | 'campanhasMassa'
  | 'mapaPacientes'
  | 'whatsapp'
  | 'multiTenantPaiFilho'
  | 'apiPublica'
  | 'suporteChat'
  | 'suporteTelefone'
  | 'slaGarantido'
  | 'onboardingAssistido'
  | 'treinamentoEquipe'

export type LimiteResource = 'profissionais' | 'agendamentosMes' | 'locais' | 'pacientes'

export type Limite = number | 'ilimitado'

export interface PlanoLimites {
  profissionais: Limite
  agendamentosMes: Limite
  locais: Limite
  pacientes: Limite
}

export interface PlanoPrecos {
  mensal: { cents: number; asaasId: string }
  anual: { cents: number; asaasId: string; mensalEquivalenteCents: number }
}

export interface PlanoConfig {
  id: PlanoId
  nome: string
  destaque?: boolean
  limites: PlanoLimites
  features: Record<FeatureKey, boolean>
  precos: PlanoPrecos
}

export const PLANOS: Record<PlanoId, PlanoConfig> = {
  BASICO: {
    id: 'BASICO',
    nome: 'Básico',
    limites: {
      profissionais: 1,
      agendamentosMes: 200,
      locais: 10,
      pacientes: 'ilimitado',
    },
    features: {
      taxasImpostos: false,
      alugueis: false,
      filtrosAvancados: false,
      exportacaoRelatorios: false,
      relatoriosAvancados: false,
      campanhasMassa: false,
      mapaPacientes: false,
      whatsapp: false,
      multiTenantPaiFilho: false,
      apiPublica: false,
      suporteChat: false,
      suporteTelefone: false,
      slaGarantido: false,
      onboardingAssistido: false,
      treinamentoEquipe: false,
    },
    precos: {
      mensal: { cents: 9700, asaasId: 'PLACEHOLDER_basic_m' },
      anual: { cents: 98940, asaasId: 'PLACEHOLDER_basic_y', mensalEquivalenteCents: 8245 },
    },
  },

  PROFISSIONAL: {
    id: 'PROFISSIONAL',
    nome: 'Profissional',
    destaque: true,
    limites: {
      profissionais: 10,
      agendamentosMes: 'ilimitado',
      locais: 20,
      pacientes: 'ilimitado',
    },
    features: {
      taxasImpostos: true,
      alugueis: true,
      filtrosAvancados: true,
      exportacaoRelatorios: true,
      relatoriosAvancados: true,
      campanhasMassa: true,
      mapaPacientes: false,
      whatsapp: true,
      multiTenantPaiFilho: false,
      apiPublica: false,
      suporteChat: true,
      suporteTelefone: false,
      slaGarantido: false,
      onboardingAssistido: false,
      treinamentoEquipe: false,
    },
    precos: {
      mensal: { cents: 19700, asaasId: 'PLACEHOLDER_pro_m' },
      anual: { cents: 189120, asaasId: 'PLACEHOLDER_pro_y', mensalEquivalenteCents: 15760 },
    },
  },

  ENTERPRISE: {
    id: 'ENTERPRISE',
    nome: 'Enterprise',
    limites: {
      profissionais: 'ilimitado',
      agendamentosMes: 'ilimitado',
      locais: 'ilimitado',
      pacientes: 'ilimitado',
    },
    features: {
      taxasImpostos: true,
      alugueis: true,
      filtrosAvancados: true,
      exportacaoRelatorios: true,
      relatoriosAvancados: true,
      campanhasMassa: true,
      mapaPacientes: true,
      whatsapp: true,
      multiTenantPaiFilho: true,
      apiPublica: false,
      suporteChat: true,
      suporteTelefone: true,
      slaGarantido: true,
      onboardingAssistido: true,
      treinamentoEquipe: true,
    },
    precos: {
      mensal: { cents: 49700, asaasId: 'PLACEHOLDER_ent_m' },
      anual: { cents: 477120, asaasId: 'PLACEHOLDER_ent_y', mensalEquivalenteCents: 39760 },
    },
  },
}

export function getPlan(planoId: PlanoId): PlanoConfig {
  return PLANOS[planoId]
}

export function getAllPlans(): PlanoConfig[] {
  return [PLANOS.BASICO, PLANOS.PROFISSIONAL, PLANOS.ENTERPRISE]
}

export function canUseFeature(planoId: PlanoId, featureKey: FeatureKey): boolean {
  return PLANOS[planoId].features[featureKey]
}

export function getLimit(planoId: PlanoId, resource: LimiteResource): Limite {
  return PLANOS[planoId].limites[resource]
}

export function checkLimit(
  planoId: PlanoId,
  resource: LimiteResource,
  currentCount: number
): { allowed: boolean; current: number; limit: Limite; message?: string } {
  const limit = getLimit(planoId, resource)
  if (limit === 'ilimitado') {
    return { allowed: true, current: currentCount, limit }
  }
  if (currentCount >= limit) {
    const nomePlano = PLANOS[planoId].nome
    const resourceLabel: Record<LimiteResource, string> = {
      profissionais: 'profissionais',
      agendamentosMes: 'agendamentos por mês',
      locais: 'locais',
      pacientes: 'pacientes',
    }
    return {
      allowed: false,
      current: currentCount,
      limit,
      message: `Plano ${nomePlano} permite até ${limit} ${resourceLabel[resource]}. Você já tem ${currentCount}.`,
    }
  }
  return { allowed: true, current: currentCount, limit }
}

export function getPriceDisplay(
  planoId: PlanoId,
  periodicidade: Periodicidade
): {
  mensalEquivalente: number
  cobrancaTotal: number
  savingsAnual?: number
  savingsPercentual?: number
  parcelas12xSemJuros?: number
} {
  const precos = PLANOS[planoId].precos
  if (periodicidade === 'mensal') {
    return {
      mensalEquivalente: precos.mensal.cents,
      cobrancaTotal: precos.mensal.cents,
    }
  }
  const mensalEquivalente = precos.anual.mensalEquivalenteCents
  const cobrancaTotal = precos.anual.cents
  const savingsAnual = precos.mensal.cents * 12 - cobrancaTotal
  const savingsPercentual = Math.round((savingsAnual / (precos.mensal.cents * 12)) * 100)
  const parcelas12xSemJuros = Math.round(cobrancaTotal / 12)
  return { mensalEquivalente, cobrancaTotal, savingsAnual, savingsPercentual, parcelas12xSemJuros }
}

