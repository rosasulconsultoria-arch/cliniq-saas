import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando seed...')

  const hash = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@clinica.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@clinica.com',
      passwordHash: hash,
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('Admin criado:', admin.email)

  await prisma.categoriaFinanceira.createMany({
    data: [
      { nome: 'Consultas', tipo: 'RECEITA', cor: '#22c55e' },
      { nome: 'Avaliações', tipo: 'RECEITA', cor: '#16a34a' },
      { nome: 'Outros Serviços', tipo: 'RECEITA', cor: '#15803d' },
      { nome: 'Aluguel de Sala', tipo: 'DESPESA', cor: '#ef4444' },
      { nome: 'Materiais', tipo: 'DESPESA', cor: '#dc2626' },
      { nome: 'Serviços Terceirizados', tipo: 'DESPESA', cor: '#b91c1c' },
      { nome: 'Equipamentos', tipo: 'INVESTIMENTO', cor: '#8b5cf6' },
      { nome: 'Capacitação Profissional', tipo: 'INVESTIMENTO', cor: '#7c3aed' },
      { nome: 'Tecnologia', tipo: 'INVESTIMENTO', cor: '#6d28d9' },
    ],
  })
  console.log('Categorias financeiras criadas: 9')

  for (const sala of [
    { nome: 'Sala 01', capacidade: 2, descricao: 'Sala de atendimento individual' },
    { nome: 'Sala 02', capacidade: 2, descricao: 'Sala de atendimento individual' },
    { nome: 'Sala 03', capacidade: 8, descricao: 'Sala para grupos e workshops' },
  ]) {
    await prisma.sala.upsert({
      where: { nome: sala.nome },
      update: {},
      create: sala,
    })
  }
  console.log('Salas criadas: 3')

  console.log('Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
