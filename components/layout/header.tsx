'use client'

import { Menu, Sun, Moon, LogOut, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { DashboardUser } from './dashboard-shell'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  PROFISSIONAL: 'Profissional',
  RECEPCAO: 'Recepção',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface HeaderProps {
  user: DashboardUser
  onMenuClick: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6">
      {/* Menu button — apenas mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Toggle tema */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
        >
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 h-10"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold dark:bg-indigo-950 dark:text-indigo-300">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-sm font-medium leading-tight truncate max-w-32">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
              <ChevronDown className="hidden sm:block h-3 w-3 text-muted-foreground shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
