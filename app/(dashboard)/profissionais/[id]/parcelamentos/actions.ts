'use server'

import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant-context'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { ParcelamentoSchema } from '@/lib/schemas/parcelamento'
import { addMonths } from 'date-fns'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'

export async function verificarSenha(senha: string): Promise<boolean> {
  return withTenantAction(async () => {
    const session = await auth()
    if (!session?.user?.id) return false
    const prisma = getTenantDb()
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return false
    return bcrypt.compare(senha, user.passwordHash)
  })
}

export async function criarParcelamento(
  profissionalId: string,
  data: unknown
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = ParcelamentoSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const { descricao, agendamentoId, valorTotal, bandeira, tipoPagamento, taxaCartao, totalParcelas, dataInicio } = parsed.data
    const taxa = taxaCartao ?? 0
    const valorLiquido = valorTotal * (1 - taxa / 100)
    const valorParcela = valorLiquido / totalParcelas
    const inicio = new Date(dataInicio)

    const prisma = getTenantDb()
    try {
      await prisma.$transaction(async (tx) => {
        const p = await tx.parcelamento.create({
          data: {
            profissionalId,
            agendamentoId: agendamentoId || null,
            descricao,
            valorTotal,
            bandeira,
            tipoPagamento,
            taxaCartao: taxa,
            totalParcelas,
            valorLiquido,
            status: 'ATIVO',
          },
        })

        const parcelas = Array.from({ length: totalParcelas }, (_, i) => ({
          parcelamentoId: p.id,
          numero: i + 1,
          dataVencimento: addMonths(inicio, i),
          valor: valorParcela,
          status: 'PENDENTE',
        }))

        // Parcela não tem tenantId — criada via FK de parcelamento que já tem tenantId
        await tx.parcela.createMany({ data: parcelas })
      })

      revalidatePath(`/profissionais/${profissionalId}`)
      return {}
    } catch (e) {
      console.error(e)
      return { error: 'Erro ao criar parcelamento.' }
    }
  })
}

export async function marcarParcelaPaga(
  parcelaId: string,
  profissionalId: string
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const tenantId = getTenantId()
    // Parcela é SKIP_TENANT — verificação de tenant via parcelamento.tenantId
    const parcela = await db.parcela.findFirst({
      where: { id: parcelaId, parcelamento: { tenantId } },
    })
    if (!parcela) return { error: 'Parcela não encontrada' }

    await db.parcela.update({
      where: { id: parcelaId },
      data: { status: 'PAGO', dataPagamento: new Date() },
    })
    revalidatePath(`/profissionais/${profissionalId}`)
    return {}
  })
}

export async function cancelarParcelamento(
  id: string,
  profissionalId: string,
  senha: string
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const ok = await verificarSenha(senha)
    if (!ok) return { error: 'Senha incorreta' }

    const prisma = getTenantDb()
    await prisma.parcelamento.update({ where: { id }, data: { status: 'CANCELADO' } })
    revalidatePath(`/profissionais/${profissionalId}`)
    return {}
  })
}
