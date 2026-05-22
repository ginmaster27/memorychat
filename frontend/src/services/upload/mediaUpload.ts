import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MEDIA_CONFIG } from '../media/config';
import { rememberMedia } from '../cache/mediaCache';
import { moderateMediaPlaceholder } from '../media/mediaModeration';
import { useMediaSettingsStore } from '../../store/mediaSettingsStore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface UploadedMedia {
  id: string;
  thumbnail: string;
  expiresAt: number;
  mediaUrl: string;
}

export interface MediaUploadContext {
  senderId: string;
  chatId: string;
  onProgress?: (stage: 'compressing' | 'uploading' | 'complete', progress: number) => void;
}

function extensionFromName(name?: string) {
  return name?.split('.').pop()?.toLowerCase() || '';
}

function assertAllowed(asset: ImagePicker.ImagePickerAsset) {
  const size = asset.fileSize || 0;
  const mimeType = asset.mimeType || '';
  const extension = extensionFromName(asset.fileName || asset.uri);
  if (size > MEDIA_CONFIG.maxUploadBytes) throw new Error('Images must be 2 MB or smaller.');
  if (mimeType && !MEDIA_CONFIG.allowedMimeTypes.includes(mimeType)) throw new Error('Unsupported image type.');
  if (extension && !MEDIA_CONFIG.allowedExtensions.includes(extension)) throw new Error('Unsupported image extension.');
  if (Math.max(asset.width || 0, asset.height || 0) > MEDIA_CONFIG.maxLongestSide * 2) {
    throw new Error('Image dimensions are too large.');
  }
}

function resizeTarget(width?: number, height?: number) {
  if (!width || !height) return null;
  const longest = Math.max(width, height);
  if (longest <= MEDIA_CONFIG.maxLongestSide) return { width, height };
  const scale = MEDIA_CONFIG.maxLongestSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function resizeAction(width?: number, height?: number) {
  const target = resizeTarget(width, height);
  if (!target || (target.width === width && target.height === height)) return [];
  return [{ resize: target }];
}

async function fileFromUri(uri: string) {
  const response = await fetch(uri);
  return response.blob();
}

async function compressImageForUpload(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  if (Platform.OS === 'web') {
    return compressImageOnWeb(asset);
  }

  const ImageManipulator = await import('expo-image-manipulator');
  const manipulated = await ImageManipulator.manipulateAsync(asset.uri, resizeAction(asset.width, asset.height), {
    compress: MEDIA_CONFIG.webpQuality,
    format: ImageManipulator.SaveFormat.WEBP,
    base64: false,
  });
  return fileFromUri(manipulated.uri);
}

function compressImageOnWeb(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const webGlobal = globalThis as typeof globalThis & {
      Image?: new () => { onload: (() => void) | null; onerror: (() => void) | null; src: string; width: number; height: number };
      document?: {
        createElement: (tag: 'canvas') => {
          width: number;
          height: number;
          getContext: (type: '2d') => { drawImage: (image: unknown, x: number, y: number, width: number, height: number) => void } | null;
          toBlob: (callback: (blob: Blob | null) => void, type: string, quality: number) => void;
        };
      };
    };
    if (!webGlobal.Image || !webGlobal.document) {
      reject(new Error('Image compression is unavailable in this browser.'));
      return;
    }
    const webDocument = webGlobal.document;
    const image = new webGlobal.Image();
    image.onload = () => {
      const target = resizeTarget(asset.width || image.width, asset.height || image.height) || {
        width: image.width,
        height: image.height,
      };
      const canvas = webDocument.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Unable to prepare image.'));
        return;
      }
      context.drawImage(image, 0, 0, target.width, target.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Unable to compress image.'));
            return;
          }
          resolve(blob);
        },
        'image/webp',
        MEDIA_CONFIG.webpQuality,
      );
    };
    image.onerror = () => reject(new Error('Unable to read image.'));
    image.src = asset.uri;
  });
}

function assertNetworkForUpload(blobSize: number) {
  if (Platform.OS !== 'web') return;
  const webGlobal = globalThis as typeof globalThis & { navigator?: { connection?: any } };
  const connection = webGlobal.navigator?.connection;
  if (useMediaSettingsStore.getState().uploadOnWifiOnly && connection?.type && connection.type !== 'wifi') {
    throw new Error('Image uploads are set to WiFi only.');
  }
  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
    throw new Error('Upload paused on poor connection. Try again on a stronger network.');
  }
  if (connection?.type === 'cellular' && blobSize > MEDIA_CONFIG.warnMobileBytes) {
    throw new Error('Image is over 1 MB on mobile data. Use WiFi or choose a smaller image.');
  }
}

export async function pickAndUploadImage(context: MediaUploadContext): Promise<UploadedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo permission is required to send images.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    quality: 1,
    base64: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  assertAllowed(asset);

  context.onProgress?.('compressing', 0.15);
  const blob = await compressImageForUpload(asset);
  context.onProgress?.('compressing', 0.75);

  if (blob.size > MEDIA_CONFIG.maxUploadBytes) throw new Error('Compressed image is still too large.');
  assertNetworkForUpload(blob.size);

  context.onProgress?.('uploading', 0.1);
  const uploadUrl = `${BACKEND_URL}/api/media/upload?senderId=${encodeURIComponent(context.senderId)}&chatId=${encodeURIComponent(context.chatId)}&fileName=image.webp`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'image/webp' },
    body: blob,
  });
  context.onProgress?.('uploading', 0.9);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Image upload failed.');
  }

  const data = await response.json();
  const media: UploadedMedia = {
    id: data.mediaId,
    thumbnail: data.thumbnail,
    expiresAt: data.expiresAt,
    mediaUrl: data.mediaUrl,
  };
  moderateMediaPlaceholder(media.id);
  rememberMedia({ ...media, estimatedBytes: blob.size });
  context.onProgress?.('complete', 1);
  return media;
}
