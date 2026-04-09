import prisma from '../lib/prisma'

export async function getStats() {
  const now = new Date()
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(now.getDate() + 7)

  const [
    totalEquipment,
    operational,
    needsMaintenance,
    broken,
    deactivated,
    totalUnits,
    overdueCount,
    upcomingCount,
  ] = await Promise.all([
    prisma.equipment.count({ where: { active: true } }),
    prisma.equipment.count({
      where: { active: true, status: 'OPERATIONAL' },
    }),
    prisma.equipment.count({
      where: { active: true, status: 'NEEDS_MAINTENANCE' },
    }),
    prisma.equipment.count({
      where: { active: true, status: 'BROKEN' },
    }),
    prisma.equipment.count({
      where: { active: true, status: 'DEACTIVATED' },
    }),
    prisma.unit.count({ where: { active: true } }),
    prisma.maintenanceRecord.count({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledDate: { lt: now },
      },
    }),
    prisma.maintenanceRecord.count({
      where: {
        status: 'SCHEDULED',
        scheduledDate: { gte: now, lte: sevenDaysFromNow },
      },
    }),
  ])

  return {
    totalEquipment,
    operational,
    needsMaintenance,
    broken,
    deactivated,
    totalUnits,
    overdueCount,
    upcomingCount,
  }
}

export async function getRecentActivity() {
  return prisma.maintenanceRecord.findMany({
    take: 10,
    orderBy: { updatedAt: 'desc' },
    include: {
      equipment: { select: { id: true, tag: true } },
      performedBy: { select: { id: true, name: true } },
    },
  })
}
