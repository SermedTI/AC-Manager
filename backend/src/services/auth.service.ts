import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import { env } from '../config/env'

export async function registerUser(data: {
  name: string
  email: string
  password: string
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  })
  if (existing) {
    throw Object.assign(new Error('E-mail já cadastrado'), { status: 409 })
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
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

  const token = generateToken(user.id, user.email, user.role)

  return { token, user }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.active) {
    throw Object.assign(new Error('Credenciais inválidas'), { status: 401 })
  }

  // Users created via OAuth don't have a password
  if (!user.password) {
    throw Object.assign(new Error('Use o login com Google para esta conta'), { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw Object.assign(new Error('Credenciais inválidas'), { status: 401 })
  }

  const token = generateToken(user.id, user.email, user.role)

  const { password: _, ...userWithoutPassword } = user
  return { token, user: userWithoutPassword }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

function generateToken(id: string, email: string, role: string) {
  return jwt.sign({ id, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  })
}
