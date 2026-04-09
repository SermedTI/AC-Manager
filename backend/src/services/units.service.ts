import prisma from '../lib/prisma'

export async function listUnits(
  page: number,
  limit: number,
  search?: string
) {
  const where: any = { active: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.unit.findMany({
      where,
      include: { _count: { select: { equipment: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.unit.count({ where }),
  ])

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getUnitById(id: string) {
  const unit = await prisma.unit.findUnique({
    where: { id },
    include: { _count: { select: { equipment: true } } },
  })
  if (!unit) {
    throw Object.assign(new Error('Unidade não encontrada'), { status: 404 })
  }
  return unit
}

export async function createUnit(data: {
  name: string
  address?: string
  city?: string
  state?: string
  notes?: string
}) {
  return prisma.unit.create({ data })
}

export async function updateUnit(
  id: string,
  data: {
    name?: string
    address?: string
    city?: string
    state?: string
    notes?: string
  }
) {
  return prisma.unit.update({ where: { id }, data })
}

export async function deleteUnit(id: string) {
  return prisma.unit.update({
    where: { id },
    data: { active: false },
  })
}
