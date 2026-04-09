import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft,
  QrCode,
  Download,
  FileText,
  Plus,
  Wrench,
  Paperclip,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react'
import {
  formatDate,
  translateStatus,
  translateType,
  translateRole,
  statusColor,
} from '@/lib/utils'

type Tab = 'history' | 'plans' | 'attachments' | 'details'

export function EquipmentProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canEdit = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN'

  const [activeTab, setActiveTab] = useState<Tab>('history')
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [recordDialogOpen, setRecordDialogOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    title: '', description: '', type: 'PREVENTIVE', intervalDays: '90', nextDueDate: '',
  })
  const [recordForm, setRecordForm] = useState({
    title: '', description: '', type: 'CORRECTIVE', scheduledDate: '',
  })

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => api.get(`/equipment/${id}`).then((r) => r.data),
  })

  const createPlanMutation = useMutation({
    mutationFn: (data: any) => api.post('/maintenance/plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
      setPlanDialogOpen(false)
      setPlanForm({ title: '', description: '', type: 'PREVENTIVE', intervalDays: '90', nextDueDate: '' })
    },
  })

  const createRecordMutation = useMutation({
    mutationFn: (data: any) => api.post('/maintenance/records', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
      setRecordDialogOpen(false)
      setRecordForm({ title: '', description: '', type: 'CORRECTIVE', scheduledDate: '' })
    },
  })

  const updateRecordMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: string; data: any }) =>
      api.patch(`/maintenance/records/${recordId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post('/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', id] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!equipment) {
    return <p className="text-center text-muted-foreground py-12">Equipamento não encontrado.</p>
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('equipmentId', id!)
    uploadMutation.mutate(formData)
    e.target.value = ''
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'history', label: 'Histórico', icon: Wrench },
    { key: 'plans', label: 'Planos', icon: Calendar },
    { key: 'attachments', label: 'Anexos', icon: Paperclip },
    { key: 'details', label: 'Detalhes', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/equipment">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{equipment.tag}</h1>
            <Badge className={statusColor(equipment.status)}>
              {translateStatus(equipment.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {equipment.brand} {equipment.model}
            {equipment.unit && ` - ${equipment.unit.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/equipment/${id}/qrcode`} target="_blank" rel="noopener" download>
            <Button variant="outline" size="sm">
              <QrCode className="h-4 w-4 mr-1" />
              QR Code
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const res = await api.get(`/equipment/${id}/report`, { responseType: 'blob' })
              const url = URL.createObjectURL(res.data)
              window.open(url)
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* QR Code card */}
      {equipment.qrCodeUrl && (
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={equipment.qrCodeUrl}
              alt={`QR Code - ${equipment.tag}`}
              className="w-32 h-32 border rounded"
            />
            <div className="text-center sm:text-left">
              <p className="font-medium">QR Code do Equipamento</p>
              <p className="text-sm text-muted-foreground mt-1">
                Escaneie para acessar o prontuário deste equipamento.
              </p>
              <p className="text-xs text-muted-foreground mt-1 break-all">
                {window.location.origin}/equipment/{id}
              </p>
              <a
                href={`/api/equipment/${id}/qrcode`}
                download={`QR-${equipment.tag}.png`}
                className="inline-block mt-2"
              >
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Baixar QR Code
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick info cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">BTU</p>
            <p className="font-semibold">{equipment.btuCapacity?.toLocaleString() ?? 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Tipo</p>
            <p className="font-semibold">{equipment.type || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Localização</p>
            <p className="font-semibold text-xs">{equipment.location || 'N/A'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Instalação</p>
            <p className="font-semibold">
              {equipment.installDate ? formatDate(equipment.installDate) : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {canEdit && (
            <Button size="sm" onClick={() => setRecordDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Registrar Manutenção
            </Button>
          )}
          {!equipment.maintenanceRecords?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro de manutenção.
            </p>
          ) : (
            <div className="space-y-3">
              {equipment.maintenanceRecords.map((record: any) => (
                <Card key={record.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{record.title}</h4>
                          <Badge className={statusColor(record.type)}>
                            {translateType(record.type)}
                          </Badge>
                          <Badge className={statusColor(record.status)}>
                            {translateStatus(record.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Agendado: {formatDate(record.scheduledDate)}
                          {record.completedDate && ` | Concluído: ${formatDate(record.completedDate)}`}
                          {record.performedBy && ` | Técnico: ${record.performedBy.name}`}
                        </p>
                        {record.notes && (
                          <p className="text-sm mt-1">{record.notes}</p>
                        )}
                      </div>
                      {canEdit && record.status !== 'COMPLETED' && record.status !== 'CANCELLED' && (
                        <div className="flex gap-1">
                          {record.status === 'SCHEDULED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRecordMutation.mutate({
                                  recordId: record.id,
                                  data: { status: 'IN_PROGRESS', performedById: user?.id },
                                })
                              }
                            >
                              Iniciar
                            </Button>
                          )}
                          {(record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS') && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateRecordMutation.mutate({
                                  recordId: record.id,
                                  data: { status: 'COMPLETED', performedById: user?.id },
                                })
                              }
                            >
                              Concluir
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="space-y-4">
          {canEdit && (
            <Button size="sm" onClick={() => setPlanDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Novo Plano
            </Button>
          )}
          {!equipment.maintenancePlans?.length ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum plano de manutenção ativo.
            </p>
          ) : (
            <div className="space-y-3">
              {equipment.maintenancePlans.map((plan: any) => (
                <Card key={plan.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{plan.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {translateType(plan.type)} a cada {plan.intervalDays} dias
                        </p>
                        {plan.description && (
                          <p className="text-sm mt-1">{plan.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Próxima:</p>
                        <p className="text-sm">{formatDate(plan.nextDueDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="space-y-4">
          {canEdit && (
            <div>
              <label className="cursor-pointer">
                <Button size="sm" asChild>
                  <span>
                    <Plus className="h-4 w-4 mr-1" />
                    Upload Arquivo
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}
          {!equipment.attachments?.length ? (
            <p className="text-muted-foreground text-center py-8">Nenhum anexo.</p>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {equipment.attachments.map((att: any) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener"
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex flex-col items-center gap-2">
                        {att.fileType.startsWith('image/') ? (
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="h-24 w-full object-cover rounded"
                          />
                        ) : (
                          <FileText className="h-12 w-12 text-muted-foreground" />
                        )}
                        <p className="text-xs truncate w-full text-center">
                          {att.fileName}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tag:</span>
                <p className="font-medium">{equipment.tag}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Marca:</span>
                <p className="font-medium">{equipment.brand}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Modelo:</span>
                <p className="font-medium">{equipment.model}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nº Série:</span>
                <p className="font-medium">{equipment.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">BTU:</span>
                <p className="font-medium">{equipment.btuCapacity?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{equipment.type || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unidade:</span>
                <p className="font-medium">{equipment.unit?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Localização:</span>
                <p className="font-medium">{equipment.location || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data Instalação:</span>
                <p className="font-medium">
                  {equipment.installDate ? formatDate(equipment.installDate) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Cadastrado por:</span>
                <p className="font-medium">{equipment.createdBy?.name || 'N/A'}</p>
              </div>
            </div>
            {equipment.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Observações:</span>
                <p className="text-sm mt-1">{equipment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Plan dialog */}
      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Novo Plano de Manutenção</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createPlanMutation.mutate({
              ...planForm,
              intervalDays: parseInt(planForm.intervalDays),
              equipmentId: id,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              placeholder="Ex: Limpeza de filtros"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={planForm.type}
                onChange={(e) => setPlanForm({ ...planForm, type: e.target.value })}
              >
                <option value="PREVENTIVE">Preventiva</option>
                <option value="CORRECTIVE">Corretiva</option>
                <option value="CLEANING">Limpeza</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intervalo (dias) *</Label>
              <Input
                type="number"
                min="1"
                value={planForm.intervalDays}
                onChange={(e) => setPlanForm({ ...planForm, intervalDays: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Próxima data *</Label>
            <Input
              type="date"
              value={planForm.nextDueDate}
              onChange={(e) => setPlanForm({ ...planForm, nextDueDate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPlanMutation.isPending}>
              {createPlanMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Record dialog */}
      <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Registrar Manutenção</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createRecordMutation.mutate({
              ...recordForm,
              equipmentId: id,
            })
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={recordForm.title}
              onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
              placeholder="Ex: Troca de compressor"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={recordForm.type}
                onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
              >
                <option value="PREVENTIVE">Preventiva</option>
                <option value="CORRECTIVE">Corretiva</option>
                <option value="CLEANING">Limpeza</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data agendada *</Label>
              <Input
                type="date"
                value={recordForm.scheduledDate}
                onChange={(e) => setRecordForm({ ...recordForm, scheduledDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={recordForm.description}
              onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRecordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createRecordMutation.isPending}>
              {createRecordMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
