import { Resend } from 'resend'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export interface DadosAgendamento {
  id: string
  dataHoraInicio: Date
  dataHoraFim: Date
  valor: number
  pacienteNome: string
  pacienteEmail?: string | null
  pacienteTelefone?: string | null
  profissionalNome: string
  salaNome: string
  tipoCobranca?: string
  totalSessoes?: number | null
  formaPagamento?: string | null
  numeroParcelas?: number | null
}

function formatarDataHora(dt: Date) {
  return format(dt, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}

function formatarValor(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function gerarCorpoEmail(tipo: 'confirmacao' | 'lembrete', dados: DadosAgendamento): string {
  const titulo = tipo === 'confirmacao'
    ? 'Consulta confirmada!'
    : 'Lembrete: sua consulta é amanhã'

  const detalheCobranca = dados.tipoCobranca === 'PACOTE' && dados.totalSessoes
    ? `Pacote de ${dados.totalSessoes} sessões`
    : 'Consulta avulsa'

  const detalhePagamento = dados.formaPagamento
    ? `${dados.formaPagamento}${dados.numeroParcelas && dados.numeroParcelas > 1 ? ` em ${dados.numeroParcelas}x` : ''}`
    : '—'

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-block; background: #4f46e5; color: white; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">
        ${tipo === 'confirmacao' ? '✓ Confirmação' : '🔔 Lembrete'}
      </div>
      <h1 style="margin: 16px 0 0; font-size: 22px; color: #1e293b;">${titulo}</h1>
    </div>

    <p style="color: #475569; margin: 0 0 24px;">Olá, <strong>${dados.pacienteNome}</strong>!</p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">📅 Data e hora</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">${formatarDataHora(dados.dataHoraInicio)}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">👨‍⚕️ Profissional</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">${dados.profissionalNome}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">🏠 Local</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">${dados.salaNome}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">📋 Tipo</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">${detalheCobranca}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">💳 Pagamento</td><td style="padding: 6px 0; font-weight: 600; color: #1e293b; font-size: 13px; text-align: right;">${detalhePagamento}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b; font-size: 13px;">💰 Valor</td><td style="padding: 6px 0; font-weight: 700; color: #059669; font-size: 14px; text-align: right;">${formatarValor(dados.valor)}</td></tr>
      </table>
    </div>

    ${tipo === 'lembrete' ? `
    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0; color: #92400e; font-size: 13px;">⚠️ Lembre-se de confirmar sua presença. Em caso de cancelamento, entre em contato com antecedência.</p>
    </div>` : ''}

    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
      Este é um e-mail automático. Por favor, não responda.
    </p>
  </div>
</body>
</html>`
}

export async function enviarConfirmacaoEmail(dados: DadosAgendamento): Promise<boolean> {
  if (!dados.pacienteEmail) return false
  try {
    await resend.emails.send({
      from: FROM,
      to: dados.pacienteEmail,
      subject: `✓ Consulta confirmada — ${format(dados.dataHoraInicio, 'dd/MM/yyyy HH:mm')}`,
      html: gerarCorpoEmail('confirmacao', dados),
    })
    return true
  } catch (e) {
    console.error('[email:confirmacao]', e)
    return false
  }
}

export async function enviarLembreteEmail(dados: DadosAgendamento): Promise<boolean> {
  if (!dados.pacienteEmail) return false
  try {
    await resend.emails.send({
      from: FROM,
      to: dados.pacienteEmail,
      subject: `🔔 Lembrete: consulta amanhã às ${format(dados.dataHoraInicio, 'HH:mm')}`,
      html: gerarCorpoEmail('lembrete', dados),
    })
    return true
  } catch (e) {
    console.error('[email:lembrete]', e)
    return false
  }
}

export function gerarLinkWhatsApp(dados: DadosAgendamento, tipo: 'confirmacao' | 'lembrete'): string {
  if (!dados.pacienteTelefone) return ''
  const tel = dados.pacienteTelefone.replace(/\D/g, '')
  const telBR = tel.startsWith('55') ? tel : `55${tel}`

  const detalheCobranca = dados.tipoCobranca === 'PACOTE' && dados.totalSessoes
    ? `Pacote de ${dados.totalSessoes} sessões`
    : 'Consulta avulsa'

  const pagamento = dados.formaPagamento
    ? `${dados.formaPagamento}${dados.numeroParcelas && dados.numeroParcelas > 1 ? ` em ${dados.numeroParcelas}x` : ''}`
    : ''

  const msg = tipo === 'confirmacao'
    ? `Olá, ${dados.pacienteNome}! ✅ Sua consulta foi confirmada.\n\n📅 *${formatarDataHora(dados.dataHoraInicio)}*\n👨‍⚕️ ${dados.profissionalNome}\n🏠 ${dados.salaNome}\n📋 ${detalheCobranca}${pagamento ? `\n💳 ${pagamento}` : ''}\n💰 ${formatarValor(dados.valor)}\n\nAté lá! 😊`
    : `Olá, ${dados.pacienteNome}! 🔔 Lembrete: sua consulta é *amanhã* às ${format(dados.dataHoraInicio, 'HH:mm')}.\n\n👨‍⚕️ ${dados.profissionalNome} — ${dados.salaNome}\n\nAté amanhã! 😊`

  return `https://wa.me/${telBR}?text=${encodeURIComponent(msg)}`
}
