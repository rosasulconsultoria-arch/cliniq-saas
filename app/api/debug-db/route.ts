import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.DATABASE_URL ?? 'NÃO DEFINIDA'
  const urlSafe = url.replace(/:([^@]+)@/, ':***@')

  try {
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })

    const { rows } = await pool.query(
      'SELECT email, role, active FROM "User" WHERE email = $1',
      ['admin@clinica.com']
    )
    await pool.end()

    return NextResponse.json({
      ok: true,
      url: urlSafe,
      usuario: rows[0] ?? null,
    })
  } catch (e: unknown) {
    return NextResponse.json({
      ok: false,
      url: urlSafe,
      erro: e instanceof Error ? e.message : String(e),
    })
  }
}
