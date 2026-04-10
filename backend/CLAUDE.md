# Backend — Express + Prisma

## Stack

- **Runtime**: Node.js com tsx (dev) / tsc (build)
- **Framework**: Express 4
- **ORM**: Prisma com PostgreSQL (Supabase)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Validação**: Zod
- **Upload**: Multer
- **PDF**: PDFKit
- **QR Code**: qrcode

## Comandos

```bash
npm run dev           # tsx watch src/index.ts
npm run build         # tsc
npx prisma migrate dev
npx prisma db push
npx prisma studio
npx prisma db seed    # tsx prisma/seed.ts
```

## Padrão de Código

### Camadas

1. **Routes** (`src/routes/*.routes.ts`): definem rotas e aplicam middlewares de auth/role
2. **Controllers** (`src/controllers/*.controller.ts`): validam input com Zod, chamam service, retornam response
3. **Services** (`src/services/*.service.ts`): lógica de negócio, queries Prisma, sem dependência de Request/Response

### Criando um novo recurso

1. Criar model no `prisma/schema.prisma`
2. Criar service em `src/services/`
3. Criar controller em `src/controllers/` com schemas Zod
4. Criar routes em `src/routes/`
5. Registrar routes em `src/app.ts`

### Auth Middleware

```typescript
// Proteger rota inteira para autenticados
router.use(requireAuth)

// Exigir role específica
router.use(requireAuth, requireRole('ADMIN'))

// Role por rota
router.post('/', requireAuth, requireRole('ADMIN', 'REQUESTER'), controller.create)
```

O `req.user` contém `{ id, email, role }` após `requireAuth`.

### Tratamento de Erros

- Erros de negócio: `throw Object.assign(new Error('Mensagem'), { status: 409 })`
- Controllers fazem catch e verificam `err.status` antes de passar para `next(err)`
- `errorHandler` middleware captura erros não tratados

### Respostas Paginadas

```typescript
return {
  data: [...],
  total: number,
  page: number,
  limit: number,
  totalPages: Math.ceil(total / limit)
}
```

### Prisma Select Pattern

Sempre usar `select` explícito para nunca retornar `password`:

```typescript
select: {
  id: true, email: true, name: true,
  role: true, active: true,
  createdAt: true, updatedAt: true,
}
```

## Schema do Banco

Models principais: `User`, `Unit`, `Equipment`, `MaintenancePlan`, `MaintenanceRecord`, `Attachment`

- Tabelas usam snake_case (`@map`)
- Campos usam camelCase no Prisma
- UUIDs como IDs
- `createdAt`/`updatedAt` automáticos
- Relações: Equipment pertence a Unit, MaintenanceRecord pertence a Equipment, etc.

## Rotas da API

| Prefixo | Arquivo | Auth |
|---------|---------|------|
| `/api/auth` | auth.routes.ts | Público (login/register) |
| `/api/users` | users.routes.ts | ADMIN only |
| `/api/units` | units.routes.ts | Autenticado |
| `/api/equipment` | equipment.routes.ts | Autenticado |
| `/api/maintenance` | maintenance.routes.ts | Por rota |
| `/api/attachments` | attachments.routes.ts | Autenticado |
| `/api/dashboard` | dashboard.routes.ts | Autenticado |
