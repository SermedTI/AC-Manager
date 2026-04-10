import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { translateRole } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'

export function UsersPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  const { data, isLoading } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () =>
      api.get('/users', { params: { search: debouncedSearch || undefined, limit: 100 } }).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuários</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data?.data?.length ? (
        <p className="text-muted-foreground text-center py-12">Nenhum usuário encontrado.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">E-mail</th>
                <th className="text-left p-3 font-medium">Função</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((u: any) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="p-3">
                    <Select
                      value={u.role}
                      onChange={(e) =>
                        updateMutation.mutate({ id: u.id, data: { role: e.target.value } })
                      }
                      className="w-36"
                      disabled={u.id === user?.id}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="TECHNICIAN">Técnico</option>
                      <option value="REQUESTER">Solicitante</option>
                      <option value="VIEWER">Visualizador</option>
                    </Select>
                  </td>
                  <td className="p-3">
                    <Button
                      variant={u.active ? 'outline' : 'destructive'}
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({ id: u.id, data: { active: !u.active } })
                      }
                      disabled={u.id === user?.id}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
