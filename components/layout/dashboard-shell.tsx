'use client'

import { useState } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Breadcrumbs } from '@/components/breadcrumbs'

export interface DashboardUser {
  id: string
  name: string
  email: string
  role: string
}

interface DashboardShellProps {
  children: React.ReactNode
  user: DashboardUser
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar fixa — desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col">
        <Sidebar user={user} />
      </aside>

      {/* Sidebar mobile via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar user={user} />
        </SheetContent>
      </Sheet>

      {/* Área principal */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
