import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

async function generateQR(equipmentId: string, tag: string): Promise<string> {
  const url = `${FRONTEND_URL}/p/${equipmentId}`
  const dir = path.resolve(UPLOAD_DIR, 'qrcodes')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const filePath = path.resolve(dir, `${tag}.png`)
  await QRCode.toFile(filePath, url, { width: 300, margin: 2 })
  return `/uploads/qrcodes/${tag}.png`
}

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acmanager.com' },
    update: {},
    create: {
      email: 'admin@acmanager.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const technician = await prisma.user.upsert({
    where: { email: 'tecnico@acmanager.com' },
    update: {},
    create: {
      email: 'tecnico@acmanager.com',
      name: 'João Técnico',
      password: hashedPassword,
      role: 'TECHNICIAN',
    },
  })

  // Create sample units
  const unit1 = await prisma.unit.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Sede Principal',
      address: 'Rua Principal, 100',
      city: 'São Paulo',
      state: 'SP',
    },
  })

  const unit2 = await prisma.unit.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Filial Centro',
      address: 'Av. Central, 500',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  })

  // Create sample equipment
  const eq1 = await prisma.equipment.upsert({
    where: { tag: 'AC-001' },
    update: {},
    create: {
      tag: 'AC-001',
      brand: 'Samsung',
      model: 'Wind-Free AR12',
      serialNumber: 'SM-2024-001',
      btuCapacity: 12000,
      type: 'Split',
      location: 'Sala de Reuniões - 2º Andar',
      status: 'OPERATIONAL',
      unitId: unit1.id,
      createdById: admin.id,
    },
  })

  const eq2 = await prisma.equipment.upsert({
    where: { tag: 'AC-002' },
    update: {},
    create: {
      tag: 'AC-002',
      brand: 'LG',
      model: 'Dual Inverter S4-Q18',
      serialNumber: 'LG-2024-002',
      btuCapacity: 18000,
      type: 'Split',
      location: 'Escritório Principal - Térreo',
      status: 'NEEDS_MAINTENANCE',
      unitId: unit1.id,
      createdById: admin.id,
    },
  })

  const eq3 = await prisma.equipment.upsert({
    where: { tag: 'AC-003' },
    update: {},
    create: {
      tag: 'AC-003',
      brand: 'Daikin',
      model: 'FTX35',
      serialNumber: 'DK-2023-003',
      btuCapacity: 9000,
      type: 'Cassette',
      location: 'Recepção',
      status: 'OPERATIONAL',
      unitId: unit2.id,
      createdById: admin.id,
    },
  })

  // Generate QR codes for all equipment
  for (const eq of [eq1, eq2, eq3]) {
    const qrCodeUrl = await generateQR(eq.id, eq.tag)
    await prisma.equipment.update({
      where: { id: eq.id },
      data: { qrCodeUrl },
    })
    console.log(`QR Code gerado: ${eq.tag} -> ${qrCodeUrl}`)
  }

  console.log('Seed concluído com sucesso!')
  console.log(`Admin: admin@acmanager.com / admin123`)
  console.log(`Técnico: tecnico@acmanager.com / admin123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
