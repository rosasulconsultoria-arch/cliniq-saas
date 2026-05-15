export interface AgendamentoDisplay {
  id: string
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valor: number
  observacoes: string | null
  origem?: string
  profissional: { id: string; nome: string }
  paciente: { id: string; nome: string }
  sala: { id: string; nome: string }
}
