import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { verificarTokenCancelamento } from '@/lib/tokens'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { db } from '@/lib/db'
import { CancelButton } from './_cancel-button'

interface Props {
  params: Promise<{ token: string }>
}

export default async function CancelarAgendamentoPage(props: Props) {
  const params = await props.params;
  const agendamentoId = verificarTokenCancelamento(decodeURIComponent(params.token))

  if (!agendamentoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center rounded-2xl border bg-card p-8 shadow-sm">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Link inválido ou expirado</h1>
          <p className="text-muted-foreground text-sm">
            Este link de cancelamento não é válido ou expirou. Links são válidos por 7 dias.
          </p>
        </div>
      </div>
    )
  }

  const slug = (await headers()).get('x-tenant-slug') ?? ''
  const tenant = slug ? await getTenantBySlug(slug) : null
  if (!tenant) notFound()

  const agendamento = await db.agendamento.findFirst({
    where: { id: agendamentoId, tenantId: tenant.id },
    include: {
      profissional: { include: { user: { select: { name: true } } } },
      paciente: { select: { nome: true } },
    },
  })

  if (!agendamento) return notFound()

  const jaCancelado = agendamento.status === 'CANCELADO'
  const jaRealizado = ['REALIZADO', 'FALTOU'].includes(agendamento.status)
  const passado = agendamento.dataHoraInicio < new Date()

  const dataFormatada = format(agendamento.dataHoraInicio, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const horario = `${format(agendamento.dataHoraInicio, 'HH:mm')} – ${format(agendamento.dataHoraFim, 'HH:mm')}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Clinic header */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 rounded-full px-4 py-2 shadow-sm border">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">CP</div>
            <span className="text-sm font-medium">Clínica de Psicologia</span>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          {jaCancelado ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-slate-400 mx-auto" />
              <h1 className="text-xl font-bold">Agendamento já cancelado</h1>
              <p className="text-muted-foreground text-sm">Este agendamento já foi cancelado anteriormente.</p>
            </div>
          ) : jaRealizado ? (
            <div className="text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
              <h1 className="text-xl font-bold">Não é possível cancelar</h1>
              <p className="text-muted-foreground text-sm">Este agendamento já foi realizado.</p>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-xl font-bold mb-1">Cancelar agendamento</h1>
                <p className="text-muted-foreground text-sm">Confirme os dados abaixo para cancelar.</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paciente</span>
                  <span className="font-medium">{agendamento.paciente.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional</span>
                  <span className="font-medium">{agendamento.profissional.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{dataFormatada}</span>
                  <span className="font-medium">{horario}</span>
                </div>
              </div>

              {passado ? (
                <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Atenção: este agendamento já passou.
                </div>
              ) : null}

              <CancelButton agendamentoId={agendamentoId} />
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={`/agendar/${agendamento.profissional.slugAgendamento ?? ''}`} className="hover:underline text-indigo-600">
            Fazer novo agendamento
          </Link>
        </p>
      </div>
    </div>
  )
}
