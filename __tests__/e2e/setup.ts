import { execSync } from 'child_process'
import path from 'path'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// ── Carregar .env.local antes de qualquer validação ────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Cria um Pool pg usando as credenciais do DATABASE_URL principal e injeta
 * o schema via PostgreSQL startup option (-c search_path=...).
 * Esta abordagem é confiável porque o search_path é enviado no startup
 * message do protocolo PostgreSQL — sem race conditions.
 */
function makePool(schema: string): Pool {
  const mainUrl = process.env.DATABASE_URL!
  const base    = mainUrl.replace(/[?&]schema=[^&\s]*/g, '').replace(/[?&]$/, '')
  return new Pool({
    connectionString: base,
    ssl: { rejectUnauthorized: false },
    options: `-c search_path="${schema}"`,
  })
}

/**
 * Constrói URL para Prisma CLI (migrate deploy) com schema correto.
 * Usa credenciais do DATABASE_URL + schema do DATABASE_URL_TEST.
 */
function buildPrismaTestUrl(schema: string): string {
  const mainUrl = process.env.DATABASE_URL!
  const base    = mainUrl.replace(/[?&]schema=[^&\s]*/g, '').replace(/[?&]$/, '')
  const sep     = base.includes('?') ? '&' : '?'
  return `${base}${sep}schema=${schema}`
}

// ── 5 verificações de segurança ────────────────────────────────────────────

function assertSafe(): { testUrl: string; schema: string } {
  const testUrl = process.env.DATABASE_URL_TEST
  const mainUrl = process.env.DATABASE_URL

  if (!testUrl) {
    throw new Error('[E2E-SAFETY 1] DATABASE_URL_TEST não está configurada em .env.local. Abortando.')
  }
  if (!testUrl.includes('schema=')) {
    throw new Error(
      '[E2E-SAFETY 2] DATABASE_URL_TEST não contém parâmetro "?schema=". ' +
      'Adicione ?schema=test_schema para evitar apontar para public. Abortando.'
    )
  }
  const schema = testUrl.match(/schema=([^&\s]+)/)?.[1] ?? ''
  if (!schema || schema === 'public') {
    throw new Error(
      `[E2E-SAFETY 3] DATABASE_URL_TEST aponta para schema="${schema || 'indefinido'}". ` +
      'O schema deve ser diferente de "public". Abortando.'
    )
  }
  if (testUrl === mainUrl) {
    throw new Error(
      '[E2E-SAFETY 4] DATABASE_URL_TEST é idêntica a DATABASE_URL. ' +
      'Isso apagaria o banco de desenvolvimento. Abortando.'
    )
  }
  return { testUrl, schema }
}

async function assertSchemaViaQuery(schema: string) {
  const pool   = makePool(schema)
  const client = await pool.connect()
  try {
    const res    = await client.query('SELECT current_schema()')
    const actual: string = res.rows[0].current_schema
    if (actual !== schema) {
      throw new Error(
        `[E2E-SAFETY 5] SELECT current_schema() retornou "${actual}", esperado "${schema}". ` +
        'Verifique a DATABASE_URL_TEST. Abortando.'
      )
    }
    const host = (process.env.DATABASE_URL ?? '').match(/@([^:/]+)/)?.[1] ?? 'desconhecido'
    console.log(`\n[E2E] ✓ Banco de testes confirmado: schema="${actual}" host=${host}`)
  } finally {
    client.release()
    await pool.end()
  }
}

