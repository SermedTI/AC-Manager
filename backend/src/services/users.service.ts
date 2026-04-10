import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'

export async function listUsers(page: number, limit: number, search?: string) {
  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role?: string
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existing) {
    throw Object.assign(new Error('E-mail já cadastrado'), { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: (data.role as any) || 'VIEWER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!user) {
    throw Object.assign(new Error('Usuário não encontrado'), { status: 404 })
  }
  return user
}

export async function updateUser(
  id: string,
  data: { name?: string; role?: string; active?: boolean; password?: string }
) {
  const updateData: any = { ...data }
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12)
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}
