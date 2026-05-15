'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  agenda: 'Agenda',
  pacientes: 'Pacientes',
  profissionais: 'Profissionais',
  salas: 'Salas',
  usuarios: 'Usuários',
  financeiro: 'Financeiro',
  receitas: 'Receitas',
  despesas: 'Despesas',
  investimentos: 'Investimentos',
  comissoes: 'Comissões',
  alugueis: 'Aluguéis',
  categorias: 'Categorias',
  transacoes: 'Transações',
  relatorios: 'Relatórios',
  'por-profissional': 'Por Profissional',
  'por-sala': 'Por Sala',
  'despesas-categoria': 'Despesas por Categoria',
  dre: 'DRE',
  ocupacao: 'Ocupação',
  novo: 'Novo',
  configuracoes: 'Configurações',
  agendar: 'Agendamento',
  cancelar: 'Cancelar',
}

function isCUID(seg: string) {
  return /^c[a-z0-9]{24,}$/.test(seg) || seg.length > 20
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = isCUID(seg) ? 'Editar' : (LABELS[seg] ?? seg)
    const isLast = i === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1 text-xs text-muted-foreground mb-4', className)}
    >
      <Link href="/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="h-3 w-3" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-border shrink-0" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
