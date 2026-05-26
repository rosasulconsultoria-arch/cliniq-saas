import { config } from 'dotenv'
import path from 'path'

// Carrega .env.local para testes E2E que chamam APIs externas (Asaas Sandbox)
// O globalSetup carrega o banco, mas não propaga vars do .env.local para o contexto dos testes
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
