import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'
import fs from 'fs'
import path from 'path'
import { env } from '../config/env'

export async function uploadAttachment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Arquivo é obrigatório' })
      return
    }

    const { equipmentId, maintenanceRecordId } = req.body

    if (!equipmentId && !maintenanceRecordId) {
      res.status(400).json({
        error: 'Informe equipmentId ou maintenanceRecordId',
      })
      return
    }

    const attachment = await prisma.attachment.create({
      data: {
        fileName: req.file.originalname,
        fileUrl: `/uploads/attachments/${req.file.filename}`,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        equipmentId: equipmentId || null,
        maintenanceRecordId: maintenanceRecordId || null,
      },
    })

    res.status(201).json(attachment)
  } catch (err) {
    next(err)
  }
}

export async function deleteAttachment(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: req.params.id },
    })

    if (!attachment) {
      res.status(404).json({ error: 'Anexo não encontrado' })
      return
    }

    // Delete file from disk (validate path to prevent traversal)
    const relativePath = attachment.fileUrl.replace('/uploads/', '')
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      res.status(400).json({ error: 'Caminho de arquivo inválido' })
      return
    }
    const filePath = path.resolve(env.UPLOAD_DIR, relativePath)
    if (!filePath.startsWith(path.resolve(env.UPLOAD_DIR))) {
      res.status(400).json({ error: 'Caminho de arquivo inválido' })
      return
    }
    try {
      await fs.promises.unlink(filePath)
    } catch {
      // File may not exist on disk, continue with DB deletion
    }

    await prisma.attachment.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
