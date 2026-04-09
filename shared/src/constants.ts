export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf'],
} as const

export const EQUIPMENT_TYPES = [
  'Split',
  'Window',
  'Cassette',
  'Floor Standing',
  'Portable',
  'Central',
  'VRF',
] as const