// ── Cleanup de dados residuais em public (runs de anteriores com pool errado)
async function cleanupPublicContamination() {
  const mainUrl = process.env.DATABASE_URL!
  const pool    = new Pool({ connectionString: mainUrl.replace(/[?&]schema=[^&\s]*/g, '').replace(/[?&]$/, ''), ssl: { rejectUnauthorized: false } })
  const client  = await pool.connect()
  try {
    const { rows } = await client.query<{ id: string }>(
      `SELECT id FROM "Tenant" WHERE slug IN ('clinic-a', 'clinic-b')`
    )
    if (rows.length === 0) return

    const ids = rows.map(r => `'${r.id}'`).join(',')
    // Deletar em ordem de FK (ON DELETE RESTRICT exige ordem explícita)
    await client.query(`DELETE FROM "AgendamentoServico" WHERE "agendamentoId" IN (SELECT id FROM "Agendamento" WHERE "tenantId" IN (${ids}))`)
    await client.query(`DELETE FROM "Parcela" WHERE "parcelamentoId" IN (SELECT id FROM "Parcelamento" WHERE "tenantId" IN (${ids}))`)
    await client.query(`DELETE FROM "Comissao" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "TransacaoFinanceira" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Parcelamento" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Agendamento" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "ReservaLocal" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Disponibilidade" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Bloqueio" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "DespesaProfissional" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Aluguel" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "CrmCampanha" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "CrmTemplate" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "TaxaImposto" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Servico" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "CategoriaFinanceira" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "ConfigClinica" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Profissional" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Paciente" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Local" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "User" WHERE "tenantId" IN (${ids})`)
    await client.query(`DELETE FROM "Tenant" WHERE id IN (${ids})`)

    console.log('[E2E] Dados residuais de runs anteriores removidos de public.')
  } finally {
    client.release()
    await pool.end()
  }
}

// ── Seed dos dois tenants de teste ─────────────────────────────────────────
async function seed(seedDb: PrismaClient) {
  const hashPwd = (pwd: string) => bcrypt.hash(pwd, 4)

  for (const t of ['clinic-a', 'clinic-b'] as const) {
    const label = t === 'clinic-a' ? 'A' : 'B'
    const isA   = t === 'clinic-a'

    const tenant = await seedDb.tenant.create({
      data: { slug: t, nome: `Clínica ${label}`, plano: 'ENTERPRISE', status: 'ATIVO' },
    })
    const tid = tenant.id

    await seedDb.user.create({
      data: {
        tenantId: tid, name: `Admin ${label}`,
        email: `admin-${t}@clinic-test.com`,
        passwordHash: await hashPwd('Senha@123'), role: 'ADMIN', active: true,
      },
    })

    // Email compartilhado — valida @@unique([email, tenantId])
    await seedDb.user.create({
      data: {
        tenantId: tid, name: `Shared ${label}`,
        email: 'shared@clinic-test.com',
        passwordHash: await hashPwd('Senha@123'), role: 'RECEPCAO', active: true,
      },
    })

    // Profissional 1 — slug "dr-test" igual nos dois tenants
    const profUser1 = await seedDb.user.create({
      data: {
        tenantId: tid, name: `Dr. Test ${label}`,
        email: `dr-test-${t}@clinic-test.com`,
        passwordHash: await hashPwd('Senha@123'), role: 'PROFISSIONAL', active: true,
      },
    })
    const prof1 = await seedDb.profissional.create({
      data: {
        tenantId: tid, userId: profUser1.id,
        especialidade: 'Psicologia', tipoVinculo: 'COMISSIONADO',
        comissaoPercentual: 30, slugAgendamento: 'dr-test', ativo: true,
      },
    })

    // Profissional 2 — slug exclusivo deste tenant
    const profUser2 = await seedDb.user.create({
      data: {
        tenantId: tid, name: `Dra. Unique ${label}`,
        email: `dr-unique-${t}@clinic-test.com`,
        passwordHash: await hashPwd('Senha@123'), role: 'PROFISSIONAL', active: true,
      },
    })
    await seedDb.profissional.create({
      data: {
        tenantId: tid, userId: profUser2.id,
        especialidade: 'Neuropsicologia', tipoVinculo: 'LOCATARIO',
        valorAluguelMensal: 1500,
        slugAgendamento: `dr-${label.toLowerCase()}-only`, // 'dr-a-only' ou 'dr-b-only'
        ativo: true,
      },
    })

    const sala = await seedDb.local.create({
      data: { tenantId: tid, nome: `Local ${label}1`, tipo: 'SALA', capacidade: 1, ativa: true },
    })

    // CPF compartilhado — valida @@unique([cpf, tenantId])
    const pac1 = await seedDb.paciente.create({
      data: { tenantId: tid, nome: `Paciente ${label}1`, cpf: '11111111111', ativo: true },
    })
    const pac2 = await seedDb.paciente.create({
      data: { tenantId: tid, nome: `Paciente ${label}2`, cpf: isA ? '22222222222' : '33333333333', ativo: true },
    })
    const pac3 = await seedDb.paciente.create({
      data: { tenantId: tid, nome: `Paciente ${label}3`, ativo: true },
    })

    const cat = await seedDb.categoriaFinanceira.create({
      data: { tenantId: tid, nome: `Serviços ${label}`, tipo: 'RECEITA', cor: '#4f46e5' },
    })

    const agends: { id: string }[] = []
    const base = new Date('2026-06-10T09:00:00')
    for (let i = 0; i < 5; i++) {
      const offset = i * 50 * 60_000 + (isA ? 0 : 86_400_000)
      const inicio = new Date(base.getTime() + offset)
      const ag = await seedDb.agendamento.create({
        data: {
          tenantId: tid, profissionalId: prof1.id,
          pacienteId: i < 3 ? pac1.id : i === 3 ? pac2.id : pac3.id,
          localId: sala.id, dataHoraInicio: inicio,
          dataHoraFim: new Date(inicio.getTime() + 50 * 60_000),
          status: i < 2 ? 'REALIZADO' : 'AGENDADO', valor: 200, origem: 'INTERNO',
        },
      })
      agends.push(ag)
    }

    await seedDb.transacaoFinanceira.create({
      data: {
        tenantId: tid, tipo: 'RECEITA', categoriaId: cat.id,
        descricao: `Consulta ${label}`, valor: 200,
        data: new Date('2026-06-01'), status: 'PAGO',
      },
    })

    const servico = await seedDb.servico.create({
      data: { tenantId: tid, nome: `Psicoterapia ${label}`, ativo: true },
    })
    await seedDb.agendamentoServico.create({
      data: { agendamentoId: agends[0].id, servicoId: servico.id },
    })

    const parc = await seedDb.parcelamento.create({
      data: {
        tenantId: tid, profissionalId: prof1.id, agendamentoId: agends[0].id,
        descricao: `Parcelamento ${label}`, valorTotal: 600,
        bandeira: 'VISA', tipoPagamento: 'CREDITO', taxaCartao: 2,
        totalParcelas: 3, valorLiquido: 588, status: 'ATIVO',
      },
    })
    for (let n = 1; n <= 3; n++) {
      await seedDb.parcela.create({
        data: {
          parcelamentoId: parc.id, numero: n,
          dataVencimento: new Date(`2026-0${5 + n}-10`), valor: 196, status: 'PENDENTE',
        },
      })
    }

    await seedDb.configClinica.create({
      data: { tenantId: tid, nome: `Clínica ${label}`, corPrimaria: '#4f46e5' },
    })
    await seedDb.comissao.create({
      data: {
        tenantId: tid, profissionalId: prof1.id, agendamentoId: agends[0].id,
        valorBruto: 200, percentual: 30, valorComissao: 60, valorClinica: 140, status: 'PENDENTE',
      },
    })

    console.log(`[E2E] ✓ Tenant ${label} semeado (id=${tid})`)
  }
}

