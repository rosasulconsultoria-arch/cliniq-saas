import { Badge } from '@/components/ui/badge'
import { AjudaAccordion } from './ajuda-accordion'

const SECOES = [
  {
    id: 'dashboard',
    titulo: 'Meu Dashboard',
    badge: 'Visão Pessoal',
    itens: [
      {
        pergunta: 'O que aparece no meu dashboard?',
        resposta: 'Seu dashboard pessoal exibe: faturamento do mês (suas consultas realizadas), valor a pagar à clínica (comissão ou aluguel pendente), número de pacientes ativos e inativos, no-shows do mês, agendamentos futuros e suas despesas pessoais pendentes. Também mostra as consultas programadas para o dia.',
      },
      {
        pergunta: 'O que é "A pagar (comissão/aluguel)"?',
        resposta: 'Se você é COMISSIONADO: soma das comissões geradas por consultas realizadas ainda não quitadas com a clínica. Se você é LOCATÁRIO: soma dos aluguéis mensais ainda não pagos. Esses valores são gerados automaticamente pelo sistema.',
      },
      {
        pergunta: 'O que é "Minhas despesas pendentes"?',
        resposta: 'Total de despesas pessoais que você registrou em "Minhas Despesas" com status pendente. Não inclui comissões ou aluguel da clínica — esses são exibidos separadamente.',
      },
    ],
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    badge: 'Meus Agendamentos',
    itens: [
      {
        pergunta: 'Posso ver apenas minha agenda?',
        resposta: 'Sim. A agenda exibe somente seus próprios agendamentos. Você não tem acesso à agenda de outros profissionais.',
      },
      {
        pergunta: 'Como criar um novo agendamento?',
        resposta: 'Clique em qualquer horário disponível na grade semanal. Selecione o paciente, sala, data e hora, tipo de cobrança (consulta ou pacote), valor e forma de pagamento acordada com o paciente. Se for cartão de crédito parcelado, informe a bandeira, taxa e número de parcelas.',
      },
      {
        pergunta: 'Como informar a forma de pagamento?',
        resposta: 'No formulário de criação do agendamento, há um campo "Forma de Pagamento" com as opções: Dinheiro, Pix, Transferência, Cartão de Crédito e Cartão de Débito. Se escolher cartão, aparecerão campos para bandeira, taxa e parcelas (apenas crédito).',
      },
      {
        pergunta: 'O paciente recebe confirmação automática?',
        resposta: 'Se o paciente tiver e-mail cadastrado, uma confirmação é enviada automaticamente ao criar o agendamento. Se tiver telefone, aparece um botão para enviar via WhatsApp. É possível reenviar a confirmação a qualquer momento pelo dialog de detalhes do agendamento.',
      },
      {
        pergunta: 'Como atualizar o status de uma consulta?',
        resposta: 'Clique na consulta na agenda. No dialog de detalhes, use os botões: Confirmar (agendamento confirmado pelo paciente), Realizado (consulta ocorreu — gera comissão automaticamente se você for comissionado), Faltou (no-show do paciente) ou Cancelar (requer senha de confirmação).',
      },
    ],
  },
  {
    id: 'pacientes',
    titulo: 'Pacientes',
    badge: 'Cadastros',
    itens: [
      {
        pergunta: 'Como cadastrar um novo paciente?',
        resposta: 'Acesse Pacientes > Novo Paciente. Preencha nome e CPF (obrigatórios). Adicione telefone e e-mail para ativar o envio de confirmações e lembretes automáticos. O CPF garante que não haja cadastros duplicados.',
      },
      {
        pergunta: 'Posso ver os pacientes de outros profissionais?',
        resposta: 'Você tem acesso a todos os pacientes cadastrados na clínica, podendo buscar e visualizar. O cadastro de pacientes é compartilhado, mas sua agenda mostra apenas seus próprios agendamentos.',
      },
    ],
  },
  {
    id: 'despesas',
    titulo: 'Minhas Despesas',
    badge: 'Financeiro Pessoal',
    itens: [
      {
        pergunta: 'O que são "Minhas Despesas"?',
        resposta: 'Área exclusiva para você registrar suas despesas pessoais relacionadas ao trabalho: materiais, equipamentos, cursos, software, etc. Essas despesas não se misturam com as finanças da clínica e não são visíveis para a administração.',
      },
      {
        pergunta: 'Como a comissão ou aluguel aparecem aqui?',
        resposta: 'Automaticamente. Se você é COMISSIONADO, cada consulta realizada gera uma comissão pendente que aparece na seção "Comissões da Clínica". Se é LOCATÁRIO, os aluguéis mensais aparecem na seção "Aluguel da Clínica". Ambos são gerados pelo sistema sem precisar de cadastro manual.',
      },
      {
        pergunta: 'Como registrar o pagamento de uma despesa?',
        resposta: 'Clique no botão "Quitar" ao lado de qualquer item com status Pendente. Selecione a forma de pagamento (Pix, Cartão de Crédito, Cartão de Débito, Dinheiro ou Depósito Bancário) e confirme. O status muda para Pago e a data fica registrada.',
      },
      {
        pergunta: 'Como adicionar uma despesa pessoal?',
        resposta: 'Clique em "Nova Despesa" no canto superior direito. Preencha: descrição, valor, data, categoria (Materiais, Equipamentos, Capacitação, Software, Marketing ou Outros) e status (Pendente ou Pago). Você pode excluir despesas pessoais, mas não as comissões/aluguéis gerados pelo sistema.',
      },
    ],
  },
  {
    id: 'parcelamentos',
    titulo: 'Parcelamentos',
    badge: 'Recebimentos',
    itens: [
      {
        pergunta: 'O que são parcelamentos?',
        resposta: 'Previsão de recebimentos quando um paciente paga em cartão de crédito parcelado. Ao criar um parcelamento no cadastro do profissional (aba Parcelamentos), o sistema gera um cronograma com todas as datas de vencimento e valores de cada parcela após descontar a taxa da operadora.',
      },
      {
        pergunta: 'Como criar um parcelamento?',
        resposta: 'No seu cadastro de profissional (acessado pelo admin ou pela área administrativa), aba "Parcelamentos" > "Novo Parcelamento". Informe: descrição, valor total, bandeira do cartão, tipo (crédito), taxa da operadora (%), número de parcelas e data da primeira parcela. O sistema calcula automaticamente o valor líquido e o cronograma.',
      },
      {
        pergunta: 'Como cancelar um parcelamento?',
        resposta: 'Clique no ícone de cancelamento (X) no parcelamento. O sistema pedirá sua senha para confirmar. Parcelas pendentes deixam de ser cobradas. Esta ação não pode ser desfeita.',
      },
    ],
  },
]

export function AjudaProfissional() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Guia de uso do sistema para profissionais.
        </p>
      </div>

      {SECOES.map((secao) => (
        <div key={secao.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{secao.titulo}</h2>
            <Badge variant="outline" className="text-xs">{secao.badge}</Badge>
          </div>
          <AjudaAccordion items={secao.itens} prefix={secao.id} />
        </div>
      ))}
    </div>
  )
}
