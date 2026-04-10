import type {
  Role,
  EquipmentStatus,
  MaintenanceType,
  MaintenanceStatus,
} from './enums'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Unit {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: { equipment: number }
}

export interface Equipment {
  id: string
  tag: string
  brand: string
  model: string
  serialNumber: string | null
  btuCapacity: number | null
  type: string | null
  installDate: string | null
  location: string | null
  status: EquipmentStatus
  qrCodeUrl: string | null
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  unitId: string
  unit?: Unit
  maintenancePlans?: MaintenancePlan[]
  maintenanceRecords?: MaintenanceRecord[]
  attachments?: Attachment[]
}

export interface MaintenancePlan {
  id: string
  title: string
  description: string | null
  type: MaintenanceType
  intervalDays: number
  nextDueDate: string
  active: boolean
  createdAt: string
  updatedAt: string
  equipmentId: string
}

export interface MaintenanceRecord {
  id: string
  title: string
  description: string | null
  type: MaintenanceType
  status: MaintenanceStatus
  scheduledDate: string
  completedDate: string | null
  cost: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  equipmentId: string
  performedById: string | null
  requestedById: string | null
  planId: string | null
  performedBy?: User
  requestedBy?: User
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt: string
  equipmentId: string | null
  maintenanceRecordId: string | null
}

export interface DashboardStats {
  totalEquipment: number
  operational: number
  needsMaintenance: number
  broken: number
  deactivated: number
  totalUnits: number
  overdueCount: number
  upcomingCount: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}
