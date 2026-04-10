import prisma from '../lib/prisma'

// ── Maintenance Records ──

export async function listRecords(
  page: number,
  limit: number,
  filters: {
    equipmentId?: string
    status?: string
    type?: string
    startDate?: string
    endDate?: string
    requestedById?: string
    performedById?: string
    unassigned?: boolean
  }
) {
  const where: any = {}

  if (filters.equipmentId) where.equipmentId = filters.equipmentId
  if (filters.status) where.status = filters.status
  if (filters.type) where.type = filters.type
  if (filters.requestedById) where.requestedById = filters.requestedById
  if (filters.performedById) where.performedById = filters.performedById
  if (filters.unassigned) where.performedById = null
  if (filters.startDate || filters.endDate) {
    where.scheduledDate = {}
    if (filters.startDate)
      where.scheduledDate.gte = new Date(filters.startDate)
    if (filters.endDate) where.scheduledDate.lte = new Date(filters.endDate)
  }

  const [data, total] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      where,
      include: {
        equipment: { select: { id: true, tag: true, brand: true, model: true } },
        performedBy: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenanceRecord.count({ where }),
  ])

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getRecordById(id: string) {
  const record = await prisma.maintenanceRecord.findUnique({
    where: { id },
    include: {
      equipment: { select: { id: true, tag: true, brand: true, model: true } },
      performedBy: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
      plan: true,
      attachments: true,
    },
  })
  if (!record) {
    throw Object.assign(new Error('Registro não encontrado'), { status: 404 })
  }
  return record
}

export async function createRecord(data: {
  title: string
  description?: string
  type: string
  scheduledDate: string
  equipmentId: string
  performedById?: string
  requestedById?: string
  planId?: string
}) {
  return prisma.maintenanceRecord.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type as any,
      scheduledDate: new Date(data.scheduledDate),
      equipmentId: data.equipmentId,
      performedById: data.performedById,
      requestedById: data.requestedById,
      planId: data.planId,
    },
    include: {
      equipment: { select: { id: true, tag: true } },
      performedBy: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })
}

export async function updateRecord(
  id: string,
  data: {
    title?: string
    description?: string
    status?: string
    scheduledDate?: string
    completedDate?: string
    cost?: number
    notes?: string
    performedById?: string
  }
) {
  const updateData: any = { ...data }

  if (data.scheduledDate)
    updateData.scheduledDate = new Date(data.scheduledDate)
  if (data.completedDate)
    updateData.completedDate = new Date(data.completedDate)

  // If completing, set completedDate automatically
  if (data.status === 'COMPLETED' && !data.completedDate) {
    updateData.completedDate = new Date()
  }

  const record = await prisma.maintenanceRecord.update({
    where: { id },
    data: updateData,
    include: {
      equipment: true,
      plan: true,
    },
  })

  // If completed and linked to a plan, advance the plan
  if (data.status === 'COMPLETED' && record.planId) {
    await advancePlan(record.planId, record.completedDate || new Date())
  }

  // Update equipment status when maintenance is completed
  if (data.status === 'COMPLETED') {
    const hasOtherPending = await prisma.maintenanceRecord.count({
      where: {
        equipmentId: record.equipmentId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { lt: new Date() },
        id: { not: id },
      },
    })

    if (hasOtherPending === 0) {
      await prisma.equipment.update({
        where: { id: record.equipmentId },
        data: { status: 'OPERATIONAL' },
      })
    }
  }

  return record
}

export async function claimRecord(id: string, userId: string) {
  const record = await prisma.maintenanceRecord.findUnique({ where: { id } })

  if (!record) {
    throw Object.assign(new Error('Registro não encontrado'), { status: 404 })
  }

  if (record.performedById) {
    throw Object.assign(new Error('Esta OS já foi assumida por outro técnico'), { status: 409 })
  }

  return prisma.maintenanceRecord.update({
    where: { id },
    data: { performedById: userId },
    include: {
      equipment: { select: { id: true, tag: true, brand: true, model: true } },
      performedBy: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  })
}

// ── Maintenance Plans ──

export async function listPlans(
  page: number,
  limit: number,
  equipmentId?: string
) {
  const where: any = { active: true }
  if (equipmentId) where.equipmentId = equipmentId

  const [data, total] = await Promise.all([
    prisma.maintenancePlan.findMany({
      where,
      include: {
        equipment: { select: { id: true, tag: true, brand: true, model: true } },
      },
      orderBy: { nextDueDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenancePlan.count({ where }),
  ])

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function createPlan(data: {
  title: string
  description?: string
  type: string
  intervalDays: number
  nextDueDate: string
  equipmentId: string
}) {
  const plan = await prisma.maintenancePlan.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type as any,
      intervalDays: data.intervalDays,
      nextDueDate: new Date(data.nextDueDate),
      equipmentId: data.equipmentId,
    },
  })

  // Auto-create the first scheduled record
  await prisma.maintenanceRecord.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type as any,
      scheduledDate: new Date(data.nextDueDate),
      equipmentId: data.equipmentId,
      planId: plan.id,
    },
  })

  return plan
}

export async function updatePlan(
  id: string,
  data: {
    title?: string
    description?: string
    type?: string
    intervalDays?: number
    nextDueDate?: string
    active?: boolean
  }
) {
  const updateData: any = { ...data }
  if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate)

  return prisma.maintenancePlan.update({
    where: { id },
    data: updateData,
  })
}

export async function deletePlan(id: string) {
  return prisma.maintenancePlan.update({
    where: { id },
    data: { active: false },
  })
}

// ── Calendar ──

export async function getCalendar(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  return prisma.maintenanceRecord.findMany({
    where: {
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      equipment: { select: { id: true, tag: true } },
      performedBy: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 500,
  })
}

// ── Overdue ──

export async function getOverdue() {
  return prisma.maintenanceRecord.findMany({
    where: {
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      scheduledDate: { lt: new Date() },
    },
    include: {
      equipment: {
        select: { id: true, tag: true, brand: true, model: true, unitId: true },
      },
      performedBy: { select: { id: true, name: true } },
      requestedBy: { select: { id: true, name: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 200,
  })
}

// ── Internal ──

async function advancePlan(planId: string, completedDate: Date) {
  const plan = await prisma.maintenancePlan.findUnique({
    where: { id: planId },
  })
  if (!plan || !plan.active) return

  const nextDueDate = new Date(completedDate)
  nextDueDate.setDate(nextDueDate.getDate() + plan.intervalDays)

  await prisma.maintenancePlan.update({
    where: { id: planId },
    data: { nextDueDate },
  })

  // Create next scheduled record
  await prisma.maintenanceRecord.create({
    data: {
      title: plan.title,
      description: plan.description,
      type: plan.type,
      scheduledDate: nextDueDate,
      equipmentId: plan.equipmentId,
      planId: plan.id,
    },
  })
}
