import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatDate, translateStatus, translateType, statusColor } from '@/lib/utils'

export function MaintenancePage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-records', statusFilter, typeFilter],
    queryFn: () =>
      api
        .get('/maintenance/records', {
          params: {
            status: statusFilter || undefined,
            type: typeFilter || undefined,
            limit: 100,
          },
        })
        .then((r) => r.data),
  })

  const { data: overdueData } = useQuery({
    queryKey: ['maintenance-overdue'],
    queryFn: () => api.get('/maintenance/overdue').then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manutenções</h1>

      {overdueData && overdueData.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">
            {overdueData.length} manutenção(ões) atrasada(s)
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          <option value="">Todos os status</option>
          <option value="SCHEDULED">Agendado</option>
          <option value="IN_PROGRESS">Em Andamento</option>
          <option value="COMPLETED">Concluído</option>
          <option value="CANCELLED">Cancelado</option>
        </Select>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-48"
        >
          <option value="">Todos os tipos</option>
          <option value="PREVENTIVE">Preventiva</option>
          <option value="CORRECTIVE">Corretiva</option>
          <option value="CLEANING">Limpeza</option>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setShowCreateDialog(true)}>
            + Nova Manutenção
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !data?.data?.length ? (
        <p className="text-muted-foreground text-center py-12">
          Nenhum registro de manutenção encontrado.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Título</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Equipamento</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Data</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Técnico</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Solicitante</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((record: any) => {
                const isOverdue =
                  (record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS') &&
                  new Date(record.scheduledDate) < new Date()

                return (
                  <tr
                    key={record.id}
                    className={`border-t hover:bg-muted/50 ${isOverdue ? 'bg-red-50' : ''}`}
                  >
                    <td className="p-3">
                      <Link
                        to={`/equipment/${record.equipmentId}`}
                        className="font-medium hover:underline text-primary"
                      >
                        {record.title}
                      </Link>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {record.equipment?.tag}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge className={statusColor(record.type)}>
                        {translateType(record.type)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={statusColor(record.status)}>
                        {translateStatus(record.status)}
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      {formatDate(record.scheduledDate)}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {record.performedBy?.name || '-'}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      {record.requestedBy?.name || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateMaintenanceDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => {
          setShowCreateDialog(false)
          queryClient.invalidateQueries({ queryKey: ['maintenance-records'] })
          queryClient.invalidateQueries({ queryKey: ['maintenance-overdue'] })
        }}
      />
    </div>
  )
}

function CreateMaintenanceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'PREVENTIVE',
    scheduledDate: '',
    equipmentId: '',
  })
  const [error, setError] = useState('')

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment-list-all'],
    queryFn: () => api.get('/equipment', { params: { limit: 500 } }).then((r) => r.data),
    enabled: open,
  })

  const equipments = equipmentData?.data || []

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/maintenance/records', data),
    onSuccess: () => {
      setForm({
        title: '',
        description: '',
        type: 'PREVENTIVE',
        scheduledDate: '',
        equipmentId: '',
      })
      setError('')
      onCreated()
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Erro ao criar manutenção')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.scheduledDate || !form.equipmentId) {
      setError('Preencha os campos obrigatórios')
      return
    }
    setError('')
    createMutation.mutate(form)
  }

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Nova Ordem de Serviço</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Ex: Limpeza preventiva"
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Detalhes da manutenção..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Tipo *</Label>
            <Select
              id="type"
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            >
              <option value="PREVENTIVE">Preventiva</option>
              <option value="CORRECTIVE">Corretiva</option>
              <option value="CLEANING">Limpeza</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="scheduledDate">Data Agendada *</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={form.scheduledDate}
              onChange={(e) => update('scheduledDate', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="equipmentId">Equipamento *</Label>
          <Select
            id="equipmentId"
            value={form.equipmentId}
            onChange={(e) => update('equipmentId', e.target.value)}
          >
            <option value="">Selecione um equipamento</option>
            {equipments.map((eq: any) => (
              <option key={eq.id} value={eq.id}>
                {eq.tag} - {eq.brand} {eq.model}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Criando...' : 'Criar OS'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
