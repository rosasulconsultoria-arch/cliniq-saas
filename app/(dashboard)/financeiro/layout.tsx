import { FinanceiroNav } from '@/components/financeiro/financeiro-nav'

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão financeira da clínica</p>
      </div>
      <FinanceiroNav />
      {children}
    </div>
  )
}
