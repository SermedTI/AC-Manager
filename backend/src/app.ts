import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './routes/auth.routes'
import { usersRoutes } from './routes/users.routes'
import { unitsRoutes } from './routes/units.routes'
import { equipmentRoutes } from './routes/equipment.routes'
import { maintenanceRoutes } from './routes/maintenance.routes'
import { attachmentsRoutes } from './routes/attachments.routes'
import { dashboardRoutes } from './routes/dashboard.routes'

const app = express()

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use(compression())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  message: { error: 'Muitas tentativas, tente novamente mais tarde' },
})
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
})

// Static files (uploads)
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)))

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api', apiLimiter)
app.use('/api/users', usersRoutes)
app.use('/api/units', unitsRoutes)
app.use('/api/equipment', equipmentRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/attachments', attachmentsRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use(errorHandler)

export default app
