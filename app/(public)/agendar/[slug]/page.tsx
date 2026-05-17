import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { BookingFlow } from '@/components/booking/booking-flow'

interface Props {
  params: { slug: string }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export async function generateMetadata({ params }: Props) {
  const profissional = await db.profissional.findUnique({
    where: { slugAgendamento: params.slug },
    include: { user: { select: { name: true } } },
  })
  if (!profissional) return {}
  return {
    title: `Agendar com ${profissional.user.name}`,
    description: `Agende uma consulta de ${profissional.especialidade} com ${profissional.user.name}`,
  }
}

export default async function AgendamentoPublicoPage({ params }: Props) {
  const [profissional, config] = await Promise.all([
    db.profissional.findUnique({
      where: { slugAgendamento: params.slug },
      include: {
        user: { select: { name: true } },
        disponibilidades: true,
      },
    }),
    db.configClinica.findUnique({ where: { id: 'default' } }),
  ])

  if (!profissional || !profissional.ativo) notFound()

  const diasComDisponibilidade = Array.from(
    new Set(profissional.disponibilidades.map((d) => d.diaSemana))
  )

  const nome = profissional.user.name
  const initials = getInitials(nome)
  const foto = (profissional as any).fotoBase64 ?? null
  const clinicaNome = config?.nome ?? 'Clínica de Psicologia'
  const clinicaLogo = config?.logoBase64 ?? null
  const clinicaCor = config?.corPrimaria ?? '#4f46e5'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      <div className="max-w-lg mx-auto px-4 py-8 pb-16">

        {/* Clinic header */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 rounded-full px-4 py-2 shadow-sm border border-border/50">
            {clinicaLogo ? (
              <img src={clinicaLogo} alt="logo" className="h-6 w-6 rounded-lg object-cover" />
            ) : (
              <div className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-xs font-bold select-none" style={{ backgroundColor: clinicaCor }}>
                {clinicaNome.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">{clinicaNome}</span>
          </div>
        </div>

        {/* Professional card */}
        <div className="rounded-2xl border bg-card shadow-sm p-6 mb-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden shadow-sm">
              {foto ? (
                <img src={foto} alt={nome} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl font-bold" style={{ backgroundColor: clinicaCor + '20', color: clinicaCor }}>
                  {initials}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{nome}</h1>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm mt-0.5">
                {profissional.especialidade}
              </p>
              {profissional.crp && (
                <p className="text-xs text-muted-foreground mt-0.5">CRP {profissional.crp}</p>
              )}
            </div>
            {profissional.bio && (
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                {profissional.bio}
              </p>
            )}
          </div>
        </div>

        {/* Booking flow */}
        {diasComDisponibilidade.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Este profissional ainda não tem horários de atendimento configurados.
            </p>
          </div>
        ) : (
          <BookingFlow
            profissionalId={profissional.id}
            nomeProfissional={nome}
            diasComDisponibilidade={diasComDisponibilidade}
          />
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          © {clinicaNome} · Agendamento Online
        </p>
      </div>
    </div>
  )
}
