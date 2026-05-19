import { getCrmPacientes } from '../actions'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const CrmMapa = dynamic(
  () => import('@/components/crm/crm-mapa').then(m => ({ default: m.CrmMapa })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-[480px] rounded-xl" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    ),
  }
)

export default async function CrmMapaPage() {
  const pacientes = await getCrmPacientes()
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Distribuição geográfica dos pacientes ativos. O tamanho e a cor dos círculos representam a concentração por cidade.
      </p>
      <CrmMapa pacientes={pacientes.map(p => ({ cidade: p.cidade }))} />
    </div>
  )
}
