'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { enviarConfirmacaoEmail, gerarLinkWhatsApp } from '@/lib/notificacoes'
import { revalidatePath } from 'next/cache'

export async function reenviarConfirmacao(agendamentoId: string): Promise<{ error?: string; whatsappLink?: string }> {
  return withTenantAction(async () => {
    const db = getTenantDb()

    const agend = await db.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        paciente: { select: { nome: true, email: true, telefone: true } },
        profissional: { include: { user: { select: { name: true } } } },
        local: { select: { nome: true } },
      },
    })
    if (!agend) return { error: 'Agendamento não encontrado' }

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

    const emailEnviado = await enviarConfirmacaoEmail(dados)
    if (emailEnviado) {
      await db.agendamento.update({ where: { id: agendamentoId }, data: { confirmacaoEnviada: true } })
      revalidatePath('/agenda')
    }

    const whatsappLink = gerarLinkWhatsApp(dados, 'confirmacao')
    return { whatsappLink: whatsappLink || undefined }
  })
}
