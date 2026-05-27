import { headers } from 'next/headers'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getTenantBilling } from '@/lib/tenant-lookup'
import { classificarAcessoTenant, type BloqueioReason } from '@/lib/billing/status'
import { PLANOS, type PlanoId } from '@/lib/plans'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

const MENSAGENS: Record<BloqueioReason, { titulo: string; descricao: string }> = {
  trial_expired: {
    titulo: 'Seu trial expirou.',
    descricao: 'Ative seu plano para continuar.',
  },
  subscription_canceled: {
    titulo: 'Sua assinatura foi cancelada.',
    descricao: 'Reative seu plano para recuperar o acesso.',
  },
  payment_overdue_grace_expired: {
    titulo: 'Há cobranças em atraso.',
    descricao: 'Regularize sua assinatura para continuar.',
  },
}

export default async function UpgradePage() {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')

  let nomePlano = 'Profissional'
  let valorFormatado = 'R$ 197,00/mês'
  let reason: BloqueioReason = 'trial_expired'

  if (slug) {
    const tenantBilling = await getTenantBilling(slug)
    if (tenantBilling) {
      const acesso = classificarAcessoTenant(tenantBilling)
      if (acesso.reason) reason = acesso.reason
    }

    const tenant = await db.tenant.findFirst({
      where: { slug },
      select: { plano: true, periodicidade: true },
    })

    if (tenant) {
      const planoInfo = PLANOS[tenant.plano as PlanoId]
      if (planoInfo) {
        nomePlano = planoInfo.nome
        const cents = tenant.periodicidade === 'ANUAL'
          ? planoInfo.precos.anual.cents
          : planoInfo.precos.mensal.cents
        const periodo = tenant.periodicidade === 'ANUAL' ? 'ano' : 'mês'
        valorFormatado = `R$ ${(cents / 100).toFixed(2).replace('.', ',')}/${periodo}`
      }
    }
  }

  const mensagem = MENSAGENS[reason]

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="text-center">
        <span className="text-2xl font-bold tracking-tight">CliniQ</span>
      </div>

      {/* Mensagem */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold">{mensagem.titulo}</h1>
        <p className="text-muted-foreground">{mensagem.descricao}</p>
      </div>

      {/* Card do plano */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <span className="font-medium">Plano {nomePlano}</span>
          <span className="text-sm text-muted-foreground">{valorFormatado}</span>
        </div>
      </div>

      {/* CTA */}
      <Button asChild size="lg" className="w-full">
        <Link href="/billing/atualizar-cartao">Adicionar forma de pagamento</Link>
      </Button>

      {/* Sair */}
      <div className="text-center">
        <Link
          href="/api/auth/signout"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </Link>
      </div>
    </div>
  )
}
