import { defineConfig } from 'prisma/config'
import dotenv from 'dotenv'
import path from 'path'

// Prisma CLI lê .env por padrão; aqui carregamos .env.local (padrão do Next.js)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
