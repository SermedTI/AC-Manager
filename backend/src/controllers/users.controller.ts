import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as usersService from '../services/users.service'

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'REQUESTER', 'VIEWER']).optional(),
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'REQUESTER', 'VIEWER']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body)
    const user = await usersService.createUser(data)
    res.status(201).json(user)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string | undefined
    const result = await usersService.listUsers(page, limit, search)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await usersService.getUserById(req.params.id)
    res.json(user)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSchema.parse(req.body)
    const user = await usersService.updateUser(req.params.id, data)
    res.json(user)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}
