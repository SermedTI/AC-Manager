import { Router } from 'express'
import * as equipmentController from '../controllers/equipment.controller'
import { requireAuth, requireRole } from '../middleware/auth'

export const equipmentRoutes = Router()

// Public endpoints (QR code, PDF report, and public profile for technicians)
equipmentRoutes.get('/:id/public', equipmentController.getPublic)
equipmentRoutes.get('/:id/qrcode', equipmentController.getQRCode)
equipmentRoutes.get('/:id/report', equipmentController.getReport)

// Complete a maintenance record (requires auth - technician logs in inline)
equipmentRoutes.post(
  '/:id/records/:recordId/complete',
  requireAuth,
  requireRole('ADMIN', 'TECHNICIAN'),
  equipmentController.completeRecord
)

// Protected endpoints
equipmentRoutes.use(requireAuth)

equipmentRoutes.get('/', equipmentController.list)
equipmentRoutes.get('/:id', equipmentController.getById)
equipmentRoutes.post(
  '/',
  requireRole('ADMIN', 'TECHNICIAN'),
  equipmentController.create
)
equipmentRoutes.patch(
  '/:id',
  requireRole('ADMIN', 'TECHNICIAN'),
  equipmentController.update
)
equipmentRoutes.delete(
  '/:id',
  requireRole('ADMIN'),
  equipmentController.remove
)
