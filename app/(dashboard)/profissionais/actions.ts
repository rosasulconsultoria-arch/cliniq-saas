'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { ProfissionalSchema } from '@/lib/schemas/profissional'
import { gerarSlug } from '@/lib/utils'
import bcrypt from 'bcryptjs'

export async function criarProfissional(data: unknown): Promise<{ error?: string }> {
  const parsed = ProfissionalSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { nome, email, senha, especialidade, crp, tipoVinculo, comissaoPercentual, valorAluguelMensal, mesesContrato, valorConsultaPadrao, bio, ativo } = parsed.data
  const fotoBase64 = (data as any).fotoBase64 ?? null

  if (!senha) return { error: 'Senha é obrigatória ao cadastrar profissional' }

  const base = gerarSlug(nome)
  let slug = base
  let n = 1
  while (await db.profissional.findUnique({ where: { slugAgendamento: slug } })) {
    slug = `${base}-${n++}`
  }

  try {
    const hash = await bcrypt.hash(senha, 12)
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: nome, email, passwordHash: hash, role: 'PROFISSIONAL', active: true },
      })
      const prof = await tx.profissional.create({
        data: {
          userId: user.id,
          especialidade,
          crp: crp || null,
          tipoVinculo,
          comissaoPercentual: tipoVinculo === 'COMISSIONADO' ? comissaoPercentual : null,
          valorAluguelMensal: tipoVinculo === 'LOCATARIO' ? valorAluguelMensal : null,
          mesesContrato: tipoVinculo === 'LOCATARIO' ? (mesesContrato ?? null) : null,
          fotoBase64: fotoBase64 ?? null,
          valorConsultaPadrao: valorConsultaPadrao ?? null,
          slugAgendamento: slug,
          bio: bio || null,
          ativo: ativo ?? true,
        },
      })

      // Auto-gerar aluguéis para todo o período do contrato
      if (tipoVinculo === 'LOCATARIO' && valorAluguelMensal && mesesContrato && mesesContrato > 0) {
        const hoje = new Date()
        const alugueis = Array.from({ length: mesesContrato }, (_, i) => {
          const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
          return {
            profissionalId: prof.id,
            mesReferencia: mes,
            valor: valorAluguelMensal,
            status: 'PENDENTE' as const,
          }
        })
        await tx.aluguel.createMany({ data: alugueis })
      }
    })
    revalidatePath('/profissionais')
    return {}
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'Email já cadastrado' }
    console.error(e)
    return { error: 'Erro ao criar profissional. Tente novamente.' }
  }
}

export async function atualizarProfissional(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = ProfissionalSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { nome, email, senha, especialidade, crp, tipoVinculo, comissaoPercentual, valorAluguelMensal, valorConsultaPadrao, bio, ativo } = parsed.data
  const fotoBase64Edit = (data as any).fotoBase64 ?? undefined

  try {
    const prof = await db.profissional.findUnique({ where: { id } })
    if (!prof) return { error: 'Profissional não encontrado' }

    await db.$transaction(async (tx) => {
      const userUpdate: Record<string, unknown> = { name: nome, email }
      if (senha) userUpdate.passwordHash = await bcrypt.hash(senha, 12)

      await tx.user.update({ where: { id: prof.userId }, data: userUpdate })
      await tx.profissional.update({
        where: { id },
        data: {
          especialidade,
          crp: crp || null,
          tipoVinculo,
          comissaoPercentual: tipoVinculo === 'COMISSIONADO' ? comissaoPercentual : null,
          valorAluguelMensal: tipoVinculo === 'LOCATARIO' ? valorAluguelMensal : null,
          valorConsultaPadrao: valorConsultaPadrao ?? null,
          bio: bio || null,
          ativo: ativo ?? true,
          ...(fotoBase64Edit !== undefined ? { fotoBase64: fotoBase64Edit } : {}),
        },
      })
    })
    revalidatePath('/profissionais')
    revalidatePath(`/profissionais/${id}`)
    return {}
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'Email já cadastrado' }
    return { error: 'Erro ao atualizar profissional.' }
  }
}

export async function deletarProfissional(id: string): Promise<void> {
  await db.profissional.delete({ where: { id } })
  revalidatePath('/profissionais')
}
