import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import prisma from '../lib/prisma'

export interface AuthPayload {
  id: string
  email: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' })
    return
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, active: true },
    })

    if (!user || !user.active) {
      res.status(401).json({ error: 'Usuário inativo ou não encontrado' })
      return
    }

    req.user = { id: user.id, email: user.email, role: user.role }
    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Sem permissão para esta ação' })
      return
    }
    next()
  }
}
