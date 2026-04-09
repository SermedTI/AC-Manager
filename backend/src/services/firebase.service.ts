import fs from 'fs'
import path from 'path'
import {
  App,
  ServiceAccount,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app'
import { Messaging, getMessaging } from 'firebase-admin/messaging'
import { env } from '../config/env'

export function hasFirebaseMessagingConfigured() {
  return Boolean(
    env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
}

export function getFirebaseMessaging(): Messaging {
  return getMessaging(getFirebaseApp())
}

function getFirebaseApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return initializeApp({
      credential: cert(parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    })
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = resolveServiceAccountPath(
      env.FIREBASE_SERVICE_ACCOUNT_PATH
    )
    const serviceAccount = fs.readFileSync(
      serviceAccountPath,
      'utf8'
    )

    return initializeApp({
      credential: cert(parseServiceAccount(serviceAccount)),
    })
  }

  return initializeApp({
    credential: applicationDefault(),
  })
}

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw) as Record<string, string>
  return {
    projectId: parsed.project_id || parsed.projectId,
    clientEmail: parsed.client_email || parsed.clientEmail,
    privateKey: (parsed.private_key || parsed.privateKey || '').replace(
      /\\n/g,
      '\n'
    ),
  }
}

function resolveServiceAccountPath(configuredPath: string) {
  const directPath = path.resolve(process.cwd(), configuredPath)
  if (fs.existsSync(directPath)) return directPath

  const repoRelativePath = path.resolve(process.cwd(), '..', configuredPath)
  if (fs.existsSync(repoRelativePath)) return repoRelativePath

  return directPath
}
