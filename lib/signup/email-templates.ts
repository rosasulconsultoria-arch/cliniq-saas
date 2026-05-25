import { Resend } from 'resend'

export async function sendVerificationEmail(
  email: string,
  token: string,
  nomeClinica: string
): Promise<{ emailEnviado: boolean }> {
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

  if (!resend) {
    return { emailEnviado: false }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/signup/verificar/${token}`

  const html = `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333;">
    <h2>Bem-vindo ao [CLINIQ]!</h2>
    <p>Olá! Você está quase lá. Para concluir o cadastro de <strong>${nomeClinica}</strong>, confirme seu endereço de email clicando no botão abaixo:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="background: #6366f1; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Verificar email
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      Este link expira em <strong>24 horas</strong>. Se você não solicitou este cadastro, ignore este email.
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
    <p style="color: #999; font-size: 12px; text-align: center;">[CLINIQ] — Sistema de Gestão para Clínicas</p>
  </body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@cliniq.com.br',
      to: email,
      subject: 'Verifique seu email para concluir o cadastro',
      html,
    })

    return { emailEnviado: true }
  } catch (err) {
    console.error('Erro ao enviar email de verificação:', err)
    return { emailEnviado: false }
  }
}
