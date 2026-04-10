import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import { env } from '../config/env'

export async function generateQRCode(
  equipmentId: string,
  tag: string
): Promise<string> {
  const url = `acmobile://equipment/${equipmentId}`
  const fileName = `${tag}.png`
  const filePath = path.resolve(env.UPLOAD_DIR, 'qrcodes', fileName)

  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  await QRCode.toFile(filePath, url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return `/uploads/qrcodes/${fileName}`
}

export async function getQRCodeBuffer(
  equipmentId: string
): Promise<Buffer> {
  const url = `acmobile://equipment/${equipmentId}`
  return QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    type: 'png',
  })
}
