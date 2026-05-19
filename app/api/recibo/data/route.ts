import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const FORMA: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'Pix', TRANSFERENCIA: 'Transferência Bancária',
  CARTAO_CREDITO: 'Cartão de Crédito', CARTAO_DEBITO: 'Cartão de Débito',
}

function cpfMask(cpf: string | null) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : cpf
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'ID obrigatório' }, { status: 400 })

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

  if (!ag) return Response.json({ error: 'Não encontrado' }, { status: 404 })

  const inicio = new Date(ag.dataHoraInicio)
  const fim = new Date(ag.dataHoraFim)
  const duracao = Math.round((fim.getTime() - inicio.getTime()) / 60_000)
  const prof = ag.profissional as any

  const endParts = [cfg?.endereco, cfg?.numero, cfg?.complemento, cfg?.bairro,
    cfg?.cidade && cfg?.estado ? `${cfg.cidade}/${cfg.estado}` : (cfg?.cidade ?? cfg?.estado), cfg?.cep]
    .filter(Boolean)

  return Response.json({
    reciboNum: `REC-${format(inicio, 'yyyy')}-${id.slice(-8).toUpperCase()}`,
    clinicaNome: cfg?.nome ?? 'Clínica de Psicologia',
    logoBase64: cfg?.logoBase64 ?? null,
    cor: cfg?.corPrimaria ?? '#4f46e5',
    cnpj: cfg?.cnpj ?? null,
    endereco: endParts.join(', ') || null,
    telefoneClinica: cfg?.telefone ?? null,
    emailClinica: cfg?.email ?? null,
    pacienteNome: ag.paciente.nome,
    pacienteCpf: cpfMask(ag.paciente.cpf),
    pacienteTelefone: ag.paciente.telefone ?? null,
    pacienteEmail: ag.paciente.email ?? null,
    profissionalNome: ag.profissional.user.name,
    profissionalEsp: prof.especialidade ?? null,
    profissionalCrp: prof.crp ?? null,
    dataServico: format(inicio, "dd/MM/yyyy", { locale: ptBR }),
    horario: `${format(inicio, 'HH:mm')} – ${format(fim, 'HH:mm')} (${duracao} min)`,
    salaNome: ag.sala.nome,
    servicoDesc: ag.tipoCobranca === 'PACOTE' && ag.totalSessoes
      ? `Pacote de ${ag.totalSessoes} sessões de Psicologia`
      : 'Consulta de Psicologia',
    valor: Number(ag.valor),
    formaPagamento: ag.formaPagamento ? (FORMA[ag.formaPagamento] ?? ag.formaPagamento) : '—',
    parcelas: (ag as any).numeroParcelas > 1 ? ` (${(ag as any).numeroParcelas}×)` : '',
    observacoes: ag.observacoes ?? null,
    emitidoEm: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
  })
}
