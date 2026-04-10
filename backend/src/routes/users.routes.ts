import { Router } from 'express'
import * as usersController from '../controllers/users.controller'
import { requireAuth, requireRole } from '../middleware/auth'

export const usersRoutes = Router()

usersRoutes.use(requireAuth, requireRole('ADMIN'))

usersRoutes.get('/', usersController.list)
usersRoutes.post('/', usersController.create)
usersRoutes.get('/:id', usersController.getById)
usersRoutes.patch('/:id', usersController.update)
