import cron from 'node-cron'
import prisma from '../lib/prisma'

export function startMaintenanceAlerts() {
  // Run daily at 8 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Verificando manutenções vencidas...')
    try {
      const now = new Date()

      // Find overdue scheduled records and update equipment status
      const overdueRecords = await prisma.maintenanceRecord.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledDate: { lt: now },
        },
        select: { equipmentId: true },
      })

      const equipmentIds = [
        ...new Set(overdueRecords.map((r) => r.equipmentId)),
      ]

      if (equipmentIds.length > 0) {
        await prisma.equipment.updateMany({
          where: {
            id: { in: equipmentIds },
            status: 'OPERATIONAL',
          },
          data: { status: 'NEEDS_MAINTENANCE' },
        })
        console.log(
          `[Cron] ${equipmentIds.length} equipamento(s) marcado(s) como "Necessita Manutenção"`
        )
      }

      // Check plans that need new records
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(now.getDate() + 7)

      const plans = await prisma.maintenancePlan.findMany({
        where: {
          active: true,
          nextDueDate: { lte: sevenDaysFromNow },
        },
      })

      for (const plan of plans) {
        // Check if a record already exists for this plan's next due date
        const existingRecord = await prisma.maintenanceRecord.findFirst({
          where: {
            planId: plan.id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        })

        if (!existingRecord) {
          await prisma.maintenanceRecord.create({
            data: {
              title: plan.title,
              description: plan.description,
              type: plan.type,
              scheduledDate: plan.nextDueDate,
              equipmentId: plan.equipmentId,
              planId: plan.id,
            },
          })
          console.log(
            `[Cron] Registro criado para plano "${plan.title}" (${plan.id})`
          )
        }
      }
    } catch (err) {
      console.error('[Cron] Erro ao processar alertas:', err)
    }
  })

  console.log('📅 Cron de alertas de manutenção ativado (diário às 8h)')
}
