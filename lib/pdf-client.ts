// Client-side PDF generation using jsPDF — runs entirely in the browser

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [79, 70, 229]
}

function brl(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

// ── Receipt ──────────────────────────────────────────────────────────────────

export async function downloadReciboPDF(agendamentoId: string): Promise<void> {
  const res = await fetch(`/api/recibo/data?id=${agendamentoId}`)
  if (!res.ok) throw new Error('Erro ao buscar dados do recibo')
  const d = await res.json()

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ format: 'a4', unit: 'mm' })
  const W = doc.internal.pageSize.getWidth()
  const [cr, cg, cb] = hexToRgb(d.cor)

  let y = 0

  // ── Faixa de cabeçalho colorida
  doc.setFillColor(cr, cg, cb)
  doc.rect(0, 0, W, 24, 'F')

  // Logo
  let logoWidth = 0
  if (d.logoBase64) {
    try {
      const src = d.logoBase64.startsWith('data:') ? d.logoBase64 : `data:image/png;base64,${d.logoBase64}`
      doc.addImage(src, 'PNG', 10, 4, 20, 16)
      logoWidth = 26
    } catch { logoWidth = 0 }
  }

  // Nome da clínica
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(d.clinicaNome, 10 + logoWidth, 13)

  // Número do recibo (direita)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('RECIBO DE SERVIÇOS', W - 10, 10, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.text(d.reciboNum, W - 10, 16, { align: 'right' })

  y = 28

  // ── Sub-header: dados da clínica
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const subInfo = [
    d.cnpj ? `CNPJ: ${d.cnpj}` : null,
    d.endereco,
    [d.telefoneClinica, d.emailClinica].filter(Boolean).join('  ·  ') || null,
  ].filter(Boolean)
  if (subInfo.length) {
    subInfo.forEach(line => { doc.text(line!, 10, y); y += 4 })
    y += 2
  }

  // Linha divisória
  doc.setDrawColor(cr, cg, cb)
  doc.setLineWidth(0.5)
  doc.line(10, y, W - 10, y)
  y += 6

  // ── Seção: Paciente
  doc.setTextColor(cr, cg, cb)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DO PACIENTE', 10, y)
  y += 5

  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const pacInfoLeft = [`Nome: ${d.pacienteNome}`, `CPF: ${d.pacienteCpf}`]
  const pacInfoRight = [d.pacienteTelefone ? `Telefone: ${d.pacienteTelefone}` : '', d.pacienteEmail ? `E-mail: ${d.pacienteEmail}` : ''].filter(Boolean)
  pacInfoLeft.forEach(t => { doc.text(t, 10, y); y += 5 })
  if (pacInfoRight.length) {
    const startY = y - pacInfoLeft.length * 5
    pacInfoRight.forEach((t, i) => doc.text(t, W / 2, startY + i * 5))
  }
  y += 2

  // Linha divisória
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(10, y, W - 10, y)
  y += 6

  // ── Seção: Serviços
  doc.setTextColor(cr, cg, cb)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('SERVIÇOS PRESTADOS', 10, y)
  y += 5

  // Box de serviço
  const boxH = 34
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(10, y, W - 20, 10, 1, 1, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(d.servicoDesc, 14, y + 7)
  doc.text(brl(d.valor), W - 14, y + 7, { align: 'right' })

  y += 12
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(10, y, W - 20, boxH - 12, 1, 1, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(10, y, W - 20, boxH - 12, 1, 1, 'S')

  y += 5
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const profLabel = [d.profissionalNome, d.profissionalEsp, d.profissionalCrp ? `CRP ${d.profissionalCrp}` : ''].filter(Boolean).join(' · ')

  const leftCols = [`Profissional: ${profLabel}`, `Horário: ${d.horario}`]
  const rightCols = [`Data: ${d.dataServico}`, `Sala: ${d.salaNome}`]
  leftCols.forEach(t => { doc.text(t, 14, y); y += 5 })
  const colStartY = y - leftCols.length * 5
  rightCols.forEach((t, i) => doc.text(t, W / 2, colStartY + i * 5))

  if (d.observacoes) { y += 2; doc.setFontSize(8); doc.text(`Obs: ${d.observacoes}`, 14, y); y += 4 }

  y += 6

  // ── Total
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(10, y, W - 20, 10, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('VALOR TOTAL RECEBIDO', 14, y + 7)
  doc.setFontSize(13)
  doc.text(brl(d.valor), W - 14, y + 7, { align: 'right' })
  y += 14

  doc.setTextColor(80, 80, 80)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Forma de pagamento: ${d.formaPagamento}${d.parcelas}`, 10, y)
  y += 10

  // Linha divisória
  doc.setDrawColor(cr, cg, cb)
  doc.setLineWidth(0.3)
  doc.line(10, y, W - 10, y)
  y += 14

  // ── Assinaturas (duas colunas simétricas dentro das margens)
  const margin = 10
  const sigW = 70
  const col1Center = margin + sigW / 2          // ~45mm
  const col2Center = W - margin - sigW / 2      // ~165mm

  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(0.3)
  doc.line(margin, y, margin + sigW, y)
  doc.line(W - margin - sigW, y, W - margin, y)

  y += 4
  doc.setTextColor(100, 100, 100)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(d.pacienteNome, col1Center, y, { align: 'center' })
  doc.text(d.profissionalNome, col2Center, y, { align: 'center' })
  y += 4
  doc.setFontSize(7)
  doc.text('Assinatura do Paciente', col1Center, y, { align: 'center' })
  doc.text('Assinatura do Profissional', col2Center, y, { align: 'center' })

  // ── Rodapé
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(10, pageH - 12, W - 10, pageH - 12)
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7)
  doc.text(d.clinicaNome, 10, pageH - 7)
  doc.text(`Emitido em ${d.emitidoEm}`, W - 10, pageH - 7, { align: 'right' })

  doc.save(`recibo-${d.reciboNum}.pdf`)
}

// ── Report table ──────────────────────────────────────────────────────────────

export async function downloadRelatorioPDF(
  csvHref: string,
  filename: string,
  clinicaNome = 'Clínica de Psicologia'
): Promise<void> {
  const res = await fetch(csvHref)
  if (!res.ok) throw new Error('Erro ao buscar dados')
  const text = await res.text()

  const lines = text.replace(/^﻿/, '').split('\n').filter(l => l && !l.startsWith('sep='))
  const rows = lines.map(l => l.split(';').map(c => c.replace(/^"|"$/g, '').trim()))
  if (rows.length < 2) throw new Error('Sem dados')

  const [headers, ...data] = rows

  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' })
  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const LABELS: Record<string, string> = {
    faturamento: 'Faturamento por Período', 'por-profissional': 'Faturamento por Profissional',
    'por-sala': 'Faturamento por Sala', 'despesas-categoria': 'Despesas por Categoria',
    dre: 'DRE — Demonstrativo de Resultado', comissoes: 'Comissões por Profissional',
    ocupacao: 'Ocupação por Sala', pacientes: 'Relatório de Pacientes',
  }
  const title = LABELS[filename] ?? filename.replace(/-/g, ' ').toUpperCase()

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`${clinicaNome}  ·  Gerado em ${now}`, 14, 24)

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 30,
    theme: 'striped',
    headStyles: { fillColor: [30, 27, 75], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  })

  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFontSize(7)
  doc.setTextColor(180, 180, 180)
  doc.text(`${title}  ·  ${now}`, W / 2, H - 8, { align: 'center' })

  doc.save(`${filename}.pdf`)
}
