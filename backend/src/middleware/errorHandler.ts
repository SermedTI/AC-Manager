import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(`[Error] ${err.message}`)

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expirado' })
    return
  }

  res.status(500).json({ error: 'Erro interno do servidor' })
}
