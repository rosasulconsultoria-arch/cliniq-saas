export interface AgendamentoDisplay {
  id: string
  dataHoraInicio: string
  dataHoraFim: string
  status: string
  valor: number
  observacoes: string | null
  origem?: string
  tipoCobranca?: string
  totalSessoes?: number | null
  formaPagamento?: string | null
  bandeiraCartao?: string | null
  numeroParcelas?: number | null
  confirmacaoEnviada?: boolean
  profissional: { id: string; nome: string; foto?: string | null }
  paciente: { id: string; nome: string; email?: string | null; telefone?: string | null }
  sala: { id: string; nome: string }
}
