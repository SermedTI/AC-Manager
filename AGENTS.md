# Sistema de Gerenciamento de Ar Condicionados

Sistema completo para gerenciamento de manutenção de equipamentos de ar-condicionado, composto por painel web administrativo e aplicativo mobile para técnicos.

## Arquitetura

- **Monorepo** com npm workspaces: `backend/`, `frontend/`, `shared/`
- **Backend**: Express + Prisma + PostgreSQL (porta 3333)
- **Frontend**: React 19 + Vite + TailwindCSS v4 + React Query
- **Mobile (separado)**: Flutter + Riverpod em `D:\ac-mobile\`
- **Banco**: Supabase PostgreSQL — usado tanto pelo backend (via Prisma) quanto pelo app mobile (via Supabase SDK)

## Comandos

```bash
# Dev (backend + frontend simultâneos)
npm run dev

# Apenas backend
npm run dev:backend

# Apenas frontend
npm run dev:frontend

# Build
npm run build

# Database
cd backend && npx prisma migrate dev    # criar migration
cd backend && npx prisma db push        # push schema sem migration
cd backend && npx prisma studio         # UI do banco
cd backend && npx prisma db seed        # popular dados iniciais
```

## Estrutura de Diretórios

```
backend/
  src/
    controllers/    # Handlers de request/response
    services/       # Lógica de negócio e queries Prisma
    routes/         # Definição de rotas Express
    middleware/     # Auth (JWT), error handler, upload (multer)
    config/         # Variáveis de ambiente
    lib/            # Prisma client singleton
    jobs/           # Cron jobs
  prisma/
    schema.prisma   # Schema do banco
    seed.ts         # Seed data

frontend/
  src/
    pages/          # Páginas da aplicação
    components/     # Componentes reutilizáveis (ui/, layout/)
    contexts/       # React Context (AuthContext)
    hooks/          # Custom hooks
    lib/            # api.ts (axios), utils.ts (helpers)

shared/
  src/              # Tipos, enums e constantes compartilhados
```

## Roles (Papéis)

| Role | Acesso |
|------|--------|
| ADMIN | Acesso total: gerenciar usuários, unidades, equipamentos, OS |
| TECHNICIAN | Visualizar e assumir OS, registrar execução |
| REQUESTER | Criar OS (chamados), visualizar próprias OS |
| VIEWER | Apenas visualização |

## Fluxo de OS (Ordens de Serviço)

1. ADMIN ou REQUESTER cria OS sem técnico atribuído (pool de OS abertas)
2. Técnico visualiza OS abertas no app mobile e "assume" (claim)
3. Técnico inicia execução, registra conclusão com notas/fotos
4. OS concluída fica disponível para relatórios

## Convenções

- Idioma do código: inglês (nomes de variáveis, funções, rotas)
- Idioma da UI: português brasileiro
- Validação de input: Zod nos controllers
- Senhas: bcryptjs com salt rounds = 12
- Auth: JWT Bearer token no header Authorization
- Respostas paginadas: `{ data, total, page, limit, totalPages }`
- Erros de negócio: `throw Object.assign(new Error('msg'), { status: 4xx })`

## Variáveis de Ambiente

Arquivo `.env` na raiz. Ver `.env.example` para referência:
- `DATABASE_URL` — conexão PostgreSQL (Supabase)
- `JWT_SECRET` — segredo para assinar tokens
- `FRONTEND_URL` — URL do frontend para CORS
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — para sync com mobile
