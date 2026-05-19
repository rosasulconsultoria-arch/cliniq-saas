import { Badge } from '@/components/ui/badge'
import { AjudaAccordion } from './ajuda-accordion'

const SECOES = [
  {
    id: 'primeiro-acesso',
    titulo: 'Primeiro Acesso',
    badge: 'Início',
    itens: [
      {
        pergunta: 'Por que sou redirecionado para trocar a senha?',
        resposta: 'Por segurança, todo profissional cadastrado pelo administrador é obrigado a definir uma senha pessoal no primeiro login. A tela de troca de senha aparece antes de qualquer outra página. Após definir a nova senha, você é desconectado automaticamente e pode fazer login com as novas credenciais.',
      },
      {
        pergunta: 'Esqueci minha senha. Como recuperar?',
        resposta: 'Entre em contato com o administrador da clínica para que ele redefina sua senha temporária. Ao fazer login com ela, o sistema solicitará automaticamente que você crie uma nova senha pessoal.',
      },
    ],
  },
  {
    id: 'dashboard',
    titulo: 'Meu Dashboard',
    badge: 'Visão Pessoal',
    itens: [
      {
        pergunta: 'O que aparece no meu dashboard?',
        resposta: 'Seu dashboard pessoal exibe: faturamento do mês (suas consultas realizadas), valor de comissão ou aluguel a pagar à clínica, pacientes ativos e inativos, no-shows do mês, agendamentos futuros e suas despesas pessoais pendentes. Também mostra as consultas do dia. Passe o mouse sobre ℹ️ em qualquer card para ver a explicação do dado.',
      },
      {
        pergunta: 'O que significa "Comissão / Aluguel a Pagar"?',
        resposta: 'É o valor que você deve repassar à clínica. Se você é COMISSIONADO: soma das comissões calculadas sobre suas consultas realizadas ainda não quitadas. Se é LOCATÁRIO: soma dos aluguéis mensais em aberto. Esses valores são gerados automaticamente pelo sistema ao marcar consultas como realizadas.',
      },
    ],
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    badge: 'Agendamentos',
    itens: [
      {
        pergunta: 'Posso ver a agenda dos outros profissionais?',
        resposta: 'Sim. A agenda exibe todos os agendamentos de todos os profissionais da clínica, o que permite visualizar a ocupação das salas e evitar conflitos. No entanto, você só pode alterar o status (Realizado, Confirmado, Cancelar, etc.) dos seus próprios agendamentos.',
      },
      {
        pergunta: 'Como usar a visão de salas (portas coloridas)?',
        resposta: 'A visão padrão é a grade por salas. Cada coluna representa uma sala e cada linha um slot de 30 minutos. PORTA VERDE = disponível (clique para agendar nesse horário e sala), PORTA VERMELHA = ocupada com agendamento, PORTA AMARELA = atendimento acontecendo agora. Use os ícones no toolbar para alternar para visão semanal ou mensal.',
      },
      {
        pergunta: 'Como criar um novo agendamento?',
        resposta: 'Clique no botão "Novo Agendamento" ou numa porta verde na grade de salas. O formulário pede: (1) Paciente (busca por nome; se não encontrar, cadastre rapidamente inline). (2) Data, horário e duração. (3) Sala (pré-selecionada ao clicar na porta). (4) Serviços prestados. (5) Valor e forma de pagamento.',
      },
      {
        pergunta: 'Como criar agendamentos recorrentes (paciente fixo)?',
        resposta: 'No formulário de agendamento, ative "Agendamento recorrente" e defina quantas sessões (2 a 52). O sistema cria todos os agendamentos nas semanas seguintes, mesmo dia e horário. Se houver conflito em alguma semana, nenhum é criado e a data do conflito é informada.',
      },
      {
        pergunta: 'Como atualizar o status de uma consulta?',
        resposta: 'Clique na consulta na agenda. No dialog de detalhes, use os botões: Confirmar (paciente confirmou presença), Realizado (consulta ocorreu — gera comissão automaticamente), Faltou (no-show) ou Cancelar (requer senha). Apenas seus próprios agendamentos têm esses botões disponíveis.',
      },
      {
        pergunta: 'Como emitir o recibo de um atendimento?',
        resposta: 'Clique no agendamento e, no dialog de detalhes, clique em "Baixar Recibo PDF". O PDF é gerado e baixado automaticamente no navegador, com logo e dados da clínica, informações do paciente, serviço prestado, valor e linhas de assinatura.',
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
        resposta: 'Acesse Pacientes > Novo Paciente. Nome e Telefone são obrigatórios. O CPF é opcional. Adicione e-mail para ativar confirmações automáticas por e-mail. Você também pode cadastrar o paciente diretamente durante a criação de um agendamento, sem sair da tela.',
      },
      {
        pergunta: 'Posso ver os pacientes de outros profissionais?',
        resposta: 'O cadastro de pacientes é compartilhado entre todos os profissionais da clínica. Você pode buscar e visualizar qualquer paciente cadastrado, mas na agenda você vê apenas seus próprios agendamentos.',
      },
    ],
  },
  {
    id: 'servicos',
    titulo: 'Serviços',
    badge: 'Catálogo',
    itens: [
      {
        pergunta: 'O que são os serviços?',
        resposta: 'São os tipos de atendimento cadastrados pela clínica (ex: Avaliação Neuropsicológica, THS, Arteterapia). Ao criar um agendamento, você seleciona quais serviços serão prestados. Esses dados alimentam o relatório de Top Serviços no dashboard.',
      },
      {
        pergunta: 'Como visualizar os serviços disponíveis?',
        resposta: 'Acesse o menu "Serviços" na barra lateral. A listagem mostra todos os serviços cadastrados pela clínica com o número de agendamentos vinculados a cada um.',
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
        resposta: 'Área exclusiva para registrar suas despesas pessoais de trabalho: materiais, equipamentos, cursos, software, etc. Não se misturam com as finanças da clínica e não são visíveis para a administração.',
      },
      {
        pergunta: 'Como a comissão ou aluguel aparecem aqui?',
        resposta: 'Automaticamente. Se você é COMISSIONADO, cada consulta realizada gera uma comissão pendente que você deve repassar à clínica. Se é LOCATÁRIO, os aluguéis mensais aparecem automaticamente. Esses valores são gerados pelo sistema — não precisam ser cadastrados manualmente.',
      },
      {
        pergunta: 'Como registrar o pagamento de uma despesa?',
        resposta: 'Clique em "Quitar" ao lado do item pendente. Selecione a forma de pagamento e confirme. O status muda para Pago com a data registrada.',
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
        resposta: 'Previsão de recebimentos de pacientes que pagaram em cartão de crédito parcelado. Ao criar um parcelamento no seu cadastro (aba Parcelamentos), o sistema gera um cronograma de vencimentos com os valores após dedução da taxa da operadora.',
      },
      {
        pergunta: 'Como criar um parcelamento?',
        resposta: 'No seu cadastro de profissional, aba "Parcelamentos" > "Novo Parcelamento". Informe: descrição, valor total, bandeira do cartão, taxa da operadora (%) e número de parcelas. O sistema calcula o valor líquido e o cronograma automaticamente.',
      },
    ],
  },
]

export function AjudaProfissional() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Guia de uso do sistema para profissionais.
      </p>
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
