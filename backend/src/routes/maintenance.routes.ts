import { Router } from 'express'
import * as maintenanceController from '../controllers/maintenance.controller'
import { requireAuth, requireRole } from '../middleware/auth'

export const maintenanceRoutes = Router()

maintenanceRoutes.use(requireAuth)

// Records
maintenanceRoutes.get('/records', maintenanceController.listRecords)
maintenanceRoutes.get('/records/:id', maintenanceController.getRecordById)
maintenanceRoutes.post(
  '/records',
  requireRole('ADMIN', 'TECHNICIAN', 'REQUESTER'),
  maintenanceController.createRecord
)
maintenanceRoutes.patch(
  '/records/:id',
  requireRole('ADMIN', 'TECHNICIAN'),
  maintenanceController.updateRecord
)
maintenanceRoutes.patch(
  '/records/:id/claim',
  requireRole('ADMIN', 'TECHNICIAN'),
  maintenanceController.claimRecord
)

// Plans
maintenanceRoutes.get('/plans', maintenanceController.listPlans)
maintenanceRoutes.post(
  '/plans',
  requireRole('ADMIN', 'TECHNICIAN'),
  maintenanceController.createPlan
)
maintenanceRoutes.patch(
  '/plans/:id',
  requireRole('ADMIN', 'TECHNICIAN'),
  maintenanceController.updatePlan
)
maintenanceRoutes.delete(
  '/plans/:id',
  requireRole('ADMIN'),
  maintenanceController.deletePlan
)

// Calendar & Overdue
maintenanceRoutes.get('/calendar', maintenanceController.calendar)
maintenanceRoutes.get('/overdue', maintenanceController.overdue)
