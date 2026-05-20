const BASE_URL = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3'

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'access_token': apiKey,
  }
}

export interface AsaasCliente {
  id: string
  name: string
  cpfCnpj?: string
}

export interface AsaasCobranca {
  id: string
  status: string
  invoiceUrl: string
  value: number
  dueDate: string
}

export async function criarOuBuscarCliente(
  apiKey: string,
  dados: { nome: string; cpf?: string | null; email?: string | null; telefone?: string | null }
): Promise<AsaasCliente> {
  // Busca por CPF se disponível
  if (dados.cpf) {
    const cpfLimpo = dados.cpf.replace(/\D/g, '')
    const res = await fetch(`${BASE_URL}/customers?cpfCnpj=${cpfLimpo}`, {
      headers: headers(apiKey),
    })
    const json = await res.json()
    if (json.data?.length > 0) return json.data[0] as AsaasCliente
  }

  // Cria novo cliente
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      name: dados.nome,
      cpfCnpj: dados.cpf?.replace(/\D/g, '') || undefined,
      email: dados.email || undefined,
      phone: dados.telefone?.replace(/\D/g, '') || undefined,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas')
  }

  return res.json() as Promise<AsaasCliente>
}

export async function criarCobranca(
  apiKey: string,
  dados: { customerId: string; valor: number; descricao: string }
): Promise<AsaasCobranca> {
  const vencimento = new Date()
  vencimento.setDate(vencimento.getDate() + 3)
  const dueDate = vencimento.toISOString().split('T')[0]

  const res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      customer: dados.customerId,
      billingType: 'UNDEFINED',
      value: dados.valor,
      dueDate,
      description: dados.descricao,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.errors?.[0]?.description ?? 'Erro ao criar cobrança no Asaas')
  }

  return res.json() as Promise<AsaasCobranca>
}

export async function buscarStatusCobranca(
  apiKey: string,
  paymentId: string
): Promise<{ status: string; invoiceUrl: string } | null> {
  const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
    headers: headers(apiKey),
  })

  if (!res.ok) return null

  const json = await res.json()
  return { status: json.status, invoiceUrl: json.invoiceUrl }
}

export const ASAAS_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Aguardando pagamento', color: 'text-amber-600' },
  RECEIVED: { label: 'Pago', color: 'text-emerald-600' },
  CONFIRMED: { label: 'Confirmado', color: 'text-emerald-600' },
  OVERDUE: { label: 'Vencido', color: 'text-red-600' },
  REFUNDED: { label: 'Estornado', color: 'text-slate-500' },
  CANCELED: { label: 'Cancelado', color: 'text-slate-500' },
}
