'use server'

import { getTenantDb } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant-context'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { enviarConfirmacaoEmail } from '@/lib/notificacoes'

// ── Pacientes CRM ─────────────────────────────────────────────────────────────

export async function getCrmPacientes(filtros?: {
  cidade?: string
  servicoId?: string
  semAtendimentoDias?: number
}) {
  return withTenantAction(async () => {
    const db = getTenantDb()

    const pacientes = await db.paciente.findMany({
      where: { ativo: true },
      include: {
        agendamentos: {
          where: { status: 'REALIZADO' },
          include: { servicos: { include: { servico: { select: { nome: true } } } } },
          orderBy: { dataHoraInicio: 'desc' },
          take: 1,
        },
      },
      orderBy: { nome: 'asc' },
    })

    let resultado = pacientes.map(p => {
      const ultimoAg = p.agendamentos[0]
      const servicos = [...new Set(
        p.agendamentos.flatMap(a => a.servicos.map(s => s.servico.nome))
      )]
      return {
        id: p.id,
        nome: p.nome,
        email: p.email ?? null,
        telefone: p.telefone ?? null,
        cpf: p.cpf ?? null,
        cidade: (p as any).cidade ?? null,
        bairro: (p as any).bairro ?? null,
        servicos,
        ultimaConsulta: ultimoAg?.dataHoraInicio?.toISOString() ?? null,
      }
    })

    if (filtros?.cidade) {
      resultado = resultado.filter(p => p.cidade?.toLowerCase().includes(filtros.cidade!.toLowerCase()))
    }
    if (filtros?.servicoId) {
      const servico = await db.servico.findUnique({ where: { id: filtros.servicoId }, select: { nome: true } })
      if (servico) resultado = resultado.filter(p => p.servicos.includes(servico.nome))
    }
    if (filtros?.semAtendimentoDias) {
      const limite = new Date(Date.now() - filtros.semAtendimentoDias * 86_400_000)
      resultado = resultado.filter(p => !p.ultimaConsulta || new Date(p.ultimaConsulta) < limite)
    }

    return resultado
  })
}

export async function getCrmStats() {
  return withTenantAction(async () => {
    const db = getTenantDb()
    const tenantId = getTenantId()

    const [total, porCidade, porServico] = await Promise.all([
      db.paciente.count({ where: { ativo: true } }),
      // $queryRaw não é interceptado pela extension — tenantId adicionado explicitamente
      db.$queryRaw<{ cidade: string; total: bigint }[]>`
        SELECT cidade, COUNT(*) as total FROM "Paciente"
        WHERE ativo = true AND "tenantId" = ${tenantId} AND cidade IS NOT NULL AND cidade != ''
        GROUP BY cidade ORDER BY total DESC LIMIT 10
      `,
      // AgendamentoServico é SKIP_TENANT — filtra por agendamento.tenantId explicitamente
      db.agendamentoServico.groupBy({
        by: ['servicoId'],
        where: { agendamento: { tenantId } },
        _count: { servicoId: true },
        orderBy: { _count: { servicoId: 'desc' } },
        take: 5,
      }),
    ])

    const servicoIds = porServico.map(s => s.servicoId)
    const servicos = await db.servico.findMany({ where: { id: { in: servicoIds } }, select: { id: true, nome: true } })

    return {
      total,
      porCidade: porCidade.map(r => ({ cidade: r.cidade, total: Number(r.total) })),
      porServico: porServico.map(s => ({
        nome: servicos.find(sv => sv.id === s.servicoId)?.nome ?? '—',
        count: s._count.servicoId,
      })),
    }
  })
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TemplateSchema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  canal: z.enum(['WHATSAPP', 'EMAIL']),
  assunto: z.string().optional(),
  corpo: z.string().min(10, 'Mensagem obrigatória'),
  ativo: z.boolean().default(true),
})

export async function criarTemplate(data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = TemplateSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message }
    const db = getTenantDb()
    await db.crmTemplate.create({ data: parsed.data })
    revalidatePath('/crm/templates')
    return {}
  })
}

export async function atualizarTemplate(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = TemplateSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message }
    const db = getTenantDb()
    await db.crmTemplate.update({ where: { id }, data: parsed.data })
    revalidatePath('/crm/templates')
    return {}
  })
}

export async function deletarTemplate(id: string): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.crmTemplate.delete({ where: { id } })
    revalidatePath('/crm/templates')
    return {}
  })
}

// ── Campanhas ─────────────────────────────────────────────────────────────────

const CampanhaSchema = z.object({
  titulo: z.string().min(2, 'Título obrigatório'),
  canal: z.enum(['WHATSAPP', 'EMAIL']),
  mensagem: z.string().min(5, 'Mensagem obrigatória'),
  assunto: z.string().optional(),
  filtros: z.string().optional(),
  totalEnviado: z.number().int().default(0),
})

export async function criarCampanha(data: unknown): Promise<{ id?: string; error?: string }> {
  return withTenantAction(async () => {
    const parsed = CampanhaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message }
    const db = getTenantDb()
    const campanha = await db.crmCampanha.create({ data: { ...parsed.data, status: 'ENVIADA' } })
    revalidatePath('/crm/campanhas')
    return { id: campanha.id }
  })
}

// ── Envio de email via Resend ─────────────────────────────────────────────────

export async function enviarEmailCrm(destinatarios: {
  email: string
  nome: string
  mensagem: string
  assunto: string
}[]): Promise<{ enviados: number; erros: number }> {
  let enviados = 0
  let erros = 0

  for (const dest of destinatarios) {
    try {
      const ok = await enviarConfirmacaoEmail({
        id: '',
        dataHoraInicio: new Date(),
        dataHoraFim: new Date(),
        valor: 0,
        pacienteNome: dest.nome,
        pacienteEmail: dest.email,
        pacienteTelefone: null,
        profissionalNome: '',
        salaNome: '',
        tipoCobranca: 'CONSULTA',
        totalSessoes: null,
        formaPagamento: null,
        numeroParcelas: null,
      } as any)
      if (ok) enviados++; else erros++
    } catch { erros++ }
  }

  return { enviados, erros }
}
