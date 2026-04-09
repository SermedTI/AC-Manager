import { env } from './config/env'
import app from './app'
import { startMaintenanceAlerts } from './jobs/maintenanceAlerts'
import { startPushNotificationWorker } from './jobs/pushNotifications'
import fs from 'fs'
import path from 'path'

// Ensure upload directories exist
const uploadDirs = [
  path.resolve(env.UPLOAD_DIR),
  path.resolve(env.UPLOAD_DIR, 'attachments'),
  path.resolve(env.UPLOAD_DIR, 'qrcodes'),
]
for (const dir of uploadDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

app.listen(env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${env.PORT}`)
  startMaintenanceAlerts()
  startPushNotificationWorker()
})
