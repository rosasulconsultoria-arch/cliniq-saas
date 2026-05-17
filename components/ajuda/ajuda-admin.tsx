import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'

const SECOES = [
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    badge: 'Visão Geral',
    itens: [
      {
        pergunta: 'O que o dashboard mostra?',
        resposta: 'O dashboard exibe os principais indicadores da clínica: faturamento do período, despesas, lucro líquido, número de consultas, taxa de ocupação das salas e ticket médio. Há também gráficos de evolução mensal e listas de consultas do dia, top profissionais e últimas transações.',
      },
      {
        pergunta: 'Como alterar o período analisado?',
        resposta: 'Use o filtro de período no canto superior direito. Opções disponíveis: mês atual, mês anterior, últimos 3 meses, ano completo ou período personalizado. Os KPIs e gráficos são atualizados automaticamente.',
      },
      {
        pergunta: 'O faturamento inclui todos os recebimentos?',
        resposta: 'Sim. O faturamento contabiliza receitas de consultas, aluguel de salas (ao marcar como recebido) e comissões da clínica (parte retida ao pagar comissão ao profissional). Todos os lançamentos marcados como "Pago" entram no cálculo.',
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
        resposta: 'Clique em qualquer slot horário na agenda semanal ou no botão "+". Preencha: profissional, paciente, sala, data/hora, duração, tipo de cobrança (consulta avulsa ou pacote de sessões) e forma de pagamento. Se o paciente pagar em cartão de crédito, informe a bandeira, taxa e número de parcelas — o parcelamento é criado automaticamente.',
      },
      {
        pergunta: 'O que acontece ao marcar como "Realizado"?',
        resposta: 'Para profissionais COMISSIONADOS: uma comissão é gerada automaticamente (valor da consulta × percentual) e aparece em Financeiro > Comissões como pendente. Para LOCATÁRIOS: uma transação de receita é lançada diretamente. A comissão precisa ser quitada separadamente em Financeiro > Comissões.',
      },
      {
        pergunta: 'Como cancelar um agendamento?',
        resposta: 'Clique no agendamento na agenda e depois em "Cancelar". Por segurança, o sistema solicitará sua senha antes de confirmar o cancelamento.',
      },
      {
        pergunta: 'Como enviar confirmação ao paciente?',
        resposta: 'Ao criar o agendamento, se o paciente tiver e-mail cadastrado, uma confirmação é enviada automaticamente. Se o paciente tiver telefone, um botão para envio via WhatsApp aparece após a criação. No dialog de detalhes do agendamento também há botões para reenviar e-mail e abrir WhatsApp.',
      },
      {
        pergunta: 'O sistema envia lembretes automáticos?',
        resposta: 'Sim. Um lembrete é enviado por e-mail 24 horas antes do horário marcado, caso o agendamento tenha sido criado com mais de 24h de antecedência. O sistema verifica automaticamente a cada hora.',
      },
      {
        pergunta: 'O que é o tipo "Pacote de sessões"?',
        resposta: 'Permite registrar um contrato de múltiplas sessões com valor único. Ex: 10 sessões por R$ 1.500. A comissão (se COMISSIONADO) é calculada sobre o valor total do pacote.',
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
        resposta: 'Acesse Pacientes > Novo Paciente. O CPF é obrigatório e único — evita duplicatas. Telefone e e-mail são usados para o envio de confirmações e lembretes de consulta.',
      },
      {
        pergunta: 'Pacientes podem se autocadastrar?',
        resposta: 'Sim. Pela página pública de agendamento (/agendar/[slug] do profissional), o paciente informa o CPF. Se já cadastrado, o sistema o reconhece; se não, cria o cadastro automaticamente.',
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
        resposta: 'COMISSIONADO: a clínica retém uma porcentagem de cada consulta realizada. Ao marcar a consulta como realizada, a comissão é calculada automaticamente. LOCATÁRIO: o profissional paga um aluguel fixo mensal pela sala. Ao cadastrar com duração de contrato, os meses são gerados antecipadamente.',
      },
      {
        pergunta: 'Como funciona a geração automática de aluguéis?',
        resposta: 'Ao cadastrar um profissional LOCATÁRIO com valor de aluguel e duração de contrato (ex: 12 meses), o sistema gera automaticamente todos os registros mensais. Eles aparecem em Financeiro > Aluguéis como pendentes e em Contas a Receber.',
      },
      {
        pergunta: 'Como registrar o recebimento de comissão ou aluguel?',
        resposta: 'Em Financeiro > Comissões ou Aluguéis, clique em "Receber" na linha pendente. Informe a forma de recebimento (Pix, Cartão, Dinheiro, Transferência), a data e uma observação opcional. O valor entra automaticamente no faturamento do dashboard.',
      },
      {
        pergunta: 'O que é a aba "Parcelamentos" no cadastro do profissional?',
        resposta: 'Registra contratos de pagamento parcelado de pacientes com o profissional. Informe bandeira do cartão, tipo (crédito/débito), taxa e número de parcelas. O sistema gera um cronograma de vencimentos e rastreia quais foram recebidas.',
      },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    badge: 'Gestão Financeira',
    itens: [
      {
        pergunta: 'Como lançar uma receita ou despesa manualmente?',
        resposta: 'Acesse Financeiro > Receitas (ou Despesas/Investimentos) > Nova Transação. Informe: categoria, descrição, valor, data e status (pendente ou pago). Transações pendentes aparecem em Contas a Receber.',
      },
      {
        pergunta: 'O que são Contas a Receber?',
        resposta: 'Centraliza todos os valores pendentes: consultas agendadas (futuras), comissões não quitadas pelos profissionais, aluguéis não recebidos, parcelas de cartão a vencer e outras receitas pendentes.',
      },
      {
        pergunta: 'Como interpretar o Fluxo de Caixa?',
        resposta: 'Mostra entradas e saídas dia a dia no período selecionado, com o saldo acumulado em linha. Inclui todas as transações pagas + parcelas de cartão com vencimento no período. Use o filtro de período para analisar meses específicos.',
      },
      {
        pergunta: 'Como gerenciar categorias financeiras?',
        resposta: 'Em Financeiro > Categorias é possível criar, editar e definir a cor de cada categoria. Categorias são do tipo RECEITA, DESPESA ou INVESTIMENTO e aparecem nos gráficos e relatórios.',
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    badge: 'Análises',
    itens: [
      {
        pergunta: 'Quais relatórios estão disponíveis?',
        resposta: 'Faturamento, Por Profissional, Por Sala, Despesas por Categoria, DRE (Demonstrativo de Resultado), Comissões, Pacientes e Ocupação de Salas. Todos têm filtro de período e exportação em CSV.',
      },
      {
        pergunta: 'O que é o DRE?',
        resposta: 'Demonstrativo de Resultado do Exercício simplificado. Mostra: Receitas − Despesas − Comissões + Aluguéis − Investimentos = Lucro Líquido. Útil para análise financeira do período.',
      },
      {
        pergunta: 'Como exportar um relatório?',
        resposta: 'Cada página de relatório tem o botão "Exportar CSV" no canto superior direito. O arquivo baixado abre em Excel ou Google Sheets. Para imprimir/gerar PDF, use o botão "Imprimir / PDF" que abre a janela de impressão do navegador.',
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    badge: 'Personalização',
    itens: [
      {
        pergunta: 'Como personalizar a clínica?',
        resposta: 'Em Configurações, você pode: alterar o nome da clínica (exibido na sidebar e na página pública), fazer upload do logotipo (JPEG/PNG até 5MB, comprimido automaticamente) e escolher a cor principal do sistema entre 8 opções predefinidas ou uma cor personalizada.',
      },
      {
        pergunta: 'As alterações de tema são imediatas?',
        resposta: 'Sim. O preview é mostrado em tempo real antes de salvar. Após salvar, a cor e o logo são atualizados em toda a interface, incluindo a página pública de agendamento dos profissionais.',
      },
    ],
  },
]

export function AjudaAdmin() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Guia completo de uso do sistema para administradores.
        </p>
      </div>

      {SECOES.map((secao) => (
        <div key={secao.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{secao.titulo}</h2>
            <Badge variant="outline" className="text-xs">{secao.badge}</Badge>
          </div>
          <Accordion type="multiple" className="rounded-lg border bg-card divide-y">
            {secao.itens.map((item, i) => (
              <AccordionItem key={i} value={`${secao.id}-${i}`} className="border-0 px-4">
                <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline text-left">
                  {item.pergunta}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.resposta}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}
