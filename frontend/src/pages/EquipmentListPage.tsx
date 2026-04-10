import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Search, AirVent } from 'lucide-react'
import { translateStatus, statusColor } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

const EQUIPMENT_TYPES = ['Split', 'Window', 'Cassette', 'Floor Standing', 'Portable', 'Central', 'VRF']

export function EquipmentListPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN'

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [statusFilter, setStatusFilter] = useState('')
  const [unitFilter, setUnitFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    tag: '', brand: '', model: '', serialNumber: '', btuCapacity: '',
    type: '', installDate: '', location: '', notes: '', unitId: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', debouncedSearch, statusFilter, unitFilter],
    queryFn: () =>
      api.get('/equipment', {
        params: {
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          unitId: unitFilter || undefined,
          limit: 100,
        },
      }).then((r) => r.data),
  })

  const { data: units } = useQuery({
    queryKey: ['units-list'],
    queryFn: () => api.get('/units', { params: { limit: 100 } }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/equipment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      setDialogOpen(false)
      setForm({
        tag: '', brand: '', model: '', serialNumber: '', btuCapacity: '',
        type: '', installDate: '', location: '', notes: '', unitId: '',
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      btuCapacity: form.btuCapacity ? parseInt(form.btuCapacity) : undefined,
      serialNumber: form.serialNumber || undefined,
      installDate: form.installDate || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Equipamentos</h1>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Equipamento
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-48"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
          <option value="">Todos os status</option>
          <option value="OPERATIONAL">Operacional</option>
          <option value="NEEDS_MAINTENANCE">Necessita Manutenção</option>
          <option value="BROKEN">Quebrado</option>
          <option value="DEACTIVATED">Desativado</option>
        </Select>
        <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-48">
          <option value="">Todas as unidades</option>
          {units?.data?.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data?.data?.length ? (
        <p className="text-muted-foreground text-center py-12">Nenhum equipamento encontrado.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Tag</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Marca/Modelo</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Unidade</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((eq: any) => (
                <tr key={eq.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">
                    <Link
                      to={`/equipment/${eq.id}`}
                      className="font-medium text-primary hover:underline flex items-center gap-2"
                    >
                      <AirVent className="h-4 w-4" />
                      {eq.tag}
                    </Link>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    {eq.brand} {eq.model}
                  </td>
                  <td className="p-3 hidden md:table-cell">{eq.unit?.name}</td>
                  <td className="p-3 hidden lg:table-cell">{eq.type || '-'}</td>
                  <td className="p-3">
                    <Badge className={statusColor(eq.status)}>
                      {translateStatus(eq.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Equipamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tag *</Label>
              <Input
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                placeholder="AC-004"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {units?.data?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número de Série</Label>
              <Input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacidade BTU</Label>
              <Input
                type="number"
                value={form.btuCapacity}
                onChange={(e) => setForm({ ...form, btuCapacity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="">Selecione...</option>
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Instalação</Label>
              <Input
                type="date"
                value={form.installDate}
                onChange={(e) => setForm({ ...form, installDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Localização (sala/andar)</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {createMutation.isError && (
            <p className="text-sm text-destructive">
              {(createMutation.error as any)?.response?.data?.error || 'Erro ao criar equipamento'}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
