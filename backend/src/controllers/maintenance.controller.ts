import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as maintenanceService from '../services/maintenance.service'

const createRecordSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CLEANING']),
  scheduledDate: z.string(),
  equipmentId: z.string().uuid(),
  performedById: z.string().uuid().optional(),
})

const updateRecordSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  performedById: z.string().uuid().optional(),
})

const createPlanSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CLEANING']),
  intervalDays: z.number().int().positive('Intervalo deve ser positivo'),
  nextDueDate: z.string(),
  equipmentId: z.string().uuid(),
})

const updatePlanSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'CLEANING']).optional(),
  intervalDays: z.number().int().positive().optional(),
  nextDueDate: z.string().optional(),
  active: z.boolean().optional(),
})

// Records
export async function listRecords(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const filters = {
      equipmentId: req.query.equipmentId as string | undefined,
      status: req.query.status as string | undefined,
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      requestedById: req.query.requestedById as string | undefined,
      performedById: req.query.performedById as string | undefined,
      unassigned: req.query.unassigned === 'true' ? true : undefined,
    }
    const result = await maintenanceService.listRecords(page, limit, filters)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getRecordById(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await maintenanceService.getRecordById(req.params.id)
    res.json(record)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function createRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createRecordSchema.parse(req.body)
    const record = await maintenanceService.createRecord({
      ...data,
      requestedById: req.user!.id,
    })
    res.status(201).json(record)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function updateRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateRecordSchema.parse(req.body)
    const record = await maintenanceService.updateRecord(req.params.id, data)
    res.json(record)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function claimRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await maintenanceService.claimRecord(req.params.id, req.user!.id)
    res.json(record)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

// Plans
export async function listPlans(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const equipmentId = req.query.equipmentId as string | undefined
    const result = await maintenanceService.listPlans(page, limit, equipmentId)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function createPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPlanSchema.parse(req.body)
    const plan = await maintenanceService.createPlan(data)
    res.status(201).json(plan)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updatePlanSchema.parse(req.body)
    const plan = await maintenanceService.updatePlan(req.params.id, data)
    res.json(plan)
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction) {
  try {
    await maintenanceService.deletePlan(req.params.id)
    res.status(204).send()
  } catch (err: any) {
    if (err.status) { res.status(err.status).json({ error: err.message }); return }
    next(err)
  }
}

// Calendar
export async function calendar(req: Request, res: Response, next: NextFunction) {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1
    const year = parseInt(req.query.year as string) || new Date().getFullYear()
    const data = await maintenanceService.getCalendar(month, year)
    res.json(data)
  } catch (err) {
    next(err)
  }
}

// Overdue
export async function overdue(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await maintenanceService.getOverdue()
    res.json(data)
  } catch (err) {
    next(err)
  }
}
