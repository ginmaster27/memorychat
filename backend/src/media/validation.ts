import { MEDIA_CONFIG } from './config';

export interface ImageInfo {
  mimeType: string;
  extension: string;
  width: number;
  height: number;
}

function readUInt24BE(buffer: Buffer, offset: number) {
  return (buffer[offset] << 16) + (buffer[offset + 1] << 8) + buffer[offset + 2];
}

function parsePng(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 24 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return {
    mimeType: 'image/png',
    extension: 'png',
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseJpeg(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        mimeType: 'image/jpeg',
        extension: 'jpg',
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebp(buffer: Buffer): ImageInfo | null {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  const type = buffer.toString('ascii', 12, 16);
  if (type === 'VP8X' && buffer.length >= 30) {
    return {
      mimeType: 'image/webp',
      extension: 'webp',
      width: 1 + readUInt24BE(buffer, 24),
      height: 1 + readUInt24BE(buffer, 27),
    };
  }
  if (type === 'VP8 ' && buffer.length >= 30) {
    return {
      mimeType: 'image/webp',
      extension: 'webp',
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return { mimeType: 'image/webp', extension: 'webp', width: 1, height: 1 };
}

export function validateImageUpload(buffer: Buffer, contentType = '', fileName = ''): ImageInfo {
  if (!buffer.length || buffer.length > MEDIA_CONFIG.maxUploadBytes) {
    throw new Error('Image must be 2 MB or smaller');
  }

  if (/svg|javascript|html|octet-stream/i.test(contentType) || /\.svg$/i.test(fileName)) {
    throw new Error('Unsupported image type');
  }

  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (extension && !MEDIA_CONFIG.allowedExtensions.has(extension)) {
    throw new Error('Unsupported image extension');
  }

  const info = parsePng(buffer) || parseJpeg(buffer) || parseWebp(buffer);
  if (!info || !MEDIA_CONFIG.allowedMimeTypes.has(info.mimeType)) {
    throw new Error('Corrupt or unsupported image');
  }

  if (contentType && contentType !== 'application/octet-stream' && contentType !== info.mimeType) {
    throw new Error('Image MIME type does not match file signature');
  }

  if (Math.max(info.width, info.height) > MEDIA_CONFIG.maxLongestSide) {
    throw new Error('Image dimensions are too large');
  }

  return info;
}
