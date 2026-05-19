'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/crm', label: 'Pacientes', exact: true },
  { href: '/crm/mapa', label: 'Mapa de Calor' },
  { href: '/crm/templates', label: 'Templates' },
  { href: '/crm/campanhas', label: 'Campanhas' },
]

export function CrmNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 overflow-x-auto border-b pb-0 -mb-6 pt-0">
      {NAV.map(item => {
        const ativo = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              ativo
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
