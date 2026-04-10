import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { translateStatus, translateType, statusColor } from '@/lib/utils'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function MaintenanceCalendarPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const { data: records } = useQuery({
    queryKey: ['maintenance-calendar', month, year],
    queryFn: () =>
      api.get('/maintenance/calendar', { params: { month, year } }).then((r) => r.data),
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1) }
    else setMonth(month - 1)
    setSelectedDay(null)
  }

  const next = () => {
    if (month === 12) { setMonth(1); setYear(year + 1) }
    else setMonth(month + 1)
    setSelectedDay(null)
  }

  // Group records by day
  const recordsByDay: Record<number, any[]> = {}
  records?.forEach((r: any) => {
    const day = new Date(r.scheduledDate).getDate()
    if (!recordsByDay[day]) recordsByDay[day] = []
    recordsByDay[day].push(r)
  })

  const selectedRecords = selectedDay ? recordsByDay[selectedDay] || [] : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendário de Manutenções</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle>
              {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={next}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayRecords = recordsByDay[day] || []
              const hasCompleted = dayRecords.some((r: any) => r.status === 'COMPLETED')
              const hasScheduled = dayRecords.some(
                (r: any) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS'
              )
              const isOverdue = dayRecords.some(
                (r: any) =>
                  (r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS') &&
                  new Date(r.scheduledDate) < now
              )
              const isToday =
                day === now.getDate() &&
                month === now.getMonth() + 1 &&
                year === now.getFullYear()

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`relative p-2 text-sm rounded-md transition-colors min-h-[48px] ${
                    selectedDay === day
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                        ? 'bg-accent font-bold'
                        : 'hover:bg-muted'
                  }`}
                >
                  {day}
                  {dayRecords.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-1">
                      {isOverdue && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      {hasScheduled && !isOverdue && (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                      {hasCompleted && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Agendado
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Concluído
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Atrasado
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected day records */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDay} de {MONTH_NAMES[month - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma manutenção neste dia.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedRecords.map((record: any) => (
                  <Link
                    key={record.id}
                    to={`/equipment/${record.equipmentId}`}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{record.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.equipment?.tag}
                        {record.performedBy && ` - ${record.performedBy.name}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusColor(record.type)}>
                        {translateType(record.type)}
                      </Badge>
                      <Badge className={statusColor(record.status)}>
                        {translateStatus(record.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
