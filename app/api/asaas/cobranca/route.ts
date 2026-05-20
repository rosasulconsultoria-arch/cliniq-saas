import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { criarOuBuscarCliente, criarCobranca, buscarStatusCobranca } from '@/lib/asaas'

export const dynamic = 'force-dynamic'

// GET — atualiza status de uma cobrança existente
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const { searchParams } = new URL(req.url)
  const agendamentoId = searchParams.get('id')
  if (!agendamentoId) return new Response('ID obrigatório', { status: 400 })

  const ag = await db.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { profissional: { select: { asaasApiKey: true } } },
  })

  if (!ag?.asaasPaymentId || !ag.profissional.asaasApiKey) {
    return Response.json({ error: 'Cobrança não encontrada' }, { status: 404 })
  }

  const status = await buscarStatusCobranca(ag.profissional.asaasApiKey, ag.asaasPaymentId)
  if (!status) return Response.json({ error: 'Erro ao buscar status' }, { status: 500 })

  await db.agendamento.update({
    where: { id: agendamentoId },
    data: { asaasPaymentStatus: status.status },
  })

  return Response.json({ status: status.status, invoiceUrl: status.invoiceUrl })
}

// POST — cria cobrança no Asaas para um agendamento
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const { agendamentoId } = await req.json()
  if (!agendamentoId) return Response.json({ error: 'ID obrigatório' }, { status: 400 })

  const ag = await db.agendamento.findUnique({
    where: { id: agendamentoId },
    include: {
      paciente: { select: { nome: true, cpf: true, email: true, telefone: true } },
      profissional: { select: { asaasApiKey: true, user: { select: { name: true } } } },
    },
  })

  if (!ag) return Response.json({ error: 'Agendamento não encontrado' }, { status: 404 })
  if (!ag.profissional.asaasApiKey) {
    return Response.json({ error: 'Profissional não tem Asaas configurado' }, { status: 400 })
  }
  if (ag.asaasPaymentId) {
    return Response.json({ error: 'Cobrança já existe', invoiceUrl: ag.asaasInvoiceUrl }, { status: 409 })
  }

  const apiKey = ag.profissional.asaasApiKey

  const cliente = await criarOuBuscarCliente(apiKey, {
    nome: ag.paciente.nome,
    cpf: ag.paciente.cpf,
    email: ag.paciente.email,
    telefone: ag.paciente.telefone,
  })

  const descricao = `Consulta — ${ag.profissional.user.name}`
  const cobranca = await criarCobranca(apiKey, {
    customerId: cliente.id,
    valor: Number(ag.valor),
    descricao,
  })

  await db.agendamento.update({
    where: { id: agendamentoId },
    data: {
      asaasPaymentId: cobranca.id,
      asaasInvoiceUrl: cobranca.invoiceUrl,
      asaasPaymentStatus: cobranca.status,
    },
  })

  return Response.json({ invoiceUrl: cobranca.invoiceUrl, status: cobranca.status })
}
