import 'express'

// Express 5 @types define req.params[key] as string | string[].
// Override so all route params resolve to string (we only use :param patterns).
declare module 'express' {
  interface Request {
    params: Record<string, string>
  }
}
