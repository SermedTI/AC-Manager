import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { requireAuth, requireRole } from '../middleware/auth'

export const authRoutes = Router()

authRoutes.post('/register', requireAuth, requireRole('ADMIN'), authController.register)
authRoutes.post('/login', authController.login)
authRoutes.get('/me', requireAuth, authController.me)
