import { MEDIA_CONFIG } from '../media/config';

export interface CachedMediaMeta {
  id: string;
  thumbnail: string;
  expiresAt: number;
  mediaUrl: string;
  estimatedBytes: number;
  touchedAt: number;
}

const cache = new Map<string, CachedMediaMeta>();

function pruneExpired() {
  const now = Date.now();
  for (const [id, item] of cache.entries()) {
    if (item.expiresAt <= now) cache.delete(id);
  }
}

function pruneBudget() {
  let total = Array.from(cache.values()).reduce((sum, item) => sum + item.estimatedBytes, 0);
  if (total <= MEDIA_CONFIG.maxActiveImageMemoryBytes) return;

  const oldest = Array.from(cache.values()).sort((a, b) => a.touchedAt - b.touchedAt);
  for (const item of oldest) {
    cache.delete(item.id);
    total -= item.estimatedBytes;
    if (total <= MEDIA_CONFIG.maxActiveImageMemoryBytes) break;
  }
}

export function rememberMedia(meta: Omit<CachedMediaMeta, 'touchedAt'>) {
  cache.set(meta.id, { ...meta, touchedAt: Date.now() });
  pruneExpired();
  pruneBudget();
}

export function clearMediaCache() {
  cache.clear();
}
