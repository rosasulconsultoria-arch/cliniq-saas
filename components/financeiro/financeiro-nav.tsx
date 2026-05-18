'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/financeiro', label: 'Visão Geral', exact: true },
  { href: '/financeiro/contas-a-receber', label: 'Contas a Receber' },
  { href: '/financeiro/fluxo-de-caixa', label: 'Fluxo de Caixa' },
  { href: '/financeiro/receitas', label: 'Receitas' },
  { href: '/financeiro/despesas', label: 'Despesas' },
  { href: '/financeiro/investimentos', label: 'Investimentos' },
  { href: '/financeiro/comissoes', label: 'Comissões' },
  { href: '/financeiro/alugueis', label: 'Aluguéis' },
  { href: '/financeiro/categorias', label: 'Categorias' },
  { href: '/financeiro/dre', label: 'DRE' },
  { href: '/financeiro/taxas', label: 'Taxas e Impostos' },
]

export function FinanceiroNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto border-b pb-0 -mb-6 pt-0">
      {NAV.map((item) => {
        const ativo = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              ativo
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
