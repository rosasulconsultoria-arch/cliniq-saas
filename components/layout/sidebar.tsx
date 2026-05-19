'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  DoorOpen,
  DollarSign,
  BarChart3,
  Settings,
  Receipt,
  HelpCircle,
  Tag,
  HeartHandshake,
} from 'lucide-react'
import type { DashboardUser } from './dashboard-shell'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  },
  {
    href: '/agenda',
    label: 'Agenda',
    icon: Calendar,
    roles: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  },
  {
    href: '/pacientes',
    label: 'Pacientes',
    icon: Users,
    roles: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  },
  {
    href: '/profissionais',
    label: 'Profissionais',
    icon: Building2,
    roles: ['ADMIN', 'RECEPCAO'],
  },
  {
    href: '/salas',
    label: 'Salas',
    icon: DoorOpen,
    roles: ['ADMIN', 'RECEPCAO'],
  },
  {
    href: '/servicos',
    label: 'Serviços',
    icon: Tag,
    roles: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  },
  {
    href: '/crm',
    label: 'CRM',
    icon: HeartHandshake,
    roles: ['ADMIN'],
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    roles: ['ADMIN'],
  },
  {
    href: '/meu-financeiro',
    label: 'Minhas Despesas',
    icon: Receipt,
    roles: ['PROFISSIONAL'],
  },
  {
    href: '/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['ADMIN'],
  },
  {
    href: '/ajuda',
    label: 'Ajuda',
    icon: HelpCircle,
    roles: ['ADMIN', 'PROFISSIONAL', 'RECEPCAO'],
  },
]

interface SidebarProps {
  user: DashboardUser
  clinicaNome?: string
  clinicaLogo?: string | null
  clinicaCor?: string
}

export function Sidebar({ user, clinicaNome = 'Clínica', clinicaLogo, clinicaCor = '#4f46e5' }: SidebarProps) {
  const pathname = usePathname()

  const itensVisiveis = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  )

  return (
    <div className="flex h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-5">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
          style={{ backgroundColor: clinicaLogo ? 'transparent' : clinicaCor }}>
          {clinicaLogo
            ? <img src={clinicaLogo} alt="logo" className="h-full w-full object-cover" />
            : <span className="text-white font-bold text-sm select-none">{clinicaNome.charAt(0).toUpperCase()}</span>
          }
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{clinicaNome}</p>
          <p className="text-xs text-muted-foreground leading-tight truncate">Sistema de Gestão</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {itensVisiveis.map((item) => {
          const Icon = item.icon
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                ativo
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  ativo
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
        <p className="text-xs text-muted-foreground truncate">{user.name}</p>
      </div>
    </div>
  )
}
