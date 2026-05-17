import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enviarLembreteEmail, gerarLinkWhatsApp } from '@/lib/notificacoes'
import { addHours } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const agora = new Date()
  const em24h = addHours(agora, 24)
  const em25h = addHours(agora, 25)

  const agendamentos = await db.agendamento.findMany({
    where: {
      status: { in: ['AGENDADO', 'CONFIRMADO'] },
      lembreteEnviado: false,
      dataHoraInicio: { gte: em24h, lte: em25h },
    },
    include: {
      paciente: { select: { nome: true, email: true, telefone: true } },
      profissional: { include: { user: { select: { name: true } } } },
      sala: { select: { nome: true } },
    },
  })

  let enviados = 0
  for (const agend of agendamentos) {
    const dados = {
      id: agend.id,
      dataHoraInicio: agend.dataHoraInicio,
      dataHoraFim: agend.dataHoraFim,
      valor: Number(agend.valor),
      pacienteNome: agend.paciente.nome,
      pacienteEmail: agend.paciente.email,
      pacienteTelefone: agend.paciente.telefone,
      profissionalNome: agend.profissional.user.name,
      salaNome: agend.sala.nome,
      tipoCobranca: agend.tipoCobranca,
      totalSessoes: agend.totalSessoes,
      formaPagamento: (agend as any).formaPagamento,
      numeroParcelas: (agend as any).numeroParcelas,
    }
    await enviarLembreteEmail(dados)
    await db.agendamento.update({ where: { id: agend.id }, data: { lembreteEnviado: true } })
    enviados++
  }

  return NextResponse.json({ ok: true, lembretes: enviados })
}
