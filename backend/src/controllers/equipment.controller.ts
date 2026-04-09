import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as equipmentService from '../services/equipment.service'
import { getQRCodeBuffer } from '../services/qrcode.service'
import { generateEquipmentReport } from '../services/pdf.service'

const createSchema = z.object({
  tag: z.string().min(1, 'Tag é obrigatória'),
  brand: z.string().min(1, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  serialNumber: z.string().optional(),
  btuCapacity: z.number().int().positive().optional(),
  type: z.string().optional(),
  installDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  unitId: z.string().uuid('ID da unidade inválido'),
})

const updateSchema = z.object({
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  serialNumber: z.string().optional(),
  btuCapacity: z.number().int().positive().optional(),
  type: z.string().optional(),
  installDate: z.string().optional(),
  location: z.string().optional(),
  status: z
    .enum(['OPERATIONAL', 'NEEDS_MAINTENANCE', 'BROKEN', 'DEACTIVATED'])
    .optional(),
  notes: z.string().optional(),
  unitId: z.string().uuid().optional(),
})

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const filters = {
      search: req.query.search as string | undefined,
      unitId: req.query.unitId as string | undefined,
      status: req.query.status as string | undefined,
    }
    const result = await equipmentService.listEquipment(page, limit, filters)
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
    const equipment = await equipmentService.getEquipmentById(req.params.id)
    res.json(equipment)
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
    const equipment = await equipmentService.createEquipment({
      ...data,
      createdById: req.user!.id,
    })
    res.status(201).json(equipment)
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
    const equipment = await equipmentService.updateEquipment(
      req.params.id,
      data
    )
    res.json(equipment)
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
    await equipmentService.deleteEquipment(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function getQRCode(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const buffer = await getQRCodeBuffer(req.params.id)
    res.set('Content-Type', 'image/png')
    res.set('Content-Disposition', 'inline')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
}

export async function getPublic(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const equipment = await equipmentService.getEquipmentPublic(req.params.id)
    res.json(equipment)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function completeRecord(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { notes } = req.body || {}
    const record = await import('../services/maintenance.service').then((m) =>
      m.updateRecord(req.params.recordId, {
        status: 'COMPLETED',
        notes,
        performedById: req.user!.id,
      })
    )
    res.json(record)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}

export async function getReport(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const buffer = await generateEquipmentReport(req.params.id)
    res.set('Content-Type', 'application/pdf')
    res.set(
      'Content-Disposition',
      `inline; filename="prontuario-${req.params.id}.pdf"`
    )
    res.send(buffer)
  } catch (err: any) {
    if (err.status) {
      res.status(err.status).json({ error: err.message })
      return
    }
    next(err)
  }
}
