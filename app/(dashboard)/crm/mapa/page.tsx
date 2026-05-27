import { getCrmPacientes } from '../actions'
import { getTenantDb } from '@/lib/prisma'
import { MapaClient } from './MapaClient'

export default async function CrmMapaPage() {
  const db = getTenantDb()
  const [pacientes, config] = await Promise.all([
    getCrmPacientes(),
    db.configClinica.findFirst(),
  ])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Distribuição geográfica dos clientes ativos.
        O marcador azul indica a localização da clínica.
        Os círculos coloridos mostram a concentração de clientes por cidade.
      </p>
      <MapaClient
        pacientes={pacientes.map(p => ({ cidade: p.cidade }))}
        clinica={{
        nome: config?.nome ?? 'Clínica',
        cidade: config?.cidade ?? null,
        lat: (config as any)?.lat ?? null,
        lng: (config as any)?.lng ?? null,
      }}
      />
    </div>
  )
}
