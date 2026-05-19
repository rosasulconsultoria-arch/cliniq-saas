import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ReceiboPDF, type ReciboData } from '@/components/pdf/recibo-pdf'

export const dynamic = 'force-dynamic'

const FORMA: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  TRANSFERENCIA: 'Transferência Bancária',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cpfMask(cpf: string | null) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return new Response('ID obrigatório', { status: 400 })

  const [ag, cfg] = await Promise.all([
    db.agendamento.findUnique({
      where: { id },
      include: {
        profissional: { include: { user: { select: { name: true } } } },
        paciente: { select: { nome: true, cpf: true, telefone: true, email: true } },
        sala: { select: { nome: true } },
      },
    }),
    db.configClinica.findUnique({ where: { id: 'default' } }),
  ])

  if (!ag) return new Response('Agendamento não encontrado', { status: 404 })

  const isPdf = new URL(req.url).searchParams.get('pdf') === '1'

  // ── Shared data ─────────────────────────────────────────────
  const inicio = new Date(ag.dataHoraInicio)
  const fim = new Date(ag.dataHoraFim)
  const duracao = Math.round((fim.getTime() - inicio.getTime()) / 60_000)
  const cor = cfg?.corPrimaria ?? '#4f46e5'
  const clinicaNome = cfg?.nome ?? 'Clínica de Psicologia'
  const logoTag = cfg?.logoBase64
    ? `<img src="${cfg.logoBase64}" alt="Logo" style="height:64px;max-width:200px;object-fit:contain;"/>`
    : `<div style="font-size:28px;font-weight:800;color:${cor};">${clinicaNome}</div>`

  const reciboNum = `REC-${format(inicio, 'yyyy')}-${id.slice(-8).toUpperCase()}`
  const emitidoEm = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  const dataServico = format(inicio, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const horario = `${format(inicio, 'HH:mm')} – ${format(fim, 'HH:mm')} (${duracao} min)`
  const profNome = ag.profissional.user.name
  const profEsp = (ag.profissional as any).especialidade ?? ''
  const profCrp = (ag.profissional as any).crp ?? ''
  const profLabel = [profNome, profEsp, profCrp ? `CRP ${profCrp}` : ''].filter(Boolean).join(' · ')

  const servicoDesc = ag.tipoCobranca === 'PACOTE' && ag.totalSessoes
    ? `Pacote de ${ag.totalSessoes} sessões de Psicologia`
    : 'Consulta de Psicologia'

  const formaPag = ag.formaPagamento ? FORMA[ag.formaPagamento] ?? ag.formaPagamento : '—'
  const parcelasInfo = (ag as any).numeroParcelas > 1 ? ` (${(ag as any).numeroParcelas}×)` : ''

  // ── PDF download ────────────────────────────────────────────
  if (isPdf) {
    const enderecoCompleto = [
      cfg?.endereco, cfg?.numero, cfg?.complemento, cfg?.bairro, cfg?.cidade && cfg?.estado ? `${cfg.cidade}/${cfg.estado}` : (cfg?.cidade ?? cfg?.estado), cfg?.cep,
    ].filter(Boolean).join(', ')

    const data: ReciboData = {
      reciboNum,
      clinicaNome,
      logoBase64: cfg?.logoBase64 ?? null,
      cor,
      clinicaCnpj: cfg?.cnpj ?? null,
      clinicaEndereco: enderecoCompleto || null,
      clinicaTelefone: cfg?.telefone ?? null,
      clinicaEmail: cfg?.email ?? null,
      pacienteNome: ag.paciente.nome,
      pacienteCpf: cpfMask(ag.paciente.cpf),
      pacienteTelefone: ag.paciente.telefone ?? null,
      pacienteEmail: ag.paciente.email ?? null,
      profissionalLabel,
      dataServico,
      horario,
      salaNome: ag.sala.nome,
      servicoDesc,
      valor: brl(Number(ag.valor)),
      formaPagamento: formaPag,
      parcelasInfo,
      observacoes: ag.observacoes ?? null,
      emitidoEm,
    }
    const buffer = await renderToBuffer(createElement(ReceiboPDF, { d: data }))
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recibo-${reciboNum}.pdf"`,
      },
    })
  }

  // ── HTML preview ────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Recibo ${reciboNum}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111;background:#fff;padding:0}
    .page{max-width:700px;margin:0 auto;padding:40px 48px;min-height:100vh}
    /* Header */
    .header{display:flex;align-items:center;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid ${cor}}
    .header-right{text-align:right}
    .header-right h2{font-size:22px;font-weight:800;color:${cor};letter-spacing:-.5px}
    .header-right .recibo-num{font-size:12px;color:#6b7280;margin-top:2px}
    /* Section */
    .section{margin-top:24px}
    .section-title{font-size:10px;font-weight:700;color:${cor};letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
    .info-item label{font-size:10px;color:#9ca3af;display:block;margin-bottom:2px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
    .info-item span{font-size:13px;font-weight:500}
    /* Service box */
    .service-box{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-top:8px}
    .service-header{background:${cor};color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center}
    .service-header .desc{font-size:13px;font-weight:700}
    .service-header .val{font-size:16px;font-weight:800}
    .service-body{padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .service-body .item label{font-size:10px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:2px}
    .service-body .item span{font-size:12px}
    .obs-box{margin-top:8px;padding:10px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;color:#374151}
    /* Total */
    .total-bar{margin-top:20px;background:${cor};color:#fff;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center}
    .total-bar .label{font-size:12px;font-weight:600;opacity:.85}
    .total-bar .amount{font-size:22px;font-weight:800}
    .payment-row{margin-top:10px;display:flex;gap:24px;font-size:12px;color:#374151;padding:0 4px}
    .payment-row strong{font-weight:600}
    /* Divider */
    .divider{border:none;border-top:1px dashed #d1d5db;margin:24px 0}
    /* Signature */
    .signature-area{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px}
    .sig-block{text-align:center}
    .sig-line{border-top:1px solid #9ca3af;padding-top:8px;font-size:11px;color:#6b7280}
    /* Footer */
    .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af}
    @media print{
      body{padding:0}
      .page{padding:24px 32px;max-width:100%}
      .header{border-bottom-color:${cor};-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .service-header,.total-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      ${logoTag}
      <div style="font-size:11px;color:#6b7280;line-height:1.5">
        ${cfg?.cnpj ? `<div>CNPJ: ${cfg.cnpj}</div>` : ''}
        ${enderecoCompleto ? `<div>${enderecoCompleto}</div>` : ''}
        ${cfg?.telefone || cfg?.email ? `<div>${[cfg?.telefone, cfg?.email].filter(Boolean).join(' · ')}</div>` : ''}
      </div>
    </div>
    <div class="header-right">
      <h2>RECIBO DE SERVIÇOS</h2>
      <div class="recibo-num">${reciboNum}</div>
    </div>
  </div>

  <!-- Paciente -->
  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <div class="info-grid">
      <div class="info-item"><label>Nome</label><span>${ag.paciente.nome}</span></div>
      <div class="info-item"><label>CPF</label><span>${cpfMask(ag.paciente.cpf)}</span></div>
      ${ag.paciente.telefone ? `<div class="info-item"><label>Telefone</label><span>${ag.paciente.telefone}</span></div>` : ''}
      ${ag.paciente.email ? `<div class="info-item"><label>E-mail</label><span>${ag.paciente.email}</span></div>` : ''}
    </div>
  </div>

  <hr class="divider"/>

  <!-- Serviço -->
  <div class="section">
    <div class="section-title">Serviços Prestados</div>
    <div class="service-box">
      <div class="service-header">
        <span class="desc">${servicoDesc}</span>
        <span class="val">${brl(Number(ag.valor))}</span>
      </div>
      <div class="service-body">
        <div class="item"><label>Profissional</label><span>${profLabel}</span></div>
        <div class="item"><label>Data</label><span>${dataServico}</span></div>
        <div class="item"><label>Horário</label><span>${horario}</span></div>
        <div class="item"><label>Local</label><span>${ag.sala.nome}</span></div>
        ${(ag as any).tipoCobranca === 'PACOTE' && (ag as any).totalSessoes ? `<div class="item"><label>Pacote</label><span>${(ag as any).totalSessoes} sessões</span></div>` : ''}
      </div>
    </div>
    ${ag.observacoes ? `<div class="obs-box"><strong>Obs:</strong> ${ag.observacoes}</div>` : ''}
  </div>

  <!-- Total -->
  <div class="total-bar">
    <span class="label">VALOR TOTAL RECEBIDO</span>
    <span class="amount">${brl(Number(ag.valor))}</span>
  </div>
  <div class="payment-row">
    <span><strong>Forma de pagamento:</strong> ${formaPag}${parcelasInfo}</span>
  </div>

  <hr class="divider"/>

  <!-- Assinaturas -->
  <div class="signature-area">
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">${ag.paciente.nome}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:2px">Assinatura do Paciente</div>
    </div>
    <div class="sig-block">
      <div style="height:40px"></div>
      <div class="sig-line">${profNome}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:2px">Assinatura do Profissional</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${clinicaNome}</span>
    <span>Emitido em ${emitidoEm}</span>
  </div>

</div>
<script>window.onload = () => setTimeout(() => window.print(), 400)</script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
