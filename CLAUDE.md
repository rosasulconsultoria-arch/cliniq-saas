# Sistema de Gestão — Clínica de Psicologia

## Stack
- Next.js 14+ (App Router) + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js v5 (Auth.js) para autenticação
- Tailwind CSS + shadcn/ui para UI
- Recharts para gráficos
- Zod para validação
- date-fns para datas
- Resend para e-mails
- React Hook Form para formulários

## Convenções
- Use Server Components por padrão; Client Components apenas quando necessário (interatividade, hooks)
- Server Actions para mutações (criar, editar, deletar)
- Validação Zod em TODA entrada de dados (cliente e servidor)
- Nomes de variáveis e comentários em português; nomes técnicos (componentes, funções) em inglês
- Cada feature em sua própria pasta dentro de /app
- Componentes reutilizáveis em /components
- Lógica de negócio em /lib
- Tipos compartilhados em /types

## Papéis de usuário (roles)
- ADMIN: acesso total
- PROFISSIONAL: vê apenas própria agenda, pacientes e comissões
- RECEPCAO: agenda, cadastros, sem financeiro

## Regras de negócio
- Profissional pode ser COMISSIONADO (% por consulta) ou LOCATARIO (aluguel fixo mensal de sala)
- Agendamento não pode ter conflito de sala nem de profissional
- Página pública /agendar/[slug] não exige login; identifica paciente por CPF (cria se não existir)
- Comissão é calculada automaticamente quando agendamento muda para status REALIZADO
- Aluguel é gerado mensalmente para cada profissional LOCATARIO

## Princípios de UX
- Layout limpo, moderno, com sidebar fixa à esquerda
- Tema claro e escuro
- Feedback visual em toda ação (toast notifications)
- Loading states em todas as operações assíncronas
- Empty states amigáveis
- Mobile responsivo

Sempre consulte este arquivo antes de tomar decisões arquiteturais.
