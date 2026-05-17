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

export async function pagarComissao(
  comissaoId: string,
  formaPagamento: string,
  dataPagamento: string,
  observacao?: string,
): Promise<{ error?: string }> {
  const comissao = await db.comissao.findUnique({
    where: { id: comissaoId },
    include: { profissional: { include: { user: { select: { name: true } } } } },
  })
  if (!comissao) return { error: 'Comissão não encontrada' }
  if (comissao.status === 'PAGO') return { error: 'Comissão já foi paga' }

  const dt = new Date(dataPagamento)
  const nomeProf = comissao.profissional.user.name

  const [catDespesa, catReceita] = await Promise.all([
    db.categoriaFinanceira.findFirst({ where: { tipo: 'DESPESA' }, orderBy: { nome: 'asc' } }),
    db.categoriaFinanceira.findFirst({ where: { tipo: 'RECEITA' }, orderBy: { nome: 'asc' } }),
  ])

  try {
    await db.$transaction(async (tx) => {
      await tx.comissao.update({
        where: { id: comissaoId },
        data: { status: 'PAGO', dataPagamento: dt, formaPagamento, observacao: observacao || null },
      })
      // Despesa: comissão paga ao profissional
      if (catDespesa) {
        await tx.transacaoFinanceira.create({
          data: {
            tipo: 'DESPESA',
            categoriaId: catDespesa.id,
            descricao: `Comissão paga — ${nomeProf}`,
            valor: comissao.valorComissao,
            data: dt,
            formaPagamento,
            status: 'PAGO',
            dataPagamento: dt,
            profissionalId: comissao.profissionalId,
            observacoes: observacao || null,
          },
        })
      }
      // Receita: parte da clínica (valorClinica)
      if (catReceita) {
        await tx.transacaoFinanceira.create({
          data: {
            tipo: 'RECEITA',
            categoriaId: catReceita.id,
            descricao: `Receita de consulta — ${nomeProf}`,
            valor: comissao.valorClinica,
            data: dt,
            formaPagamento,
            status: 'PAGO',
            dataPagamento: dt,
            profissionalId: comissao.profissionalId,
            observacoes: observacao || null,
          },
        })
      }
    })
    revalidatePath('/financeiro/comissoes')
    revalidatePath('/dashboard')
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

export async function pagarAluguel(
  aluguelId: string,
  formaPagamento: string,
  dataPagamento: string,
  observacao?: string,
): Promise<{ error?: string }> {
  const aluguel = await db.aluguel.findUnique({
    where: { id: aluguelId },
    include: { profissional: { include: { user: { select: { name: true } } } } },
  })
  if (!aluguel) return { error: 'Aluguel não encontrado' }
  if (aluguel.status === 'PAGO') return { error: 'Aluguel já foi pago' }

  const dt = new Date(dataPagamento)
  const categoria = await db.categoriaFinanceira.findFirst({
    where: { tipo: 'RECEITA' },
    orderBy: { nome: 'asc' },
  })

  try {
    await db.$transaction(async (tx) => {
      await tx.aluguel.update({
        where: { id: aluguelId },
        data: { status: 'PAGO', dataPagamento: dt, formaPagamento, observacao: observacao || null },
      })
      if (categoria) {
        await tx.transacaoFinanceira.create({
          data: {
            tipo: 'RECEITA',
            categoriaId: categoria.id,
            descricao: `Aluguel de sala — ${aluguel.profissional.user.name}`,
            valor: aluguel.valor,
            data: dt,
            formaPagamento,
            status: 'PAGO',
            dataPagamento: dt,
            profissionalId: aluguel.profissionalId,
            observacoes: observacao || null,
          },
        })
      }
    })
    revalidatePath('/financeiro/alugueis')
    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Erro ao registrar pagamento.' }
  }
}
