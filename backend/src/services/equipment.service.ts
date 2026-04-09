import prisma from '../lib/prisma'
import { generateQRCode } from './qrcode.service'

interface CreateEquipmentData {
  tag: string
  brand: string
  model: string
  serialNumber?: string
  btuCapacity?: number
  type?: string
  installDate?: string
  location?: string
  notes?: string
  unitId: string
  createdById?: string
}

export async function listEquipment(
  page: number,
  limit: number,
  filters: {
    search?: string
    unitId?: string
    status?: string
  }
) {
  const where: any = { active: true }

  if (filters.search) {
    where.OR = [
      { tag: { contains: filters.search, mode: 'insensitive' } },
      { brand: { contains: filters.search, mode: 'insensitive' } },
      { model: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.unitId) {
    where.unitId = filters.unitId
  }

  if (filters.status) {
    where.status = filters.status
  }

  const [data, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        unit: { select: { id: true, name: true } },
      },
      orderBy: { tag: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.equipment.count({ where }),
  ])

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getEquipmentById(id: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    include: {
      unit: true,
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      maintenancePlans: {
        where: { active: true },
        orderBy: { nextDueDate: 'asc' },
      },
      maintenanceRecords: {
        orderBy: { scheduledDate: 'desc' },
        take: 20,
        include: {
          performedBy: { select: { id: true, name: true } },
        },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!equipment) {
    throw Object.assign(new Error('Equipamento não encontrado'), {
      status: 404,
    })
  }

  return equipment
}

export async function getEquipmentPublic(id: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    select: {
      id: true,
      tag: true,
      brand: true,
      model: true,
      serialNumber: true,
      btuCapacity: true,
      type: true,
      installDate: true,
      location: true,
      status: true,
      qrCodeUrl: true,
      unit: { select: { id: true, name: true, address: true, city: true, state: true } },
      maintenanceRecords: {
        where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
        orderBy: { scheduledDate: 'asc' },
        include: {
          performedBy: { select: { id: true, name: true } },
        },
      },
      maintenancePlans: {
        where: { active: true },
        select: { id: true, title: true, type: true, intervalDays: true, nextDueDate: true },
      },
    },
  })

  if (!equipment) {
    throw Object.assign(new Error('Equipamento não encontrado'), { status: 404 })
  }

  return equipment
}

export async function createEquipment(data: CreateEquipmentData) {
  const existing = await prisma.equipment.findUnique({
    where: { tag: data.tag },
  })
  if (existing) {
    throw Object.assign(new Error('Tag já existe'), { status: 409 })
  }

  const equipment = await prisma.equipment.create({
    data: {
      tag: data.tag,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      btuCapacity: data.btuCapacity,
      type: data.type,
      installDate: data.installDate ? new Date(data.installDate) : undefined,
      location: data.location,
      notes: data.notes,
      unitId: data.unitId,
      createdById: data.createdById,
    },
  })

  // Generate QR code
  const qrCodeUrl = await generateQRCode(equipment.id, equipment.tag)
  return prisma.equipment.update({
    where: { id: equipment.id },
    data: { qrCodeUrl },
    include: { unit: { select: { id: true, name: true } } },
  })
}

export async function updateEquipment(
  id: string,
  data: {
    brand?: string
    model?: string
    serialNumber?: string
    btuCapacity?: number
    type?: string
    installDate?: string
    location?: string
    status?: string
    notes?: string
    unitId?: string
  }
) {
  const updateData: any = { ...data }
  if (data.installDate) {
    updateData.installDate = new Date(data.installDate)
  }

  return prisma.equipment.update({
    where: { id },
    data: updateData,
    include: { unit: { select: { id: true, name: true } } },
  })
}

export async function updateEquipmentStatus(id: string, status: string) {
  return prisma.equipment.update({
    where: { id },
    data: { status: status as any },
  })
}

export async function deleteEquipment(id: string) {
  return prisma.equipment.update({
    where: { id },
    data: { active: false },
  })
}
