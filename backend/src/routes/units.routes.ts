import { Router } from 'express'
import * as unitsController from '../controllers/units.controller'
import { requireAuth, requireRole } from '../middleware/auth'

export const unitsRoutes = Router()

unitsRoutes.use(requireAuth)

unitsRoutes.get('/', unitsController.list)
unitsRoutes.get('/:id', unitsController.getById)
unitsRoutes.post('/', requireRole('ADMIN', 'TECHNICIAN'), unitsController.create)
unitsRoutes.patch('/:id', requireRole('ADMIN', 'TECHNICIAN'), unitsController.update)
unitsRoutes.delete('/:id', requireRole('ADMIN'), unitsController.remove)
