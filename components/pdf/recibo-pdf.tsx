import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: '36pt 44pt', fontSize: 10, fontFamily: 'Helvetica', color: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 16 },
  logo: { width: 90, height: 40, objectFit: 'contain' },
  clinicaName: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  headerRight: { alignItems: 'flex-end' },
  titulo: { fontSize: 15, fontFamily: 'Helvetica-Bold' },
  reciboNum: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  divider: { height: 2, marginBottom: 14 },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  row2: { flexDirection: 'row', gap: 24, marginBottom: 14 },
  fieldLabel: { fontSize: 8, color: '#9ca3af', marginBottom: 2, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  fieldValue: { fontSize: 10, fontFamily: 'Helvetica' },
  serviceBox: { borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid', borderRadius: 4, marginBottom: 10, overflow: 'hidden' },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '8pt 12pt' },
  serviceHeaderDesc: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#fff' },
  serviceHeaderVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff' },
  serviceBody: { flexDirection: 'row', flexWrap: 'wrap', padding: '8pt 12pt', gap: 12 },
  serviceItem: { width: '45%' },
  totalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '10pt 14pt', borderRadius: 4, marginTop: 4 },
  totalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#fff', opacity: 0.9 },
  totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#fff' },
  paymentRow: { flexDirection: 'row', gap: 20, marginTop: 6, fontSize: 9, color: '#374151' },
  sigArea: { flexDirection: 'row', gap: 40, marginTop: 28 },
  sigBlock: { flex: 1, alignItems: 'center' },
  sigLine: { borderTopWidth: 1, borderTopColor: '#9ca3af', borderTopStyle: 'solid', width: '80%', paddingTop: 6, fontSize: 9, color: '#6b7280', textAlign: 'center' },
  sigRole: { fontSize: 8, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af', borderTopWidth: 1, borderTopColor: '#e5e7eb', borderTopStyle: 'solid', paddingTop: 6 },
})

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value}</Text>
    </View>
  )
}

export interface ReciboData {
  reciboNum: string
  clinicaNome: string
  logoBase64: string | null
  cor: string
  clinicaCnpj: string | null
  clinicaEndereco: string | null
  clinicaTelefone: string | null
  clinicaEmail: string | null
  pacienteNome: string
  pacienteCpf: string
  pacienteTelefone: string | null
  pacienteEmail: string | null
  profissionalLabel: string
  dataServico: string
  horario: string
  salaNome: string
  servicoDesc: string
  valor: string
  formaPagamento: string
  parcelasInfo: string
  observacoes: string | null
  emitidoEm: string
}

export function ReceiboPDF({ d }: { d: ReciboData }) {
  const corRgb = hexToRgb(d.cor) ?? [79, 70, 229]

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {d.logoBase64 && (
              <Image src={d.logoBase64.startsWith('data:') ? d.logoBase64 : `data:image/png;base64,${d.logoBase64}`} style={s.logo} />
            )}
            <View>
              <Text style={[s.clinicaName, { color: d.cor }]}>{d.clinicaNome}</Text>
              {d.clinicaCnpj && <Text style={{ fontSize: 8, color: '#6b7280', marginTop: 2 }}>CNPJ: {d.clinicaCnpj}</Text>}
              {d.clinicaEndereco && <Text style={{ fontSize: 8, color: '#6b7280' }}>{d.clinicaEndereco}</Text>}
              {(d.clinicaTelefone || d.clinicaEmail) && (
                <Text style={{ fontSize: 8, color: '#6b7280' }}>
                  {[d.clinicaTelefone, d.clinicaEmail].filter(Boolean).join('  ·  ')}
                </Text>
              )}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.titulo}>RECIBO DE SERVIÇOS</Text>
            <Text style={s.reciboNum}>{d.reciboNum}</Text>
          </View>
        </View>
        <View style={[s.divider, { backgroundColor: d.cor }]} />

        {/* Paciente */}
        <Text style={s.sectionLabel}>Dados do Paciente</Text>
        <View style={s.row2}>
          <View style={{ flex: 1 }}><Field label="Nome" value={d.pacienteNome} /></View>
          <View style={{ flex: 1 }}><Field label="CPF" value={d.pacienteCpf} /></View>
          {d.pacienteTelefone && <View style={{ flex: 1 }}><Field label="Telefone" value={d.pacienteTelefone} /></View>}
        </View>

        {/* Serviço */}
        <Text style={s.sectionLabel}>Serviços Prestados</Text>
        <View style={s.serviceBox}>
          <View style={[s.serviceHeader, { backgroundColor: d.cor }]}>
            <Text style={s.serviceHeaderDesc}>{d.servicoDesc}</Text>
            <Text style={s.serviceHeaderVal}>{d.valor}</Text>
          </View>
          <View style={s.serviceBody}>
            <View style={s.serviceItem}><Field label="Profissional" value={d.profissionalLabel} /></View>
            <View style={s.serviceItem}><Field label="Data" value={d.dataServico} /></View>
            <View style={s.serviceItem}><Field label="Horário" value={d.horario} /></View>
            <View style={s.serviceItem}><Field label="Local" value={d.salaNome} /></View>
          </View>
          {d.observacoes && (
            <View style={{ padding: '0 12pt 8pt' }}>
              <Text style={[s.fieldLabel, { marginBottom: 2 }]}>Observações</Text>
              <Text style={{ fontSize: 9, color: '#374151' }}>{d.observacoes}</Text>
            </View>
          )}
        </View>

        {/* Total */}
        <View style={[s.totalBar, { backgroundColor: d.cor }]}>
          <Text style={s.totalLabel}>VALOR TOTAL RECEBIDO</Text>
          <Text style={s.totalValue}>{d.valor}</Text>
        </View>
        <View style={s.paymentRow}>
          <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Forma de pagamento: </Text>{d.formaPagamento}{d.parcelasInfo}</Text>
        </View>

        {/* Assinaturas */}
        <View style={s.sigArea}>
          <View style={s.sigBlock}>
            <View style={s.sigLine}><Text>{d.pacienteNome}</Text></View>
            <Text style={s.sigRole}>Assinatura do Paciente</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine}><Text>{d.profissionalLabel.split(' · ')[0]}</Text></View>
            <Text style={s.sigRole}>Assinatura do Profissional</Text>
          </View>
        </View>

        <View style={s.footer}>
          <Text>{d.clinicaNome}</Text>
          <Text>Emitido em {d.emitidoEm}</Text>
        </View>
      </Page>
    </Document>
  )
}

function hexToRgb(hex: string): [number, number, number] | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : null
}
