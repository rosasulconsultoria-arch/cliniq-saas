'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/relatorios', label: 'Faturamento', exact: true },
  { href: '/relatorios/por-profissional', label: 'Por Profissional' },
  { href: '/relatorios/por-local', label: 'Por Local' },
  { href: '/relatorios/despesas-categoria', label: 'Despesas' },
  { href: '/relatorios/dre', label: 'DRE' },
  { href: '/relatorios/comissoes', label: 'Comissões' },
  { href: '/relatorios/pacientes', label: 'Pacientes' },
  { href: '/relatorios/ocupacao', label: 'Ocupação' },
]

export function RelatorioNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 overflow-x-auto border-b -mb-6">
      {NAV.map(item => {
        const ativo = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={cn(
            'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            ativo ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
          )}>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
