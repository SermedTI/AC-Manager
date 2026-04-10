import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AirVent,
  Building2,
  MapPin,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import {
  formatDate,
  translateStatus,
  translateType,
  statusColor,
  cn,
} from '@/lib/utils'
import axios from 'axios'

export function PublicProfilePage() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const [loggedUser, setLoggedUser] = useState<{
    token: string
    name: string
    id: string
  } | null>(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const u = JSON.parse(userStr)
        return { token, name: u.name, id: u.id }
      } catch {
        return null
      }
    }
    return null
  })

  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [completeNotes, setCompleteNotes] = useState('')

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ['equipment-public', id],
    queryFn: () => api.get(`/equipment/${id}/public`).then((r) => r.data),
  })

  const completeMutation = useMutation({
    mutationFn: async ({ recordId, notes }: { recordId: string; notes: string }) => {
      return axios.post(
        `/api/equipment/${id}/records/${recordId}/complete`,
        { notes: notes || undefined },
        { headers: { Authorization: `Bearer ${loggedUser!.token}` } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-public', id] })
      setCompleteDialogOpen(false)
      setSelectedRecord(null)
      setCompleteNotes('')
    },
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await api.post('/auth/login', {
        email: loginEmail,
        password: loginPassword,
      })
      const { token, user } = res.data

      if (user.role !== 'ADMIN' && user.role !== 'TECHNICIAN') {
        setLoginError('Apenas técnicos e administradores podem completar ordens.')
        setLoginLoading(false)
        return
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      setLoggedUser({ token, name: user.name, id: user.id })
      setLoginDialogOpen(false)
      setLoginEmail('')
      setLoginPassword('')
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Credenciais inválidas')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleStartComplete = (record: any) => {
    if (!loggedUser) {
      setLoginDialogOpen(true)
      setSelectedRecord(record)
      return
    }
    setSelectedRecord(record)
    setCompleteDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !equipment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Equipamento não encontrado</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Verifique se o QR Code está correto ou entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const openRecords = equipment.maintenanceRecords || []
  const overdueRecords = openRecords.filter(
    (r: any) => new Date(r.scheduledDate) < new Date()
  )
  const upcomingRecords = openRecords.filter(
    (r: any) => new Date(r.scheduledDate) >= new Date()
  )

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <AirVent className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">{equipment.tag}</h1>
              <p className="text-sm opacity-90">
                {equipment.brand} {equipment.model}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              'text-xs',
              equipment.status === 'OPERATIONAL'
                ? 'bg-green-500 text-white'
                : equipment.status === 'NEEDS_MAINTENANCE'
                  ? 'bg-yellow-500 text-black'
                  : equipment.status === 'BROKEN'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
            )}
          >
            {translateStatus(equipment.status)}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4 -mt-2">
        {/* Equipment info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{equipment.unit?.name}</p>
                {equipment.unit?.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {equipment.unit.address}
                    {equipment.unit.city && `, ${equipment.unit.city}`}
                    {equipment.unit.state && ` - ${equipment.unit.state}`}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {equipment.location && (
                <div>
                  <span className="text-muted-foreground">Local:</span>
                  <p className="font-medium">{equipment.location}</p>
                </div>
              )}
              {equipment.btuCapacity && (
                <div>
                  <span className="text-muted-foreground">BTU:</span>
                  <p className="font-medium">{equipment.btuCapacity.toLocaleString()}</p>
                </div>
              )}
              {equipment.type && (
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{equipment.type}</p>
                </div>
              )}
              {equipment.serialNumber && (
                <div>
                  <span className="text-muted-foreground">Nº Série:</span>
                  <p className="font-medium">{equipment.serialNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overdue orders - highlighted */}
        {overdueRecords.length > 0 && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                Ordens Atrasadas ({overdueRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {overdueRecords.map((record: any) => (
                  <div
                    key={record.id}
                    className="bg-white rounded-lg p-3 border border-red-200"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{record.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={statusColor(record.type)}>
                            {translateType(record.type)}
                          </Badge>
                          <span className="text-xs text-red-600 font-medium">
                            Vencida: {formatDate(record.scheduledDate)}
                          </span>
                        </div>
                        {record.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 shrink-0"
                        onClick={() => handleStartComplete(record)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming orders */}
        {upcomingRecords.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Ordens Agendadas ({upcomingRecords.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {upcomingRecords.map((record: any) => (
                  <div
                    key={record.id}
                    className="bg-muted/50 rounded-lg p-3 border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{record.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={statusColor(record.type)}>
                            {translateType(record.type)}
                          </Badge>
                          <Badge className={statusColor(record.status)}>
                            {translateStatus(record.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(record.scheduledDate)}
                          </span>
                        </div>
                        {record.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.description}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleStartComplete(record)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Concluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No orders */}
        {openRecords.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium">Nenhuma ordem de serviço aberta</p>
              <p className="text-sm text-muted-foreground mt-1">
                Este equipamento está em dia com as manutenções.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Maintenance plans info */}
        {equipment.maintenancePlans?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-muted-foreground" />
                Planos de Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {equipment.maintenancePlans.map((plan: any) => (
                  <div key={plan.id} className="text-sm flex items-center justify-between py-1">
                    <div>
                      <span className="font-medium">{plan.title}</span>
                      <span className="text-muted-foreground ml-2">
                        ({translateType(plan.type)}, a cada {plan.intervalDays} dias)
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Próxima: {formatDate(plan.nextDueDate)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logged in status */}
        <div className="text-center text-xs text-muted-foreground pt-2 pb-4">
          {loggedUser ? (
            <p>
              Logado como <strong>{loggedUser.name}</strong>
              {' '}
              <button
                className="underline"
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  setLoggedUser(null)
                }}
              >
                Sair
              </button>
            </p>
          ) : (
            <button
              className="inline-flex items-center gap-1 underline"
              onClick={() => setLoginDialogOpen(true)}
            >
              <LogIn className="h-3 w-3" />
              Entrar para registrar manutenção
            </button>
          )}
        </div>
      </div>

      {/* Login dialog */}
      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Identificação do Técnico</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleLogin} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Entre com suas credenciais para registrar a conclusão da manutenção.
          </p>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Sua senha"
              required
            />
          </div>
          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Dialog>

      {/* Complete dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Concluir Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {selectedRecord && (
            <div className="bg-muted rounded-lg p-3">
              <p className="font-medium">{selectedRecord.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={statusColor(selectedRecord.type)}>
                  {translateType(selectedRecord.type)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Agendado: {formatDate(selectedRecord.scheduledDate)}
                </span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Observações da execução (opcional)</Label>
            <Textarea
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
              placeholder="Descreva o que foi feito, peças trocadas, observações..."
              rows={4}
            />
          </div>
          {completeMutation.isError && (
            <p className="text-sm text-destructive">
              Erro ao concluir. Tente novamente.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCompleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedRecord) {
                  completeMutation.mutate({
                    recordId: selectedRecord.id,
                    notes: completeNotes,
                  })
                }
              }}
              disabled={completeMutation.isPending}
            >
              {completeMutation.isPending ? 'Concluindo...' : 'Confirmar Conclusão'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
