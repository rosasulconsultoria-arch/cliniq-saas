import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('\n=== SANITY CHECK — Multi-tenancy ===\n')

  // 1. Contagem de tenants
  const tenantCount = await db.tenant.count()
  console.log(`[1] Tenants no banco: ${tenantCount} (esperado: 1)`, tenantCount === 1 ? '✓' : '✗ FALHOU')

  // 2. Dados do tenant Neuroconexão
  const tenant = await db.tenant.findFirst({ where: { slug: 'neuroconexao' } })
  console.log(`\n[2] Tenant Neuroconexão:`)
  console.log(`    slug:   ${tenant?.slug}   ${tenant?.slug === 'neuroconexao' ? '✓' : '✗'}`)
  console.log(`    nome:   ${tenant?.nome}`)
  console.log(`    plano:  ${tenant?.plano}  ${tenant?.plano === 'ENTERPRISE' ? '✓' : '✗'}`)
  console.log(`    status: ${tenant?.status} ${tenant?.status === 'ATIVO' ? '✓' : '✗'}`)

  // 3. Verificar tabelas com coluna tenantId via information_schema
  const result = await db.$queryRaw<{ table_name: string; has_tenant: boolean }[]>`
    SELECT
      c.table_name,
      TRUE as has_tenant
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenantId'
    ORDER BY c.table_name
  `

  console.log(`\n[3] Tabelas com coluna tenantId (esperado: 18):`)
  result.forEach(r => console.log(`    ✓ ${r.table_name}`))
  console.log(`    Total: ${result.length} ${result.length === 18 ? '✓' : '✗ DIVERGÊNCIA — esperado 18'}`)

  // 4. Tabelas sem tenantId (Parcela, AgendamentoServico, Tenant = correto)
  const semTenant = await db.$queryRaw<{ table_name: string }[]>`
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('_prisma_migrations')
      AND t.table_name NOT IN (
        SELECT c.table_name FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.column_name = 'tenantId'
      )
    ORDER BY t.table_name
  `
  console.log(`\n[4] Tabelas SEM tenantId (esperado: Tenant, Parcela, AgendamentoServico):`)
  semTenant.forEach(r => console.log(`    - ${r.table_name}`))

  const esperadas = ['AgendamentoServico', 'Parcela', 'Tenant']
  const recebidas = semTenant.map(r => r.table_name).sort()
  const ok = JSON.stringify(esperadas) === JSON.stringify(recebidas)
  console.log(`    ${ok ? '✓ Correto' : '✗ DIVERGÊNCIA'}`)

  console.log('\n=== FIM DO SANITY CHECK ===\n')
}

main()
  .catch(e => { console.error('ERRO:', e); process.exit(1) })
  .finally(() => db.$disconnect())
