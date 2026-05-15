import { RelatorioNav } from '@/components/relatorios/relatorio-nav'

export default function RelatoriosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Análises e exportações — acesso restrito a administradores</p>
      </div>
      <RelatorioNav />
      {children}
    </div>
  )
}
