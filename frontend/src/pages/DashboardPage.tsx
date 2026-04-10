import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import {
  AirVent,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Clock,
} from 'lucide-react'
import {
  formatDate,
  translateStatus,
  translateType,
  statusColor,
} from '@/lib/utils'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/dashboard/recent-activity').then((r) => r.data),
  })

  const { data: overdue } = useQuery({
    queryKey: ['maintenance-overdue'],
    queryFn: () => api.get('/maintenance/overdue').then((r) => r.data),
  })

  const pieData = stats
    ? [
        { name: 'Operacional', value: stats.operational, color: '#22c55e' },
        { name: 'Necessita Manutenção', value: stats.needsMaintenance, color: '#eab308' },
        { name: 'Quebrado', value: stats.broken, color: '#ef4444' },
        { name: 'Desativado', value: stats.deactivated, color: '#9ca3af' },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AirVent className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalEquipment ?? '-'}</p>
              <p className="text-xs text-muted-foreground">Total Equipamentos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.operational ?? '-'}</p>
              <p className="text-xs text-muted-foreground">Operacionais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.overdueCount ?? '-'}</p>
              <p className="text-xs text-muted-foreground">Manutenções Atrasadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.totalUnits ?? '-'}</p>
              <p className="text-xs text-muted-foreground">Unidades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status dos Equipamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              Manutenções Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!overdue || overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma manutenção atrasada!
              </p>
            ) : (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {overdue.slice(0, 10).map((record: any) => (
                  <Link
                    key={record.id}
                    to={`/equipment/${record.equipmentId}`}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.equipment?.tag} - {formatDate(record.scheduledDate)}
                      </p>
                    </div>
                    <Badge className={statusColor(record.type)}>
                      {translateType(record.type)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentActivity || recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((record: any) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.equipment?.tag}
                        {record.performedBy && ` - ${record.performedBy.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor(record.status)}>
                      {translateStatus(record.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(record.scheduledDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
