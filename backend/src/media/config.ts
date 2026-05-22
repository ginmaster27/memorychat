export const MEDIA_CONFIG = {
  maxUploadBytes: Number(process.env.MEDIA_MAX_UPLOAD_BYTES || 2 * 1024 * 1024),
  ttlMs: Number(process.env.MEDIA_TTL_MS || 5 * 60 * 1000),
  allowedMimeTypes: new Set(['image/jpeg', 'image/png', 'image/webp']),
  allowedExtensions: new Set(['jpg', 'jpeg', 'png', 'webp']),
  maxLongestSide: Number(process.env.MEDIA_MAX_LONGEST_SIDE || 1440),
  maxImagesPerChat: Number(process.env.MEDIA_MAX_IMAGES_PER_CHAT || 10),
  uploadRateWindowMs: Number(process.env.MEDIA_UPLOAD_RATE_WINDOW_MS || 60 * 1000),
  uploadRateLimit: Number(process.env.MEDIA_UPLOAD_RATE_LIMIT || 12),
};
