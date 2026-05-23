import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { enviarLembreteEmail } from '@/lib/notificacoes'
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

  // Busca todos os tenants ativos via db puro (tabela Tenant não tem tenantId)
  const tenants = await db.tenant.findMany({
    where: { status: 'ATIVO' },
    select: { id: true, slug: true },
  })

  const resultado: { tenantId: string; enviados: number; erro?: string }[] = []

  for (const tenant of tenants) {
    try {
      const enviados = await runWithTenant(tenant.id, async () => {
        const prisma = getTenantDb()

        const agendamentos = await prisma.agendamento.findMany({
          where: {
            status: { in: ['AGENDADO', 'CONFIRMADO'] },
            lembreteEnviado: false,
            dataHoraInicio: { gte: em24h, lte: em25h },
          },
          include: {
            paciente: { select: { nome: true, email: true, telefone: true } },
            profissional: { include: { user: { select: { name: true } } } },
            local: { select: { nome: true } },
          },
        })

        let count = 0
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
            localNome: agend.local.nome,
            tipoCobranca: agend.tipoCobranca,
            totalSessoes: agend.totalSessoes,
            formaPagamento: (agend as any).formaPagamento,
            numeroParcelas: (agend as any).numeroParcelas,
          }
          await enviarLembreteEmail(dados)
          await prisma.agendamento.update({
            where: { id: agend.id },
            data: { lembreteEnviado: true },
          })
          count++
        }
        return count
      })

      resultado.push({ tenantId: tenant.id, enviados })
    } catch (e) {
      // Erro em um tenant não interrompe os demais
      console.error(JSON.stringify({
        event: 'cron-lembrete-error',
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        error: e instanceof Error ? e.message : String(e),
        timestamp: new Date().toISOString(),
      }))
      resultado.push({ tenantId: tenant.id, enviados: 0, erro: String(e) })
    }
  }

  const totalEnviados = resultado.reduce((acc, r) => acc + r.enviados, 0)
  return NextResponse.json({ ok: true, lembretes: totalEnviados, porTenant: resultado })
}
