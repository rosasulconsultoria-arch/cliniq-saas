import { headers } from 'next/headers'
import Link from 'next/link'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { getTenantBilling } from '@/lib/tenant-lookup'
import { classificarAcessoTenant } from '@/lib/billing/status'

export async function TrialBanner() {
  const headersList = headers()
  const slug = headersList.get('x-tenant-slug')
  if (!slug) return null

  const tenant = await getTenantBilling(slug)
  if (!tenant) return null

  const acesso = classificarAcessoTenant(tenant)
  if (acesso.level !== 'WARNING') return null

  const { diasRestantes, avisoPagamento } = acesso

  // Aviso de pagamento em atraso
  if (avisoPagamento) {
    return (
      <BannerWrapper variant="laranja">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Houve um problema com sua cobrança.{' '}
          <Link href="/billing/atualizar-cartao" className="font-semibold underline underline-offset-2">
            Atualize sua forma de pagamento
          </Link>
        </span>
      </BannerWrapper>
    )
  }

  // Trial expirando hoje (1 dia)
  if (diasRestantes !== undefined && diasRestantes <= 1) {
    return (
      <BannerWrapper variant="vermelho">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Seu trial termina hoje! Adicione forma de pagamento para continuar sem interrupção.{' '}
          <Link href="/billing/atualizar-cartao" className="font-semibold underline underline-offset-2">
            Adicionar agora
          </Link>
        </span>
      </BannerWrapper>
    )
  }

  // Trial expirando em 2-3 dias
  if (diasRestantes !== undefined && diasRestantes <= 3) {
    return (
      <BannerWrapper variant="laranja">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Apenas {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'} para seu trial terminar.{' '}
          <Link href="/billing/atualizar-cartao" className="font-semibold underline underline-offset-2">
            Adicionar forma de pagamento agora
          </Link>
        </span>
      </BannerWrapper>
    )
  }

  // Trial expirando em 4-7 dias
  return (
    <BannerWrapper variant="azul">
      <Info className="h-4 w-4 shrink-0" />
      <span>
        Seu trial termina em {diasRestantes} dias.{' '}
        <Link href="/billing/atualizar-cartao" className="font-semibold underline underline-offset-2">
          Adicionar forma de pagamento
        </Link>
      </span>
    </BannerWrapper>
  )
}

const variantClasses = {
  azul: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
  laranja: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-800',
  vermelho: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
}

function BannerWrapper({
  variant,
  children,
}: {
  variant: keyof typeof variantClasses
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center justify-center gap-2 border-b px-4 py-2 text-sm ${variantClasses[variant]}`}
    >
      {children}
    </div>
  )
}
