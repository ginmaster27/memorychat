import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { mkdirSync, promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { MEDIA_CONFIG } from './config';

export interface TemporaryMediaObject {
  mediaId: string;
  token: string;
  expiresAt: number;
  senderId: string;
  chatId: string;
  mimeType: string;
  extension: string;
  size: number;
  width: number;
  height: number;
  filePath: string;
  encryption: {
    iv: string;
    tag: string;
  };
}

export interface TemporaryObjectStorage {
  put(input: Omit<TemporaryMediaObject, 'mediaId' | 'token' | 'expiresAt' | 'filePath' | 'encryption'> & { buffer: Buffer }): Promise<TemporaryMediaObject>;
  get(mediaId: string): TemporaryMediaObject | null;
  read(mediaId: string): Promise<Buffer | null>;
  delete(mediaId: string): Promise<void>;
  clear(): Promise<void>;
}

const mediaDir = process.env.MEDIA_TEMP_DIR || path.join(tmpdir(), 'vibly-media');
const encryptionKey = createHash('sha256')
  .update(process.env.MEDIA_ENCRYPTION_KEY || `vibly-dev-${process.pid}`)
  .digest();

class LocalTemporaryObjectStorage implements TemporaryObjectStorage {
  private objects = new Map<string, TemporaryMediaObject>();
  private timers = new Map<string, NodeJS.Timeout>();

  constructor() {
    mkdirSync(mediaDir, { recursive: true });
  }

  async put(input: Omit<TemporaryMediaObject, 'mediaId' | 'token' | 'expiresAt' | 'filePath' | 'encryption'> & { buffer: Buffer }) {
    const mediaId = randomUUID();
    const token = randomUUID();
    const expiresAt = Date.now() + MEDIA_CONFIG.ttlMs;
    const filePath = path.join(mediaDir, `${mediaId}.${input.extension}`);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(input.buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    await fs.writeFile(filePath, encrypted, { flag: 'wx' });

    const object: TemporaryMediaObject = {
      mediaId,
      token,
      expiresAt,
      senderId: input.senderId,
      chatId: input.chatId,
      mimeType: input.mimeType,
      extension: input.extension,
      size: input.size,
      width: input.width,
      height: input.height,
      filePath,
      encryption: {
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      },
    };

    this.objects.set(mediaId, object);
    this.timers.set(mediaId, setTimeout(() => void this.delete(mediaId), MEDIA_CONFIG.ttlMs));
    return object;
  }

  get(mediaId: string) {
    const object = this.objects.get(mediaId);
    if (!object || object.expiresAt <= Date.now()) return null;
    return object;
  }

  async read(mediaId: string) {
    const object = this.get(mediaId);
    if (!object) return null;
    const encrypted = await fs.readFile(object.filePath);
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(object.encryption.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(object.encryption.tag, 'base64'));
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async delete(mediaId: string) {
    const object = this.objects.get(mediaId);
    const timer = this.timers.get(mediaId);
    if (timer) clearTimeout(timer);
    this.timers.delete(mediaId);
    this.objects.delete(mediaId);
    if (object) {
      await fs.unlink(object.filePath).catch(() => undefined);
    }
  }

  async clear() {
    await Promise.all(Array.from(this.objects.keys()).map((mediaId) => this.delete(mediaId)));
  }
}

export const temporaryMediaStorage: TemporaryObjectStorage = new LocalTemporaryObjectStorage();
