import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CalendarRange } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { ReservasView } from '@/components/locais/reservas-view'
import { TIPO_LOCAL_ICONS, TIPO_LOCAL_LABELS } from '@/lib/schemas/local'

interface Props {
  params: { id: string }
}

export default async function ReservasLocalPage({ params }: Props) {
  const db = getTenantDb()

  const [local, profissionais, reservas] = await Promise.all([
    db.local.findUnique({ where: { id: params.id } }),
    db.profissional.findMany({
      where: { ativo: true },
      include: { user: true },
      orderBy: { user: { name: 'asc' } },
    }),
    db.reservaLocal.findMany({
      where: { localId: params.id },
      include: { profissional: { include: { user: true } } },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    }),
  ])

  if (!local) notFound()

  const profissionaisFormatados = profissionais.map((p) => ({
    id: p.id,
    nome: p.user.name,
  }))

  const reservasFormatadas = reservas.map((r) => ({
    id:               r.id,
    profissionalId:   r.profissionalId,
    profissionalNome: r.profissional.user.name,
    diaSemana:        r.diaSemana,
    horaInicio:       r.horaInicio,
    horaFim:          r.horaFim,
    vigenciaInicio:   r.vigenciaInicio,
    vigenciaFim:      r.vigenciaFim,
    ativa:            r.ativa,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/locais/${params.id}`}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <span>{TIPO_LOCAL_ICONS[local.tipo]}</span>
            <h1 className="text-2xl font-semibold tracking-tight">{local.nome}</h1>
            <span className="text-sm text-muted-foreground">&middot; {TIPO_LOCAL_LABELS[local.tipo]}</span>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <CalendarRange className="h-3.5 w-3.5" />
            Reservas recorrentes
          </p>
        </div>
      </div>

      <ReservasView
        localId={params.id}
        localNome={local.nome}
        profissionais={profissionaisFormatados}
        reservas={reservasFormatadas}
      />
    </div>
  )
}
