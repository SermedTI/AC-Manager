import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR')
}

export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    OPERATIONAL: 'Operacional',
    NEEDS_MAINTENANCE: 'Necessita Manutenção',
    BROKEN: 'Quebrado',
    DEACTIVATED: 'Desativado',
    SCHEDULED: 'Agendado',
    IN_PROGRESS: 'Em Andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
  }
  return map[status] || status
}

export function translateType(type: string): string {
  const map: Record<string, string> = {
    PREVENTIVE: 'Preventiva',
    CORRECTIVE: 'Corretiva',
    CLEANING: 'Limpeza',
  }
  return map[type] || type
}

export function translateRole(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Administrador',
    TECHNICIAN: 'Técnico',
    REQUESTER: 'Solicitante',
    VIEWER: 'Visualizador',
  }
  return map[role] || role
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    OPERATIONAL: 'bg-green-100 text-green-800',
    NEEDS_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    BROKEN: 'bg-red-100 text-red-800',
    DEACTIVATED: 'bg-gray-100 text-gray-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}
