import { CrmNav } from '@/components/crm/crm-nav'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relacionamento com pacientes — mapa, mensagens e campanhas
        </p>
      </div>
      <CrmNav />
      {children}
    </div>
  )
}
