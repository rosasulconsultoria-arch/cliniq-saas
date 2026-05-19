import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page: { padding: '32pt 40pt', fontSize: 9, fontFamily: 'Helvetica', color: '#111' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  subtitle: { fontSize: 8, color: '#6b7280', marginBottom: 16 },
  table: { width: '100%', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'solid' },
  headerRow: { flexDirection: 'row', backgroundColor: '#1e1b4b' },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e5e7eb', borderTopStyle: 'solid' },
  evenRow: { backgroundColor: '#f9fafb' },
  cell: { flex: 1, padding: '5pt 6pt' },
  headerCell: { flex: 1, padding: '5pt 6pt', color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 8 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af', borderTopWidth: 1, borderTopColor: '#e5e7eb', borderTopStyle: 'solid', paddingTop: 6 },
})

interface Props {
  title: string
  headers: string[]
  rows: string[][]
  generatedAt: string
  clinicaNome: string
}

export function RelatorioPDF({ title, headers, rows, generatedAt, clinicaNome }: Props) {
  const colWidth = `${(100 / headers.length).toFixed(1)}%`

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>Gerado em {generatedAt}</Text>

        <View style={s.table}>
          <View style={s.headerRow}>
            {headers.map((h, i) => (
              <View key={i} style={[s.headerCell, { width: colWidth }]}>
                <Text>{h}</Text>
              </View>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={[s.row, ri % 2 !== 0 ? s.evenRow : {}]}>
              {row.map((cell, ci) => (
                <View key={ci} style={[s.cell, { width: colWidth }]}>
                  <Text>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text>{clinicaNome}</Text>
          <Text>{generatedAt}</Text>
        </View>
      </Page>
    </Document>
  )
}
