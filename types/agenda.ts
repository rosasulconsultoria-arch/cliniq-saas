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
  asaasPaymentId?: string | null
  asaasInvoiceUrl?: string | null
  asaasPaymentStatus?: string | null
  profissional: { id: string; nome: string; foto?: string | null; temAsaas?: boolean }
  paciente: { id: string; nome: string; email?: string | null; telefone?: string | null }
  sala: { id: string; nome: string }
}
