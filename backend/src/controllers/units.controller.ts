import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as unitsService from '../services/units.service'

const createSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
})

const updateSchema = createSchema.partial()

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string | undefined
    const result = await unitsService.listUnits(page, limit, search)
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
    const unit = await unitsService.getUnitById(req.params.id)
    res.json(unit)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body)
    const unit = await unitsService.createUnit(data)
    res.status(201).json(unit)
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
    const unit = await unitsService.updateUnit(req.params.id, data)
    res.json(unit)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await unitsService.deleteUnit(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}
