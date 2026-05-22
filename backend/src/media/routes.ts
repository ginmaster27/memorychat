import { randomUUID } from 'crypto';
import { Router } from 'express';
import { MEDIA_CONFIG } from './config';
import { temporaryMediaStorage } from './storage';
import { validateImageUpload } from './validation';

const uploadWindows = new Map<string, number[]>();
const chatUploadCounts = new Map<string, { count: number; resetAt: number }>();

function getIp(req: any) {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (forwardedValue?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function assertUploadRate(ip: string) {
  const now = Date.now();
  const windowStart = now - MEDIA_CONFIG.uploadRateWindowMs;
  const current = (uploadWindows.get(ip) || []).filter((timestamp) => timestamp >= windowStart);
  if (current.length >= MEDIA_CONFIG.uploadRateLimit) throw new Error('Too many uploads. Try again shortly.');
  current.push(now);
  uploadWindows.set(ip, current);
}

function assertChatCount(chatId: string) {
  const now = Date.now();
  const current = chatUploadCounts.get(chatId);
  if (!current || current.resetAt <= now) {
    chatUploadCounts.set(chatId, { count: 1, resetAt: now + MEDIA_CONFIG.ttlMs });
    return;
  }
  if (current.count >= MEDIA_CONFIG.maxImagesPerChat) throw new Error('Image limit reached for this chat');
  current.count += 1;
}

export function createMediaRouter(baseUrl: string) {
  const router = Router();

  router.post('/upload', async (req, res) => {
    try {
      assertUploadRate(getIp(req));
      const senderId = String(req.query.senderId || '');
      const chatId = String(req.query.chatId || '');
      const fileName = String(req.query.fileName || 'image.webp');
      if (!senderId || !chatId) throw new Error('Missing media upload context');
      assertChatCount(chatId);

      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
      const info = validateImageUpload(buffer, req.headers['content-type'], fileName);
      const audit = { action: 'media_upload_validate', mediaId: randomUUID(), timestamp: Date.now(), result: 'passed' };

      const object = await temporaryMediaStorage.put({
        buffer,
        senderId,
        chatId,
        mimeType: info.mimeType,
        extension: info.extension,
        size: buffer.length,
        width: info.width,
        height: info.height,
      });

      res.json({
        mediaId: object.mediaId,
        expiresAt: object.expiresAt,
        mediaUrl: `${baseUrl}/api/media/${object.mediaId}?token=${object.token}`,
        senderId: object.senderId,
        chatId: object.chatId,
        thumbnail: `${baseUrl}/api/media/${object.mediaId}?token=${object.token}`,
        audit: { ...audit, mediaId: object.mediaId },
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Upload failed' });
    }
  });

  router.get('/:mediaId', async (req, res) => {
    const object = temporaryMediaStorage.get(req.params.mediaId);
    if (!object || req.query.token !== object.token) {
      res.status(404).end();
      return;
    }

    res.type(object.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    const body = await temporaryMediaStorage.read(req.params.mediaId);
    if (!body) {
      res.status(404).end();
      return;
    }
    res.send(body);
  });

  router.delete('/:mediaId', async (req, res) => {
    const object = temporaryMediaStorage.get(req.params.mediaId);
    if (!object || req.query.token !== object.token) {
      res.status(404).end();
      return;
    }
    await temporaryMediaStorage.delete(req.params.mediaId);
    res.status(204).end();
  });

  return router;
}
