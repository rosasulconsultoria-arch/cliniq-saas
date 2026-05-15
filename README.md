# Sistema de Gestão — Clínica de Psicologia

Sistema web completo para gestão de clínicas de psicologia: agendamentos, cadastros, financeiro e relatórios.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js Server Actions, Prisma 7 (PrismaPg adapter) |
| Banco | PostgreSQL (Supabase / Neon) |
| Autenticação | NextAuth.js v5 (JWT) |
| E-mail | Resend |
| Deploy | Vercel |

## Setup Local

### Pré-requisitos
- Node.js 20+
- PostgreSQL (local, Supabase ou Neon)
- npm

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
DATABASE_URL=postgresql://usuario:senha@host:5432/clinica_psi
NEXTAUTH_SECRET=<gere com: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=               # opcional em dev
EMAIL_FROM=noreply@suadominio.com
```

### 3. Banco de dados

```bash
# Gerar Prisma Client
npx prisma generate

# Criar tabelas
npx prisma migrate dev --name init

# Popular com dados iniciais (admin + categorias + salas)
npm run db:seed
```

### 4. Rodar

```bash
npm run dev
```

Acesse `http://localhost:3000` → login com `admin@clinica.com` / `admin123`

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run db:seed` | Popular banco com dados iniciais |
| `npm run db:reset` | Reset completo + seed |
| `npx prisma studio` | Interface visual do banco |
| `npx prisma migrate dev` | Criar/aplicar migration |

## Arquitetura

```
app/
  (auth)/          ← páginas de login/esqueci-senha
  (dashboard)/     ← rotas protegidas (sidebar + header)
    agenda/
    dashboard/
    financeiro/
    pacientes/
    profissionais/
    relatorios/
    salas/
    usuarios/
  (public)/        ← agendamento público sem login
    agendar/[slug]
    cancelar/[token]

lib/               ← utilitários, db, auth, schemas
components/        ← componentes reutilizáveis
types/             ← tipos TypeScript compartilhados
prisma/            ← schema e migrations
```

## Roles

| Role | Acesso |
|---|---|
| `ADMIN` | Tudo |
| `PROFISSIONAL` | Própria agenda, pacientes e comissões |
| `RECEPCAO` | Agenda + cadastros, sem financeiro |

## Deploy

Ver [DEPLOY.md](./DEPLOY.md) para o checklist completo de deploy.
