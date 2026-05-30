/**
 * seed-dev-admin.ts — Cria admin de desenvolvimento para o tenant neuroconexao.
 *
 * USO:
 *   npx tsx prisma/seed-dev-admin.ts
 *
 * Idempotente: se o admin já existe, atualiza a senha.
 * Guard: recusa execução em NODE_ENV=production.
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ── Guard de produção ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌  RECUSADO: seed-dev-admin.ts não pode rodar em NODE_ENV=production.')
  console.error('   Este script é exclusivo para desenvolvimento local.')
  process.exit(1)
}

const TENANT_SLUG   = 'neuroconexao'
const ADMIN_EMAIL   = 'admin@cliniq.dev'
const ADMIN_SENHA   = 'AdminCliniq2026!'
const ADMIN_NOME    = 'Admin Dev'

const pool    = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma  = new PrismaClient({ adapter })

async function main() {
  console.log(`\n🌱  seed-dev-admin — tenant "${TENANT_SLUG}"`)

  // 1. Confirmar tenant existe
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) {
    console.error(`❌  Tenant slug="${TENANT_SLUG}" não encontrado no banco.`)
    console.error('   Execute prisma/manual/001a_seed_dev_tenant.sql primeiro.')
    process.exit(1)
  }
  console.log(`✓  Tenant encontrado: id=${tenant.id} nome="${tenant.nome}"`)

  // 2. Hash da senha
  const passwordHash = await bcrypt.hash(ADMIN_SENHA, 12)

  // 3. Upsert admin (@@unique([email, tenantId]))
  const admin = await prisma.user.upsert({
    where: {
      email_tenantId: { email: ADMIN_EMAIL, tenantId: tenant.id },
    },
    update: {
      passwordHash,
      name: ADMIN_NOME,
      role: 'ADMIN',
      active: true,
      mustChangePassword: false,
    },
    create: {
      tenantId:         tenant.id,
      email:            ADMIN_EMAIL,
      name:             ADMIN_NOME,
      passwordHash,
      role:             'ADMIN',
      active:           true,
      mustChangePassword: false,
    },
    select: { id: true, email: true, name: true, role: true, tenantId: true },
  })

  console.log(`✓  Admin upsertado com sucesso:`)
  console.log(`   id       = ${admin.id}`)
  console.log(`   email    = ${admin.email}`)
  console.log(`   nome     = ${admin.name}`)
  console.log(`   role     = ${admin.role}`)
  console.log(`   tenantId = ${admin.tenantId}`)
  console.log(`\n🔑  Credenciais de acesso:`)
  console.log(`   URL      = http://localhost:3000/login  (com DEV_TENANT_SLUG=neuroconexao)`)
  console.log(`   Email    = ${ADMIN_EMAIL}`)
  console.log(`   Senha    = ${ADMIN_SENHA}`)
  console.log()
}

main()
  .catch((e) => { console.error('Erro:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
