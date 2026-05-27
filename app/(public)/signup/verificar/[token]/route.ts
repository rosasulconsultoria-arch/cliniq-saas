import { NextRequest, NextResponse } from 'next/server'
import { verificarEmailToken } from '../../actions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const result = await verificarEmailToken(token)
  const base = request.nextUrl.origin

  if (result.success || result.error === 'used') {
    return NextResponse.redirect(`${base}/signup/sucesso-temporario`)
  }
  if (result.error === 'expired') {
    return NextResponse.redirect(`${base}/signup/verificar?erro=expirado`)
  }
  return NextResponse.redirect(`${base}/signup/verificar?erro=invalido`)
}
