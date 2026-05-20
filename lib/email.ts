import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface EmailConfirmacao {
  email: string
  nomePaciente: string
  nomeProfissional: string
  dataHoraInicio: string
  dataHoraFim: string
  tokenCancelamento: string
}

export async function enviarEmailConfirmacao(data: EmailConfirmacao): Promise<void> {
  if (!resend || !data.email) return

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const linkCancelamento = `${baseUrl}/cancelar/${data.tokenCancelamento}`

  const inicio = parseISO(data.dataHoraInicio)
  const fim = parseISO(data.dataHoraFim)
  const dataFormatada = format(inicio, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const horario = `${format(inicio, 'HH:mm')} – ${format(fim, 'HH:mm')}`

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#4f46e5;padding:32px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:8px;padding:8px 16px;color:#fff;font-weight:700;font-size:18px;letter-spacing:.05em">CP</div>
  </div>
  <div style="padding:32px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">✅ Agendamento Confirmado</h1>
    <p style="color:#64748b;margin:0 0 24px">Olá, <strong>${data.nomePaciente}</strong>! Seu agendamento foi confirmado.</p>
    <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="color:#64748b;font-size:13px;padding:6px 0">Profissional</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:right">${data.nomeProfissional}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;padding:6px 0;text-transform:capitalize">${dataFormatada}</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:right">${horario}</td></tr>
      </table>
    </div>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px">Precisa cancelar? <a href="${linkCancelamento}" style="color:#4f46e5;font-weight:600">Clique aqui</a> para cancelar seu agendamento. O link é válido por 7 dias.</p>
    <p style="color:#94a3b8;font-size:12px;margin:0">Clínica de Psicologia — resposta automática, não responda este e-mail.</p>
  </div>
</div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@clinica.com',
      to: data.email,
      subject: '✅ Agendamento confirmado',
      html,
    })
  } catch (e) {
    console.error('[email] Falha ao enviar:', e)
  }
}

interface EmailRecuperacao {
  email: string
  nome: string
  token: string
}

export async function enviarEmailRecuperacaoSenha(data: EmailRecuperacao): Promise<void> {
  if (!resend) return

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const link = `${baseUrl}/redefinir-senha/${data.token}`

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="background:#4f46e5;padding:32px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:8px;padding:8px 16px;color:#fff;font-weight:700;font-size:18px;letter-spacing:.05em">CP</div>
  </div>
  <div style="padding:32px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#0f172a">Recuperação de senha</h1>
    <p style="color:#64748b;margin:0 0 24px">Olá, <strong>${data.nome}</strong>! Recebemos uma solicitação para redefinir sua senha.</p>
    <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;margin-bottom:24px">
      Redefinir minha senha
    </a>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 8px">O link é válido por <strong>1 hora</strong>. Se você não solicitou isso, ignore este e-mail.</p>
    <p style="color:#94a3b8;font-size:12px;margin:0;word-break:break-all">Ou copie: ${link}</p>
  </div>
</div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@clinica.com',
      to: data.email,
      subject: '🔑 Redefinição de senha',
      html,
    })
  } catch (e) {
    console.error('[email] Falha ao enviar recuperação:', e)
  }
}
