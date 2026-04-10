# Frontend — React + Vite + TailwindCSS

## Stack

- **React** 19 com TypeScript
- **Vite** 8 (dev server + build)
- **TailwindCSS** v4 (via @tailwindcss/vite plugin)
- **React Router** v7
- **React Query** (TanStack Query v5) para data fetching
- **Axios** para requisições HTTP
- **Lucide React** para ícones
- **Recharts** para gráficos no dashboard
- **class-variance-authority + clsx + tailwind-merge** para estilização de componentes

## Comandos

```bash
npm run dev       # vite (porta 5173)
npm run build     # tsc + vite build
npm run lint      # eslint
npm run preview   # vite preview
```

## Estrutura

```
src/
  pages/              # Páginas (uma por rota)
  components/
    ui/               # Componentes base (Button, Input, Select, Badge, Dialog, etc.)
    layout/           # Layout da aplicação (Sidebar, Header)
  contexts/
    AuthContext.tsx    # Contexto de autenticação (login, logout, user, token)
  hooks/              # Custom hooks
  lib/
    api.ts            # Instância axios com interceptors (baseURL: /api, Bearer token)
    utils.ts          # cn(), formatDate(), translateStatus(), translateRole(), etc.
  main.tsx            # Entry point
  App.tsx             # Router + providers
```

## Padrões

### API Calls com React Query

```typescript
// Buscar dados
const { data, isLoading } = useQuery({
  queryKey: ['resource', filters],
  queryFn: () => api.get('/resource', { params }).then(r => r.data),
})

// Mutação
const mutation = useMutation({
  mutationFn: (data) => api.post('/resource', data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource'] }),
})
```

### Autenticação

- `useAuth()` hook retorna `{ user, token, isAuthenticated, isLoading, login, register, logout }`
- Token armazenado em `localStorage`
- Interceptor axios adiciona `Authorization: Bearer <token>` automaticamente
- Interceptor redireciona para `/login` em 401

### Proteção de Rotas por Role

Feita diretamente nas páginas:
```typescript
if (user?.role !== 'ADMIN') return <Navigate to="/" replace />
```

### Componentes UI

Componentes em `src/components/ui/` seguem padrão simples com props nativas do HTML + className merge via `cn()`:
- `Button` — variantes: default, outline, destructive, ghost; tamanhos: sm, default
- `Input`, `Select`, `Badge`, `Dialog`

### Dialogs

Dialogs seguem o padrão:
```typescript
const [showDialog, setShowDialog] = useState(false)
// ...
{showDialog && <CreateDialog onClose={() => setShowDialog(false)} />}
```

### Traduções

Helpers em `lib/utils.ts` para traduzir enums do backend para português:
- `translateStatus()` — status de equipamento e OS
- `translateType()` — tipo de manutenção
- `translateRole()` — role do usuário

## Páginas

| Página | Rota | Acesso |
|--------|------|--------|
| LoginPage | /login | Público |
| DashboardPage | / | Autenticado |
| UnitsPage | /units | Autenticado |
| UnitDetailPage | /units/:id | Autenticado |
| EquipmentListPage | /equipment | Autenticado |
| EquipmentProfilePage | /equipment/:id | Autenticado |
| MaintenancePage | /maintenance | Autenticado |
| MaintenanceCalendarPage | /maintenance/calendar | Autenticado |
| UsersPage | /users | ADMIN |
| PublicProfilePage | /p/:id | Público (QR code) |
