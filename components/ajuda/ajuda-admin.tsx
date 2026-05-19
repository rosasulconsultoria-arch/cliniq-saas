import { Badge } from '@/components/ui/badge'
import { AjudaAccordion } from './ajuda-accordion'

const SECOES = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    badge: 'Visão Geral',
    itens: [
      {
        pergunta: 'O que o dashboard mostra?',
        resposta: 'O dashboard exibe os principais indicadores da clínica: faturamento, despesas, lucro líquido, consultas, taxa de ocupação, ticket médio e taxa de no-show. Há gráficos de evolução mensal, consultas do dia, top profissionais, top serviços mais realizados e últimas transações financeiras. Passe o mouse sobre o ícone ℹ️ em qualquer card para entender de onde vem aquele dado.',
      },
      {
        pergunta: 'Como alterar o período analisado?',
        resposta: 'Use o filtro de período no canto superior direito do dashboard. Opções: mês atual, mês anterior, últimos 3 meses, ano completo ou período personalizado. Os KPIs e gráficos são atualizados automaticamente.',
      },
      {
        pergunta: 'O que é o card "Top Serviços"?',
        resposta: 'Exibe os 5 serviços mais realizados no período selecionado, com contagem de atendimentos. Os serviços são vinculados no momento do agendamento. Para cadastrar novos serviços, acesse o menu Serviços na barra lateral.',
      },
    ],
  },
  {
    id: 'agenda',
    titulo: 'Agenda',
    badge: 'Agendamentos',
    itens: [
      {
        pergunta: 'Como criar um novo agendamento?',
        resposta: 'Clique no botão "Novo Agendamento" no topo da agenda. O formulário segue este fluxo: (1) Busque o paciente pelo nome. Se não encontrar, clique em "Cadastrar como paciente" para criar o cadastro rapidamente sem sair da tela. (2) Selecione profissional, data, horário (dropdown de 08:00 a 19:30) e duração. (3) Escolha a sala. (4) Selecione os serviços prestados. (5) Informe valor, tipo de cobrança e forma de pagamento.',
      },
      {
        pergunta: 'Como funciona a visão de salas (portas coloridas)?',
        resposta: 'A visão padrão da agenda é a grade por salas. Cada coluna representa uma sala e cada linha um horário de 30 minutos. As portas têm cores: VERDE = livre (clique para agendar naquele slot, sala já pré-selecionada), VERMELHA = agendado, AMARELA = atendimento em andamento agora. Use os botões de alternância no toolbar para mudar para visão semanal ou mensal.',
      },
      {
        pergunta: 'Como criar agendamentos recorrentes?',
        resposta: 'No formulário de agendamento, ative o toggle "Agendamento recorrente". Defina o número de sessões (2 a 52). O sistema criará automaticamente todos os agendamentos nas semanas seguintes, mesmo dia e horário. Um preview mostra as datas de início e fim da série. Se houver conflito em qualquer semana, nenhum agendamento é criado e o sistema informa a data do conflito.',
      },
      {
        pergunta: 'Todos os profissionais veem todos os agendamentos?',
        resposta: 'Sim. A agenda exibe todos os agendamentos de todos os profissionais. Entretanto, um profissional só pode alterar o status dos seus próprios agendamentos — ao clicar num agendamento de outro profissional, os botões de ação (Confirmar, Realizado, Cancelar) ficam ocultos.',
      },
      {
        pergunta: 'Como emitir o recibo de um atendimento?',
        resposta: 'Clique no agendamento na agenda e, no dialog de detalhes, clique em "Baixar Recibo PDF". O PDF é gerado diretamente no navegador e baixado automaticamente, sem diálogo de impressão. O recibo inclui os dados da clínica (logo, CNPJ, endereço) quando preenchidos em Configurações.',
      },
      {
        pergunta: 'O que acontece ao marcar como "Realizado"?',
        resposta: 'Para profissionais COMISSIONADOS: uma comissão é gerada automaticamente (valor da consulta × percentual definido no cadastro). Essa comissão aparece em Financeiro > Comissões como "a receber". Para LOCATÁRIOS: uma transação de receita é lançada diretamente. Em ambos os casos, os dados entram nos relatórios e no dashboard.',
      },
      {
        pergunta: 'Como cancelar um agendamento?',
        resposta: 'Clique no agendamento e depois em "Cancelar". Por segurança, o sistema solicitará sua senha antes de confirmar.',
      },
    ],
  },
  {
    id: 'pacientes',
    titulo: 'Pacientes',
    badge: 'Cadastros',
    itens: [
      {
        pergunta: 'Quais campos são obrigatórios no cadastro?',
        resposta: 'Apenas Nome e Telefone são obrigatórios. O CPF é opcional — útil para identificação, mas não bloqueia o cadastro caso o paciente não queira informar. E-mail, data de nascimento, gênero e observações são todos opcionais.',
      },
      {
        pergunta: 'Como cadastrar um paciente rapidamente durante o agendamento?',
        resposta: 'No formulário de agendamento, busque pelo nome do paciente. Se não encontrar, clique em "Cadastrar [nome] como paciente" — um mini formulário aparece inline pedindo nome e telefone. Ao confirmar, o paciente é criado e automaticamente selecionado no agendamento.',
      },
      {
        pergunta: 'Pacientes podem se autocadastrar?',
        resposta: 'Sim. Pela página pública de agendamento (/agendar/[slug] do profissional), o paciente informa nome, CPF e dados de contato. Se o CPF já existir, o sistema reconhece o cadastro; caso contrário, cria automaticamente.',
      },
    ],
  },
  {
    id: 'servicos',
    titulo: 'Serviços',
    badge: 'Catálogo',
    itens: [
      {
        pergunta: 'O que são serviços e para que servem?',
        resposta: 'Serviços são os tipos de atendimento prestados pela clínica (ex: Avaliação Neuropsicológica, THS, Arteterapia). Eles são selecionados no momento do agendamento e aparecem no dashboard como "Top Serviços", permitindo análise de quais atendimentos são mais realizados no período.',
      },
      {
        pergunta: 'Como cadastrar ou editar serviços?',
        resposta: 'Acesse o menu "Serviços" na barra lateral. Clique em "Novo Serviço" para adicionar. Você pode informar nome, descrição e ativar/desativar. Os 5 serviços padrão (Avaliação Neuropsicológica, Intervenção, THS, Arteterapia e Tutoria em Matemática) são criados automaticamente na primeira visita à página.',
      },
      {
        pergunta: 'Um agendamento pode ter múltiplos serviços?',
        resposta: 'Sim. No formulário de agendamento há um multi-seletor de serviços. Selecione quantos quiser — todos ficam vinculados ao agendamento e contabilizados no relatório de Top Serviços.',
      },
    ],
  },
  {
    id: 'profissionais',
    titulo: 'Profissionais',
    badge: 'Gestão',
    itens: [
      {
        pergunta: 'Qual a diferença entre Comissionado e Locatário?',
        resposta: 'COMISSIONADO: o profissional repassa um percentual de cada consulta à clínica. Ao marcar a consulta como realizada, o sistema calcula automaticamente o valor a receber. LOCATÁRIO: o profissional paga um aluguel fixo mensal pela sala. Ao cadastrar com duração de contrato, os meses são gerados antecipadamente.',
      },
      {
        pergunta: 'Quem paga a comissão — a clínica ou o profissional?',
        resposta: 'O PROFISSIONAL repassa a comissão à CLÍNICA. Ao marcar uma consulta como realizada, o sistema calcula o valor que o profissional deve à clínica (percentual × valor da consulta). Esse valor aparece em Financeiro > Comissões como "a receber" e no dashboard do profissional como "a pagar".',
      },
      {
        pergunta: 'O profissional precisa trocar a senha no primeiro acesso?',
        resposta: 'Sim. Ao criar o cadastro de um profissional, o sistema define a flag de troca obrigatória. No primeiro login, o profissional é redirecionado para a tela de definição de senha pessoal antes de acessar o sistema. Isso garante que cada profissional tenha uma senha própria.',
      },
      {
        pergunta: 'Como registrar o recebimento de comissão ou aluguel?',
        resposta: 'Em Financeiro > Comissões ou Aluguéis, clique em "Receber" na linha pendente. Informe a forma de recebimento e confirme. O valor entra automaticamente no faturamento.',
      },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    badge: 'Gestão Financeira',
    itens: [
      {
        pergunta: 'Como funciona o filtro de período no financeiro?',
        resposta: 'O painel financeiro tem um seletor no topo direito com 4 opções: Mês atual, 3 meses, 6 meses e 12 meses. Todos os cards (receita, despesas, lucro, comissões a receber, aluguéis pendentes), os gráficos e a seção de receitas por origem refletem o período escolhido.',
      },
      {
        pergunta: 'O que é o DRE no menu financeiro?',
        resposta: 'O DRE (Demonstrativo de Resultado do Exercício) está disponível em Financeiro > DRE. Mostra: (+) Receitas Operacionais + (+) Comissões Recebidas + (+) Receita de Aluguéis − (−) Despesas − (−) Investimentos = Lucro Líquido. Tem seletor de período e exportação CSV e PDF.',
      },
      {
        pergunta: 'O que são Taxas e Impostos?',
        resposta: 'Em Financeiro > Taxas e Impostos você cadastra as alíquotas aplicáveis à clínica: municipais (ISS), estaduais (ICMS) ou federais (IRPF, IRPJ, CSLL, PIS, COFINS, INSS). Informe nome, âmbito, alíquota percentual ou valor fixo. Essas informações servem como referência para conciliação fiscal.',
      },
      {
        pergunta: 'Como exportar relatórios em PDF?',
        resposta: 'Em qualquer relatório, clique em "Exportar PDF". O arquivo é gerado diretamente no navegador e baixado automaticamente (sem diálogo de impressão), com tabela formatada, cabeçalho colorido e nome da clínica. O "Exportar CSV" gera arquivo com separador ponto-e-vírgula compatível com Excel brasileiro.',
      },
      {
        pergunta: 'O que são Contas a Receber?',
        resposta: 'Centraliza todos os valores pendentes: consultas agendadas (futuras), comissões que os profissionais devem repassar, aluguéis não recebidos, parcelas de cartão a vencer e outras receitas pendentes. Todos os valores são filtrados pelo período selecionado.',
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    badge: 'Personalização',
    itens: [
      {
        pergunta: 'Como personalizar nome, logo e cor?',
        resposta: 'Em Configurações > Personalização da Clínica: altere o nome (aparece na sidebar e página pública), faça upload do logotipo (JPEG/PNG até 200KB após compressão) e escolha a cor principal entre 8 opções predefinidas ou uma cor personalizada com seletor de cores. Um preview mostra o resultado em tempo real antes de salvar.',
      },
      {
        pergunta: 'Como preencher os dados para o recibo?',
        resposta: 'Em Configurações > Dados da Clínica, preencha: CNPJ (com máscara automática), telefone, e-mail, endereço completo (logradouro, número, complemento, bairro, CEP, cidade, estado). Essas informações aparecem automaticamente no cabeçalho de todos os recibos emitidos.',
      },
    ],
  },
]

export function AjudaAdmin() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Guia completo de uso do sistema para administradores.
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
