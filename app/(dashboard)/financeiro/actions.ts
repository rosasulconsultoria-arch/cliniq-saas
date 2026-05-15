'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TransacaoSchema } from '@/lib/schemas/transacao'
import { assertAdmin } from '@/lib/auth-guard'
import { CategoriaSchema } from '@/lib/schemas/categoria'
import { startOfMonth } from 'date-fns'

// ──────────────────────────────────────────────
// Transações
// ──────────────────────────────────────────────

export async function criarTransacao(data: unknown): Promise<{ error?: string }> {
  await assertAdmin()
  const parsed = TransacaoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { data: dataStr, dataPagamento, profissionalId, ...rest } = parsed.data
  try {
    await db.transacaoFinanceira.create({
      data: {
        ...rest,
        data: new Date(dataStr),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        profissionalId: profissionalId || null,
      },
    })
    revalidatePath('/financeiro')
    return {}
  } catch (e: any) {
    return { error: 'Erro ao criar transação.' }
  }
}

export async function atualizarTransacao(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = TransacaoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { data: dataStr, dataPagamento, profissionalId, ...rest } = parsed.data
  try {
    await db.transacaoFinanceira.update({
      where: { id },
      data: {
        ...rest,
        data: new Date(dataStr),
        dataPagamento: dataPagamento ? new Date(dataPagamento) : null,
        profissionalId: profissionalId || null,
      },
    })
    revalidatePath('/financeiro')
    return {}
  } catch {
    return { error: 'Erro ao atualizar transação.' }
  }
}

export async function deletarTransacao(id: string): Promise<void> {
  await assertAdmin()
  await db.transacaoFinanceira.delete({ where: { id } })
  revalidatePath('/financeiro')
}

export async function marcarTransacaoPaga(id: string): Promise<{ error?: string }> {
  try {
    await db.transacaoFinanceira.update({
      where: { id },
      data: { status: 'PAGO', dataPagamento: new Date() },
    })
    revalidatePath('/financeiro')
    return {}
  } catch {
    return { error: 'Erro ao atualizar status.' }
  }
}

// ──────────────────────────────────────────────
// Categorias
// ──────────────────────────────────────────────

export async function criarCategoria(data: unknown): Promise<{ error?: string }> {
  const parsed = CategoriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.categoriaFinanceira.create({ data: parsed.data })
    revalidatePath('/financeiro/categorias')
    return {}
  } catch {
    return { error: 'Erro ao criar categoria.' }
  }
}

export async function atualizarCategoria(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = CategoriaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.categoriaFinanceira.update({ where: { id }, data: parsed.data })
    revalidatePath('/financeiro/categorias')
    return {}
  } catch {
    return { error: 'Erro ao atualizar categoria.' }
  }
}

export async function deletarCategoria(id: string): Promise<void> {
  await db.categoriaFinanceira.delete({ where: { id } })
  revalidatePath('/financeiro/categorias')
}

// ──────────────────────────────────────────────
// Comissões
// ──────────────────────────────────────────────

export async function pagarComissao(comissaoId: string): Promise<{ error?: string }> {
  const comissao = await db.comissao.findUnique({
    where: { id: comissaoId },
    include: { profissional: { include: { user: { select: { name: true } } } } },
  })
  if (!comissao) return { error: 'Comissão não encontrada' }
  if (comissao.status === 'PAGO') return { error: 'Comissão já foi paga' }

  const categoria = await db.categoriaFinanceira.findFirst({
    where: { tipo: 'DESPESA' },
    orderBy: { nome: 'asc' },
  })

  try {
    await db.$transaction(async (tx) => {
      await tx.comissao.update({
        where: { id: comissaoId },
        data: { status: 'PAGO', dataPagamento: new Date() },
      })
      if (categoria) {
        await tx.transacaoFinanceira.create({
          data: {
            tipo: 'DESPESA',
            categoriaId: categoria.id,
            descricao: `Comissão — ${comissao.profissional.user.name}`,
            valor: comissao.valorComissao,
            data: new Date(),
            status: 'PAGO',
            dataPagamento: new Date(),
            profissionalId: comissao.profissionalId,
          },
        })
      }
    })
    revalidatePath('/financeiro/comissoes')
    return {}
  } catch {
    return { error: 'Erro ao pagar comissão.' }
  }
}

// ──────────────────────────────────────────────
// Aluguéis
// ──────────────────────────────────────────────

export async function gerarAlugueisDoMes(): Promise<{ error?: string; count?: number }> {
  const mesAtual = startOfMonth(new Date())

  const profissionais = await db.profissional.findMany({
    where: { tipoVinculo: 'LOCATARIO', ativo: true, valorAluguelMensal: { not: null } },
    select: { id: true, valorAluguelMensal: true },
  })

  let count = 0
  for (const prof of profissionais) {
    if (!prof.valorAluguelMensal) continue
    const existing = await db.aluguel.findFirst({
      where: { profissionalId: prof.id, mesReferencia: mesAtual },
    })
    if (!existing) {
      await db.aluguel.create({
        data: {
          profissionalId: prof.id,
          mesReferencia: mesAtual,
          valor: prof.valorAluguelMensal,
          status: 'PENDENTE',
        },
      })
      count++
    }
  }

  revalidatePath('/financeiro/alugueis')
  return { count }
}

export async function pagarAluguel(aluguelId: string): Promise<{ error?: string }> {
  const aluguel = await db.aluguel.findUnique({
    where: { id: aluguelId },
    include: { profissional: { include: { user: { select: { name: true } } } } },
  })
  if (!aluguel) return { error: 'Aluguel não encontrado' }
  if (aluguel.status === 'PAGO') return { error: 'Aluguel já foi pago' }

  const categoria = await db.categoriaFinanceira.findFirst({
    where: { tipo: 'RECEITA' },
    orderBy: { nome: 'asc' },
  })

  try {
    await db.$transaction(async (tx) => {
      await tx.aluguel.update({
        where: { id: aluguelId },
        data: { status: 'PAGO', dataPagamento: new Date() },
      })
      if (categoria) {
        await tx.transacaoFinanceira.create({
          data: {
            tipo: 'RECEITA',
            categoriaId: categoria.id,
            descricao: `Aluguel de sala — ${aluguel.profissional.user.name}`,
            valor: aluguel.valor,
            data: new Date(),
            status: 'PAGO',
            dataPagamento: new Date(),
            profissionalId: aluguel.profissionalId,
          },
        })
      }
    })
    revalidatePath('/financeiro/alugueis')
    return {}
  } catch {
    return { error: 'Erro ao registrar pagamento.' }
  }
}
