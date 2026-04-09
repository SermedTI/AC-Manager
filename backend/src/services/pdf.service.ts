import PDFDocument from 'pdfkit'
import prisma from '../lib/prisma'

export async function generateEquipmentReport(
  equipmentId: string
): Promise<Buffer> {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
    include: {
      unit: true,
      maintenanceRecords: {
        orderBy: { scheduledDate: 'desc' },
        include: {
          performedBy: { select: { name: true } },
        },
      },
      maintenancePlans: { where: { active: true } },
    },
  })

  if (!equipment) {
    throw Object.assign(new Error('Equipamento não encontrado'), {
      status: 404,
    })
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Title
    doc.fontSize(20).text('Prontuário do Equipamento', { align: 'center' })
    doc.moveDown()

    // Equipment info
    doc.fontSize(14).text('Informações do Equipamento', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Tag: ${equipment.tag}`)
    doc.text(`Marca: ${equipment.brand}`)
    doc.text(`Modelo: ${equipment.model}`)
    doc.text(`Número de Série: ${equipment.serialNumber || 'N/A'}`)
    doc.text(`Capacidade BTU: ${equipment.btuCapacity || 'N/A'}`)
    doc.text(`Tipo: ${equipment.type || 'N/A'}`)
    doc.text(
      `Data de Instalação: ${equipment.installDate ? equipment.installDate.toLocaleDateString('pt-BR') : 'N/A'}`
    )
    doc.text(`Localização: ${equipment.location || 'N/A'}`)
    doc.text(`Status: ${translateStatus(equipment.status)}`)
    doc.moveDown()

    // Unit info
    doc.fontSize(14).text('Unidade', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)
    doc.text(`Nome: ${equipment.unit.name}`)
    doc.text(`Endereço: ${equipment.unit.address || 'N/A'}`)
    doc.text(
      `Cidade/Estado: ${equipment.unit.city || ''}${equipment.unit.state ? ' - ' + equipment.unit.state : ''}`
    )
    doc.moveDown()

    // Maintenance Plans
    if (equipment.maintenancePlans.length > 0) {
      doc.fontSize(14).text('Planos de Manutenção Ativos', { underline: true })
      doc.moveDown(0.5)
      doc.fontSize(10)
      for (const plan of equipment.maintenancePlans) {
        doc.text(
          `• ${plan.title} - ${translateType(plan.type)} a cada ${plan.intervalDays} dias (próxima: ${plan.nextDueDate.toLocaleDateString('pt-BR')})`
        )
      }
      doc.moveDown()
    }

    // Maintenance History
    doc.fontSize(14).text('Histórico de Manutenções', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10)

    if (equipment.maintenanceRecords.length === 0) {
      doc.text('Nenhum registro de manutenção.')
    } else {
      for (const record of equipment.maintenanceRecords) {
        doc.text(
          `${record.scheduledDate.toLocaleDateString('pt-BR')} - ${record.title} [${translateStatus(record.status)}]`
        )
        if (record.performedBy) {
          doc.text(`  Técnico: ${record.performedBy.name}`)
        }
        if (record.notes) {
          doc.text(`  Obs: ${record.notes}`)
        }
        doc.moveDown(0.3)
      }
    }

    // Footer
    doc.moveDown()
    doc
      .fontSize(8)
      .text(
        `Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        { align: 'center' }
      )

    doc.end()
  })
}

function translateStatus(status: string): string {
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

function translateType(type: string): string {
  const map: Record<string, string> = {
    PREVENTIVE: 'Preventiva',
    CORRECTIVE: 'Corretiva',
    CLEANING: 'Limpeza',
  }
  return map[type] || type
}
