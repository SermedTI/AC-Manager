import prisma from '../lib/prisma'
import {
  getFirebaseMessaging,
  hasFirebaseMessagingConfigured,
} from '../services/firebase.service'

const WORKER_INTERVAL_MS = 15000
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000
const MAX_BATCH_SIZE = 10

let isProcessing = false

export function startPushNotificationWorker() {
  if (!hasFirebaseMessagingConfigured()) {
    console.log(
      '[Push] Firebase Cloud Messaging desativado: configure as credenciais do service account'
    )
    return
  }

  console.log('[Push] Worker de notificacoes push ativado')
  void processPendingPushNotificationEvents()
  setInterval(() => {
    void processPendingPushNotificationEvents()
  }, WORKER_INTERVAL_MS)
}

async function processPendingPushNotificationEvents() {
  if (isProcessing) return

  isProcessing = true

  try {
    const claimBefore = new Date(Date.now() - CLAIM_TIMEOUT_MS)
    const events = await prisma.pushNotificationEvent.findMany({
      where: {
        deliveredAt: null,
        OR: [
          { processingStartedAt: null },
          { processingStartedAt: { lt: claimBefore } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_BATCH_SIZE,
    })

    for (const event of events) {
      await processEvent(event.id, claimBefore)
    }
  } catch (err) {
    console.error('[Push] Erro ao processar fila de notificacoes:', err)
  } finally {
    isProcessing = false
  }
}

async function processEvent(eventId: string, claimBefore: Date) {
  const claimedAt = new Date()
  const claim = await prisma.pushNotificationEvent.updateMany({
    where: {
      id: eventId,
      deliveredAt: null,
      OR: [
        { processingStartedAt: null },
        { processingStartedAt: { lt: claimBefore } },
      ],
    },
    data: {
      processingStartedAt: claimedAt,
      attemptCount: { increment: 1 },
      lastError: null,
    },
  })

  if (claim.count == 0) return

  const event = await prisma.pushNotificationEvent.findUnique({
    where: { id: eventId },
  })

  if (!event) return

  try {
    const tokenRows = await prisma.devicePushToken.findMany({
      where: {
        active: true,
        user: {
          active: true,
          role: 'TECHNICIAN',
          ...(event.targetUserId ? { id: event.targetUserId } : {}),
        },
      },
      select: {
        id: true,
        token: true,
      },
    })

    if (tokenRows.length === 0) {
      await markEventAsDelivered(eventId, 'Nenhum tecnico com token FCM ativo')
      return
    }

    const uniqueTokenRows = dedupeTokens(tokenRows)

    const response = await getFirebaseMessaging().sendEachForMulticast({
      tokens: uniqueTokenRows.map((item) => item.token),
      notification: {
        title: event.title,
        body: event.body,
      },
      data: {
        type: 'new_order',
        eventType: event.eventType,
        orderId: event.maintenanceRecordId ?? '',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'new_work_orders',
        },
      },
    })

    const invalidTokenIds: string[] = []
    const failureCodes: string[] = []

    response.responses.forEach((result, index) => {
      if (result.success) return

      const code = result.error?.code || 'messaging/unknown-error'
      failureCodes.push(code)

      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        invalidTokenIds.push(uniqueTokenRows[index].id)
      }
    })

    if (invalidTokenIds.length > 0) {
      await prisma.devicePushToken.updateMany({
        where: { id: { in: invalidTokenIds } },
        data: { active: false },
      })
    }

    const partialFailureMessage =
      failureCodes.length > 0
        ? `Falhas em ${failureCodes.length} envio(s): ${Array.from(new Set(failureCodes)).join(', ')}`
        : null

    await markEventAsDelivered(eventId, partialFailureMessage)
  } catch (err) {
    await prisma.pushNotificationEvent.update({
      where: { id: eventId },
      data: {
        processingStartedAt: null,
        lastError: err instanceof Error ? err.message : String(err),
      },
    })

    console.error(`[Push] Falha ao enviar evento ${eventId}:`, err)
  }
}

async function markEventAsDelivered(eventId: string, lastError: string | null) {
  await prisma.pushNotificationEvent.update({
    where: { id: eventId },
    data: {
      deliveredAt: new Date(),
      processingStartedAt: null,
      lastError,
    },
  })
}

function dedupeTokens(rows: Array<{ id: string; token: string }>) {
  const seen = new Set<string>()

  return rows.filter((row) => {
    if (seen.has(row.token)) return false
    seen.add(row.token)
    return true
  })
}
