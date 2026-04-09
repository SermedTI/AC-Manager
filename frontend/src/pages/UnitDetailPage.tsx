import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AirVent, MapPin } from 'lucide-react'
import { translateStatus, statusColor } from '@/lib/utils'

export function UnitDetailPage() {
  const { id } = useParams()

  const { data: unit, isLoading } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => api.get(`/units/${id}`).then((r) => r.data),
  })

  const { data: equipmentData } = useQuery({
    queryKey: ['equipment', { unitId: id }],
    queryFn: () =>
      api.get('/equipment', { params: { unitId: id, limit: 100 } }).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!unit) {
    return <p className="text-center text-muted-foreground py-12">Unidade não encontrada.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/units">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{unit.name}</h1>
          {unit.address && (
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {unit.address}
              {unit.city && `, ${unit.city}`}
              {unit.state && ` - ${unit.state}`}
            </p>
          )}
        </div>
      </div>

      {unit.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm">{unit.notes}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          Equipamentos ({equipmentData?.data?.length ?? 0})
        </h2>

        {!equipmentData?.data?.length ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum equipamento nesta unidade.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equipmentData.data.map((eq: any) => (
              <Link key={eq.id} to={`/equipment/${eq.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AirVent className="h-6 w-6 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-semibold">{eq.tag}</h3>
                          <p className="text-sm text-muted-foreground">
                            {eq.brand} {eq.model}
                          </p>
                          {eq.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {eq.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={statusColor(eq.status)}>
                        {translateStatus(eq.status)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
