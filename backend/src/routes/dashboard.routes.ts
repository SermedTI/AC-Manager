import { Router } from 'express'
import * as dashboardController from '../controllers/dashboard.controller'
import { requireAuth } from '../middleware/auth'

export const dashboardRoutes = Router()

dashboardRoutes.use(requireAuth)

dashboardRoutes.get('/stats', dashboardController.stats)
dashboardRoutes.get('/recent-activity', dashboardController.recentActivity)
