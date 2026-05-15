# Checklist de Deploy — Clínica PSI

Use este arquivo como guia para cada deploy. Marque os itens conforme avança.

---

## 1. Banco de Dados — Neon (recomendado para produção)

- [ ] Criar conta em [neon.tech](https://neon.tech)
- [ ] Criar projeto: `clinica-psi` | Region: `South America (São Paulo)`
- [ ] Copiar **Connection string** do painel (pooled connection)
  - Format: `postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require`
- [ ] Salvar no `.env.local` como `DATABASE_URL`
- [ ] Rodar migrations em produção:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Rodar seed:
  ```bash
  npm run db:seed
  ```
- [ ] Verificar: admin@clinica.com foi criado

> **Nota Neon:** use a **Pooled connection** (porta 5432 via PgBouncer) para o app. Use a **Direct connection** para migrations.

---

## 2. Variáveis de Ambiente — Produção

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | Neon pooled connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | Secret JWT (gere com `openssl rand -base64 32`) | `abc123...` |
| `NEXTAUTH_URL` | URL pública do app | `https://clinica.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | URL pública (acessível no cliente) | `https://clinica.vercel.app` |
| `RESEND_API_KEY` | API key do Resend | `re_abc123...` |
| `EMAIL_FROM` | E-mail remetente (domínio verificado) | `noreply@suaclinica.com.br` |

---

## 3. E-mail — Resend

- [ ] Criar conta em [resend.com](https://resend.com)
- [ ] Verificar domínio: Settings → Domains → Add Domain
  - Adicionar registros DNS no provedor de domínio (TXT + MX)
  - Aguardar verificação (~5 min)
- [ ] Criar API Key: Settings → API Keys → Create API Key
- [ ] Salvar `RESEND_API_KEY` nas env vars da Vercel
- [ ] Configurar `EMAIL_FROM` com o domínio verificado
- [ ] **Testar:** fazer um agendamento público e verificar se e-mail chega

---

## 4. Deploy — Vercel

### 4.1 Repositório GitHub

- [ ] `git init` (se ainda não tem)
- [ ] `git add . && git commit -m "feat: initial deploy"`
- [ ] Criar repositório no GitHub (pode ser privado)
- [ ] `git remote add origin https://github.com/SEU_USUARIO/clinica-psi.git`
- [ ] `git push -u origin main`

### 4.2 Vercel

- [ ] Acessar [vercel.com](https://vercel.com) → New Project
- [ ] Importar repositório GitHub
- [ ] Framework: **Next.js** (detectado automaticamente)
- [ ] Build command: `npm run build` (padrão)
- [ ] Output directory: `.next` (padrão)

### 4.3 Variáveis de Ambiente na Vercel

Em Project Settings → Environment Variables, adicionar:

- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL` (URL do deploy, ex: `https://clinica-psi.vercel.app`)
- [ ] `NEXT_PUBLIC_APP_URL` (mesma URL)
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`

### 4.4 Deploy

- [ ] Clicar **Deploy**
- [ ] Aguardar build (~3-5 min)
- [ ] Verificar se não há erros no build log

---

## 5. Domínio Customizado (opcional)

- [ ] Project Settings → Domains → Add
- [ ] Digitar domínio: `app.suaclinica.com.br`
- [ ] Adicionar registro CNAME no provedor de domínio:
  - Name: `app`
  - Value: `cname.vercel-dns.com`
- [ ] Aguardar propagação DNS (~15 min)
- [ ] Atualizar `NEXTAUTH_URL` e `NEXT_PUBLIC_APP_URL` para o novo domínio
- [ ] Fazer redeploy

---

## 6. Pós-Deploy — Testes Obrigatórios

### 6.1 Autenticação
- [ ] Acessar `https://SEU-DOMINIO/login`
- [ ] Login: `admin@clinica.com` / `admin123`
- [ ] Redireciona para dashboard ✓
- [ ] **TROCAR SENHA DO ADMIN** (Usuários → Editar admin)
- [ ] Logout funciona ✓
- [ ] Tentativa de acessar `/financeiro` sem ser ADMIN → redireciona ✓

### 6.2 Fluxo completo
- [ ] Criar profissional (com disponibilidade configurada)
- [ ] Acessar link público: `https://SEU-DOMINIO/agendar/[slug]`
- [ ] Fazer agendamento como paciente
- [ ] E-mail de confirmação chegou ✓
- [ ] No painel: marcar agendamento como REALIZADO
- [ ] Verificar comissão criada automaticamente (/financeiro/comissoes)
- [ ] Verificar transação financeira criada (/financeiro/receitas)

### 6.3 Cadastros
- [ ] Criar paciente ✓
- [ ] Editar paciente ✓
- [ ] Criar sala ✓
- [ ] Criar usuário com role RECEPCAO ✓

### 6.4 Financeiro
- [ ] Criar receita manual ✓
- [ ] Criar despesa ✓
- [ ] Verificar gráficos no dashboard (/dashboard)
- [ ] Exportar CSV de relatório (/relatorios) ✓

---

## 7. Segurança Pós-Deploy

- [ ] Senha do admin inicial trocada
- [ ] NEXTAUTH_SECRET é único e não foi compartilhado
- [ ] DATABASE_URL não está exposta publicamente
- [ ] Verificar cabeçalhos HTTP: `curl -I https://SEU-DOMINIO` deve mostrar `X-Frame-Options: SAMEORIGIN`
- [ ] HTTPS ativo ✓ (Vercel fornece automaticamente)

---

## 8. Manutenção

### Migrations futuras
```bash
# Localmente, testar primeiro:
npx prisma migrate dev --name nome_da_migration

# Em produção (sem interação):
npx prisma migrate deploy
```

### Reset de emergência (CUIDADO: apaga tudo)
```bash
npx prisma migrate reset --force
npm run db:seed
```

### Monitoramento
- Vercel Analytics: Project → Analytics (ativar em Project Settings)
- Vercel Logs: Project → Deployments → Logs
- Neon: métricas de queries no painel

---

## 9. Rate Limiting (opcional — recomendado para produção)

Para proteger a rota pública `/agendar/[slug]` contra spam:

1. Criar conta em [upstash.com](https://upstash.com)
2. Criar Redis database
3. `npm install @upstash/ratelimit @upstash/redis`
4. Adicionar env vars:
   ```
   UPSTASH_REDIS_REST_URL=
   UPSTASH_REDIS_REST_TOKEN=
   ```
5. Implementar em `app/(public)/agendar/[slug]/actions.ts`:
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit'
   import { Redis } from '@upstash/redis'

   const ratelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 req/min por IP
   })
   ```

---

## Status do Deploy

| Ambiente | URL | Status |
|---|---|---|
| Produção | — | 🔴 Pendente |
| Staging | — | — |

> Atualizar esta tabela após o primeiro deploy bem-sucedido.
