import { Router } from 'express'
import * as attachmentsController from '../controllers/attachments.controller'
import { requireAuth, requireRole } from '../middleware/auth'
import { upload } from '../middleware/upload'

export const attachmentsRoutes = Router()

attachmentsRoutes.use(requireAuth)

attachmentsRoutes.post(
  '/',
  requireRole('ADMIN', 'TECHNICIAN'),
  upload.single('file'),
  attachmentsController.uploadAttachment
)

attachmentsRoutes.delete(
  '/:id',
  requireRole('ADMIN', 'TECHNICIAN'),
  attachmentsController.deleteAttachment
)
