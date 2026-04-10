import { Request, Response, NextFunction } from 'express'
import * as dashboardService from '../services/dashboard.service'

export async function stats(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getStats()
    res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function recentActivity(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await dashboardService.getRecentActivity()
    res.json(data)
  } catch (err) {
    next(err)
  }
}