// ── globalSetup ────────────────────────────────────────────────────────────
export default async function setup() {
  const { testUrl, schema } = assertSafe()
  await assertSchemaViaQuery(schema)

  // Limpar contaminação de runs anteriores com pool errado
  await cleanupPublicContamination()

  // Construir URL Prisma com credenciais válidas + schema de teste
  const prismaTestUrl = buildPrismaTestUrl(schema)

  // Override DATABASE_URL para workers usarem banco de testes
  process.env.DATABASE_URL = prismaTestUrl

  // Drop + recreate schema + deploy migrations (sem rodar prisma/seed.ts)
  console.log(`\n[E2E] Limpando e recriando schema="${schema}"...`)
  const resetPool   = makePool(schema)
  const resetClient = await resetPool.connect()
  await resetClient.query('SET search_path TO public')
  await resetClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await resetClient.query(`CREATE SCHEMA "${schema}"`)
  resetClient.release()
  await resetPool.end()

  console.log(`[E2E] Aplicando migrations em schema="${schema}"...`)
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: prismaTestUrl },
  })

  console.log('[E2E] Semeando TenantA e TenantB...')
  const pool   = makePool(schema)
  const seedDb = new PrismaClient({ adapter: new PrismaPg(pool) })

  await seed(seedDb)
  await seedDb.$disconnect()
  await pool.end()

  console.log('[E2E] Setup completo — suite pronta.\n')
}
